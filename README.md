# 终身目标管理台

单文件离线可用的人生目标管理台（HTML/CSS/JS 全内联、零外链、零 emoji）。

- 线上地址：https://lifelong-goal-board.netlify.app
- 数据存储：浏览器 localStorage + 可选 Netlify Blobs 云同步（netlify/functions/sync.mjs）
- 自动部署：推送到 GitHub main 分支后，Netlify 自动构建部署（含函数）

## 本地开发
直接用浏览器打开 index.html 即可（离线可用）。

## 部署说明
仓库已连接到 Netlify（Build），每次 push 自动部署；函数由 Netlify Build 自动打包（package.json 声明 @netlify/blobs）。


> 自动部署验证：2026-08-13T06:58:11.403Z — GitHub → Netlify 构建链路已打通。
