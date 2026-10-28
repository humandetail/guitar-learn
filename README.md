# Guitar Learn

移动端优先的浏览器吉他学习与练习工作台。首次打开进入“学习”，14 节课程从整把琴的部位、持琴与调音开始，经过节拍、读谱、单音、爬格子与短旋律，再学习和弦伴奏、边弹边唱和旋律加低音的独奏入门。原有调音器、节拍器、和弦库与逐弦检测仍可独立使用。

每课包含图示、分步练习和自查清单，支持随时复习与继续学习。课程打开工具时选好相应和弦或节奏，点击“返回课程”回到原步骤。学习进度保存在当前浏览器，独立于练习记录；现有 JSON 记录备份不包含学习进度。课程完成表示用户完成自查，不代表自动验证姿势、手型或节奏。

认琴图可点选 11 个部位，识谱课区分 TAB 品位、和弦图手指编号与简谱音级。9 组固定练习提供逐音动作提示、拍数、可调速合成示范与同步高亮，覆盖休止、长音和同时拨两根弦。TAB 始终上 1 弦、下 6 弦，左手设置不会翻转谱面。离开步骤或切到后台会停止示范；旧版六课的完成记录与自查勾选继续保留。

学习目录提供「分级曲库」：4 首熟悉旋律、12 份编配，沿单音入门 → 和弦配唱 → 完整弹唱，以及旋律加低音 → 完整指弹两条路线练习。曲目包括《玛丽有只小羊羔》《小星星》《两只老虎》和《欢乐颂》主题；难度由具体编配决定，不对应考级。可按路线、阶段筛选，每份提供技巧分解、前置课与进阶自查。

曲谱支持全曲或两小节分段、逐音动作提示与调速合成示范。弹唱版含本项目原创中文练习词和单独的旋律跟唱谱；指弹版真实安排旋律、低音及填充音，支持半拍和各声部独立延音。旋律取自历史旧曲，吉他编配及中文练习词由本项目制作，不包含原唱录音。曲库只帮助看谱练习，不自动判定演奏达标。版本、准确范围与来源见[分级曲库来源说明](docs/verification/graded-repertoire-sources.md)。

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
pnpm exec playwright test tests/learning.spec.ts --output=/tmp/guitar-learning-check
pnpm exec playwright test tests/expanded-learning.spec.ts --output=/tmp/guitar-expanded-learning-check
pnpm exec playwright test tests/repertoire.spec.ts tests/graded-repertoire.spec.ts --output=/tmp/guitar-repertoire-check
pnpm exec playwright test tests/tuner.spec.ts --output=/tmp/guitar-tuner-check
pnpm exec playwright test tests/metronome.spec.ts --output=/tmp/guitar-metronome-check
pnpm exec playwright test tests/chords.spec.ts --output=/tmp/guitar-chords-check
pnpm exec playwright test tests/practice.spec.ts --output=/tmp/guitar-practice-check
pnpm test:audio
```

选择与修改范围对应的测试文件，不要求每次全部执行。浏览器测试使用已安装的 Google Chrome；需要单音的测试只替换麦克风边界，真实 Web Audio 与发布库仍参与，不能当作实机证据。各并行测试使用独立输出目录。

`test:audio` 是保留的库能力诊断：40 个固定样例中 10 个失败，预期退出码为 1。这不属于可忽略的通过项，必须在正式发布前按用户确认的方案处理。

- [软件交付与待验收项](docs/verification/software-progress.md)
- [待人工／实机验收清单（2026-10-28）](docs/verification/pending-acceptance.md)
- [零基础课程验证](docs/verification/beginner-learning.md)
- [分级曲库验证](docs/verification/graded-repertoire.md)
- [真实音频验收表](docs/verification/ticket-01-audio.md)
- [库级合成结果](docs/verification/ticket-01-synthetic.json)
- [已批准 tickets](.scratch/guitar-learn-mvp/issues/README.md)

## 技术约束

React + TypeScript + Vite、Tailwind 与本地 shadcn 风格 Button。音高检测保留 `@kretoffer/guitar-audio-kit@0.0.2`；应用管理音频生命周期、稳定窗口、目标频率和判断，不自行实现 FFT。标准调弦、无变调夹，无账号、后端或云同步。界面沿已选“六弦工作台”方向实现，正式视觉与真实设备验收待补齐。
