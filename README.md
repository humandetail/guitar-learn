# Guitar Learn

移动端优先的浏览器吉他练习工作台，提供调音、节拍器、和弦库与逐弦检测，以及本地设置、练习记录和独立文件备份。

**当前为可试用的软件实现，真实琴音精度、设备兼容与发声时序尚未通过正式验收。** 指定音频库的已知误差未隐藏，没有琴也可先使用和弦库、合成参考音、节拍器及文件功能。

## 运行

需要 Node.js 24+ 和 pnpm 10+。

```sh
pnpm install
pnpm dev
```

本机 Chrome 打开 http://localhost:5173/ 。麦克风仅在主动启动后申请，音频只在当前浏览器处理，不录音、不上传。数据保存在 localStorage，换浏览器或清理网站数据后不能自动恢复，建议定期备份。手机收音需要设备信任的 HTTPS，普通 HTTP 局域网地址不能用于手机麦克风验收。

## 定向验证

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright test tests/tuner.spec.ts --output=/tmp/guitar-tuner-check
pnpm exec playwright test tests/metronome.spec.ts --output=/tmp/guitar-metronome-check
pnpm exec playwright test tests/chords.spec.ts --output=/tmp/guitar-chords-check
pnpm exec playwright test tests/practice.spec.ts --output=/tmp/guitar-practice-check
pnpm test:audio
```

选择与修改范围对应的测试文件，不要求每次全部执行。浏览器测试使用已安装的 Google Chrome；需要单音的测试只替换麦克风边界，真实 Web Audio 与发布库仍参与，不能当作实机证据。各并行测试使用独立输出目录。

`test:audio` 是保留的库能力诊断：40 个固定样例中 10 个失败，预期退出码为 1。这不属于可忽略的通过项，必须在正式发布前按用户确认的方案处理。

- [软件交付与待验收项](docs/verification/software-progress.md)
- [真实音频验收表](docs/verification/ticket-01-audio.md)
- [库级合成结果](docs/verification/ticket-01-synthetic.json)
- [已批准 tickets](.scratch/guitar-learn-mvp/issues/README.md)

## 技术约束

React + TypeScript + Vite、Tailwind 与本地 shadcn 风格 Button。音高检测保留 `@kretoffer/guitar-audio-kit@0.0.2`；应用管理音频生命周期、稳定窗口、目标频率和判断，不自行实现 FFT。标准调弦、无变调夹，无账号、后端或云同步。界面沿已选“六弦工作台”方向实现，正式视觉与真实设备验收待补齐。
