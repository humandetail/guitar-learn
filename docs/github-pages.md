# 把网页版部署到 GitHub Pages

工作流：[`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)。推送到 `main` 后自动执行，也可以从 Actions 手动运行。只上传 Vite 生成的 `dist/`，不会把 iOS、微信小程序、测试或整个仓库目录当网站发布。

## 首次配置

1. 本项目已选择公开完整源码，目标仓库为 [humandetail/guitar-learn](https://github.com/humandetail/guitar-learn)。将项目完整源码和 `pnpm-lock.yaml` 提交、推送到它的 `main` 分支。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。这是一次性设置，不是选择 `gh-pages` 分支。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
3. 打开 **Actions → Deploy web to GitHub Pages → Run workflow**，选择 **main** 运行。首次推送若发生在 Pages 启用之前，按这一步重新运行即可。
4. 等待 `build` 和 `deploy` 都变绿，点击部署记录中的 `github-pages` 网站链接。仓库 Settings → Pages 也会显示网址。

后续正常提交并推送 `main` 就会自动更新。无需手动上传 `dist`、创建 `gh-pages` 分支，也不需要填写个人访问令牌；工作流使用 GitHub 提供的 `GITHUB_TOKEN` 和 Pages 的部署权限。

目前配置只允许 `main` 发布。若以后换发布分支，需要同时修改工作流的 `push.branches` 和 `build.if`，并检查 `github-pages` environment 的允许分支。

## 地址和资源路径

- 普通项目仓库通常是 `https://你的用户名.github.io/仓库名/`。
- 本仓库启用并完成部署后的默认网址为 `https://humandetail.github.io/guitar-learn/`。
- 用户／组织主页仓库或已经配置的自定义域名通常使用根路径 `/`。

工作流读取 `actions/configure-pages` 的 `base_path` 输出，传给 `vite build --base`，因此无需在 `vite.config.ts` 写死仓库名。本地 `pnpm dev` 仍使用根路径。更改自定义域名后重新运行一次工作流，让构建采用新的地址。[Vite 的 Pages 路径要求](https://vite.dev/guide/static-deploy#github-pages)、[Pages 路径输出定义](https://github.com/actions/configure-pages/blob/v5/action.yml)。

当前页面导航由应用状态控制，不依赖 `/lessons/...` 等浏览器路由，不需要 SPA 404 重写。如果以后引入 history 路由，再单独处理 Pages 刷新路径。

## 构建和验证

环境固定为 Node.js 24、pnpm 10.15.1；依赖按锁文件安装，启用 pnpm 缓存。依次运行 lint、TypeScript 检查和 Vite 构建。构建失败不会执行部署，也不会覆盖已发布的网站；并发发布排队，避免中途取消正在执行的部署。

本地可按普通项目路径检查生产构建：

2026-10-28 本地验证已通过：工作流 YAML 语法、lint、TypeScript 与生产构建；Chrome 在 `/guitar-learn/` 子路径打开学习首页、进入曲库和刷新均成功，CSS/JS 无 404 或运行时错误。线上状态以仓库 Actions 中的工作流结果为准，推送成功本身不代表 Pages 部署完成。

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm run build --base /guitar-learn/
pnpm exec vite preview --host 127.0.0.1 --port 4173 --base /guitar-learn/
```

打开 `http://127.0.0.1:4173/guitar-learn/`。这里的 `guitar-learn` 只是本地验证用的路径，远端会自动读取实际 Pages 路径。

部署检查不代表真实琴音精度验收通过：项目已有的合成音频诊断存在失败项，`test:audio` 仍作为单独诊断保留。Pages 提供的网站可以用于课程和练习试用；原有真机与声音验收继续按[待验收清单](verification/pending-acceptance.md)进行。

Pages 网站使用 HTTPS，浏览器收音仍需要用户主动点击并授予麦克风权限。学习数据保存在访问者自己的浏览器内；从本机网址换到 Pages 地址，不会自动迁移原来浏览器里的进度或记录。

## 常见问题

- **`Get Pages site failed` / 404**：确认 Settings → Pages 的 Source 已选 GitHub Actions，再重跑。工作流不通过额外管理员令牌替你启用 Pages。
- **部署权限或环境报错**：检查仓库允许 GitHub Actions 运行，且 `github-pages` environment 允许 `main`；不要删除 `pages: write` 和 `id-token: write`。[GitHub Pages 工作流要求](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
- **找不到工作流**：确认 `.github/workflows/deploy-pages.yml` 已推送到 GitHub，而非只留在本地。
- **静态资源 404**：确认浏览的是部署输出里的完整地址；变更 Pages 域名或路径后重新构建，不要直接上传旧 `dist`。
- **锁文件不一致**：在本地运行 `pnpm install`，检查并提交 `package.json` 与 `pnpm-lock.yaml` 的对应变更，再推送。
