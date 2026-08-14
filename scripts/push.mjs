import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO = 'cissy223/lifelong-goal-board';
const BRANCH = 'main';
const GH = 'https://api.github.com/repos/' + REPO;

// 需要发布的文件白名单（node_modules / 临时文件 / 密钥文件不发布）
const FILES = [
  '.gitignore',
  'README.md',
  '_headers',
  'index.html',
  'netlify.toml',
  'package.json',
  'netlify/functions/sync.mjs',
  'scripts/deploy.mjs',
  'scripts/_fetch-blobs.mjs',
  'scripts/push.mjs',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon-512.png',
  'icons/icon-192.png',
  'icons/icon-180.png',
];

function token() {
  const arg = process.argv.find(a => a.startsWith('--token='));
  if (arg) return arg.slice(8);
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const f = path.join(ROOT, 'secrets.env');
    if (fs.existsSync(f)) {
      const m = fs.readFileSync(f, 'utf8').match(/^\s*GITHUB_TOKEN\s*=\s*(\S+)\s*$/m);
      if (m) return m[1];
    }
  } catch {}
  return '';
}

async function api(p, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
  try {
  const r = await fetch(GH + p, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + token(),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lifelong-goal-board-push',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const t = await r.text();
  let d = null;
  try { d = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error((opts.method || 'GET') + ' ' + p + ' -> ' + r.status + ' ' + (t || '').slice(0, 300));
  return d;
  } catch (e) { lastErr = e; await new Promise(res => setTimeout(res, 1500 * (attempt + 1))); }
  }
  throw lastErr;
}

const files = [];
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) {
    const isBin = /\.(png|jpg|jpeg|gif|ico|webp)$/i.test(rel);
    files.push({ rel, encoding: isBin ? 'base64' : 'utf-8', content: isBin ? fs.readFileSync(p).toString('base64') : fs.readFileSync(p, 'utf8') });
  }
}

const head = await api('/git/ref/heads/' + BRANCH);
const headSha = head.object.sha;
const headCommit = await api('/git/commits/' + headSha);
const baseTree = headCommit.tree.sha;

// 逐个上传内容有变化的文件
const treeItems = [];
let changed = 0;
for (const f of files) {
  const blob = await api('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: f.content, encoding: f.encoding }),
  });
  const item = { path: f.rel, mode: '100644', type: 'blob', sha: blob.sha };
  treeItems.push(item);
  changed++;
}

const tree = await api('/git/trees', {
  method: 'POST',
  body: JSON.stringify({ base_tree: baseTree, tree: treeItems }),
});

const msg = process.argv.find(a => a.startsWith('--message='))?.slice(10)
  || ('update: ' + new Date().toLocaleString('zh-CN', { hour12: false }));
const commit = await api('/git/commits', {
  method: 'POST',
  body: JSON.stringify({ message: msg, tree: tree.sha, parents: [headSha] }),
});

await api('/git/refs/heads/' + BRANCH, {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha, force: true }),
});

console.log('OK 已推送到 https://github.com/' + REPO);
console.log('commit: ' + commit.sha.slice(0, 12) + '  files: ' + changed + '  msg: ' + msg);
console.log('Netlify 正在自动构建，约 1 分钟后生效：https://lifelong-goal-board.netlify.app');