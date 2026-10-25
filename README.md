# Guitar Learn

移动端优先的浏览器吉他练习工作台。当前仅落地 Ticket 01 的 E2 调音验证页面；**音频能力门槛尚未通过，02–14 未实现**。

## 运行

需要 Node.js 24+ 和 pnpm 10+。

```sh
pnpm install
pnpm dev
```

在本机打开 http://localhost:5173 。主动点击“开始调音”后才申请麦克风；当前目标固定为第 6 弦 E2、A4 = 440 Hz，只检测 60–110 Hz 区域。其他弦仅作标准调弦位置参照，暂不可选择。音频留在当前浏览器，不录音、不上传。

手机访问需要设备信任的 HTTPS；开发服务器显示的普通 HTTP 局域网 URL 无法用于手机麦克风验收。未配置公网托管或证书，不能将本机 localhost 视为手机可访问入口。

## 定向验证

```sh
pnpm typecheck
pnpm build
pnpm exec playwright test tests/tuner.spec.ts
pnpm test:audio
```

浏览器测试使用已安装的 Google Chrome，仅替换麦克风输入边界，覆盖真实 Web Audio 和发布库的检测链路。五个用例验证主动授权、权限失败重试、合成 E2、静音清除、取消后迟到输入释放、断麦和后台通知；合成输入及模拟生命周期不替代真实设备验收。

`test:audio` 是库能力诊断，不是通过的回归测试：40 个合成单帧样例中 10 个失败，当前预期退出码为 1，完整结果写入报告。这一失败必须保留，不通过跳过断言掩盖。

- [执行与阻塞报告](docs/verification/ticket-01-status.md)
- [真实音频验收表](docs/verification/ticket-01-audio.md)
- [库级合成结果](docs/verification/ticket-01-synthetic.json)
- [14 个已批准 tickets](.scratch/guitar-learn-mvp/issues/README.md)

## 约束

React + TypeScript + Vite、Tailwind 与本地 shadcn 风格 Button；频率检测使用 `@kretoffer/guitar-audio-kit@0.0.2`。应用管理麦克风生命周期、稳定窗口和目标换算，不自行实现 FFT。界面沿已选“六弦工作台”方向实现最小验证页，尚非完整 MVP 或正式视觉验收结果。
