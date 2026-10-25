# Guitar Learn

## Stack
- React + TypeScript + Vite + shadcn/ui + Tailwind
- 音频检测：@kretoffer/guitar-audio-kit（浏览器端，不依赖后端）
- 无后端，数据存 localStorage

## Commands
- 启动：pnpm dev
- 构建：pnpm build
- 测试：pnpm test
- Lint：pnpm lint

## Scope
MVP 只做四个模块：
1. 调音器（麦克风输入，显示音名和音分偏差）
2. 节拍器（BPM 可调，视觉闪烁 + click 音）
3. 和弦库（10 个开放和弦，指法图 + 参考音）
4. 和弦检测（目标指法逐弦判断是否按对）

## Don't
- 不要引入后端或数据库
- 不要做用户系统
- 不要做曲谱 / AI 对话 / 手型识别
- 不要自己实现 FFT，音频检测必须用现成库

## Done when
每个音频模块必须能在浏览器中手动验证：
- 调音器能识别 E2 标准音
- 和弦检测能区分 Am 和 C 的指法