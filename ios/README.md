# 六弦 iOS

首版为 **iPhone 原生音频验证版**，支持 iOS 17 及以上。SwiftUI 界面、AVAudioEngine 收音与节拍播放；JavaScriptCore 在本机执行现有 `@kretoffer/guitar-audio-kit@0.0.2` 检测器。没有网页容器、远程脚本、账号或服务器依赖。

当前流程：第 6 弦 E2 调音 → 停止 → 4/4 节拍跟练。课程和曲库尚未迁入。这遵循先完成 E2 真机验证、再扩展学习功能的顺序，不能把本版当成完整学习 App。

## 在 iPhone 安装

1. 安装完整 **Xcode**，版本须同时支持这台 Mac 的 macOS 和手机的 iOS，至少支持 iOS 17 SDK。检查 [Apple 的 Xcode 支持表](https://developer.apple.com/support/xcode/)。命令行工具 `CommandLineTools` 本身不包含 iOS SDK。首次打开 Xcode，完成组件安装，选择 iOS 平台支持。
2. 打开本目录的 **`GuitarLearn.xcodeproj`**。工程与识别资源已提交到源码目录，无需先安装 CocoaPods、Node 或其他原生依赖。
3. Xcode → Settings → Accounts，登录你自己的 Apple 账号。无需把密码、验证码或证书交给任何人。
4. 选中项目中的 `GuitarLearn` target → Signing & Capabilities：保留 Automatically manage signing，Team 选择你的 Personal Team；把 Bundle Identifier 改为你自己的唯一值，例如 `com.yourname.guitarlearn`。
5. 用数据线连接、解锁 iPhone，按提示信任这台电脑；如 Xcode 提示，前往 iPhone「设置 → 隐私与安全性 → 开发者模式」开启并重启。按系统提示信任开发者。
6. 顶部 scheme 选 `GuitarLearn`、运行设备选你的 iPhone，点击 ▶ Run。打开「调音 → 开始调音」，允许麦克风。

免费 Personal Team 适合自己装机测试，签名有效期有限，需要重新运行安装；TestFlight 和 App Store 是后续分发工作。[Apple 账号与 Personal Team 说明](https://developer.apple.com/help/account/basics/about-your-developer-account)。不要在这一步购买会员或创建发布证书来绕过未完成的音频验收。

也可选择 iPhone 模拟器检查布局和导航。模拟器不替代真琴、麦克风、来电、锁屏或实际发声时序测试。

## 本版行为

- **调音**：固定第 6 弦 E2、A4 = 440 Hz，4096 个 PCM 采样点；连续 300 毫秒音名／八度一致且波动不超过 10 音分才显示有效读数。±5 音分显示已调准；偏差超过 ±100 音分只提示核对琴弦。
- **节拍**：30–240 BPM，4/4 四分音符，第一拍重音。运行中先停止再改速。由 AVAudioPlayerNode 循环合成的一小节 PCM，界面计时器只读取播放位置。
- **生命周期**：切页、锁屏、后台、系统中断、耳机插拔会停止；返回不自动继续。调音和节拍互斥。停止后失效的权限回调和检测结果不恢复旧会话。
- **隐私**：不保存或上传声音，无分析 SDK；仅访问麦克风和用于计算间隔的系统时钟。工程带麦克风用途文案、隐私清单和识别库 MIT 许可。
- **现有限制**：不检测其余五弦，不支持基准音设置、拍号／细分／静音／下一小节改速、课程、曲库、学习记录或 Web 数据同步。BPM 只在本次运行内保留。

音高算法的已知误差没有因移植而解决。Web 的 40 项合成诊断中仍有 10 项失败；本版也不能承诺真实琴音达到 ±5 音分或 1 秒响应。详情见[验收清单](../docs/verification/ios-app.md)。

## 开发与检查

从仓库根目录运行，需 Node 24+；原生检查还需 macOS 的 Swift 命令行工具：

```sh
pnpm install
pnpm ios:bundle
pnpm ios:check
```

`ios:bundle` 从已安装依赖的 `src/PitchDetector.ts` 去除 TypeScript 类型，生成本地 JS 资源，记录版本和源码 SHA-256，并复制 MIT 许可。只允许 0.0.2，升级必须重新核对原库行为和真机精度。不要手改 `Resources/PitchDetector.js`；适配代码在 `Audio/detector-adapter.js`。

`ios:check` 检查生成物、Node 下的算法一致性／稳定窗口、Apple JavaScriptCore 桥接、PCM 分窗、节拍波形与生命周期。使用命令行工具时，只能检查 macOS SDK 可见的 Swift 代码；脚本明确输出 **PENDING**。有 iOS SDK 时还会构建无签名的模拟器 App。两者均不代表 iPhone 收音和声音已验收。

完整 Xcode 安装后，可单独构建：

```sh
xcodebuild -project ios/GuitarLearn.xcodeproj -scheme GuitarLearn \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/guitar-ios-build CODE_SIGNING_ALLOWED=NO build
```

如果命令行仍指向 CommandLineTools，可在 Xcode → Settings → Locations → Command Line Tools 中选择已安装的 Xcode，再运行检查。

## 来源与平台映射

| Web 来源 | iOS 承接 | 差异 |
| --- | --- | --- |
| `src/audio.ts` / 指定音频库 | `MicrophoneCapture`、`PitchBridge`、生成 JS | 原生 PCM 替换浏览器输入；保留算法和稳定规则，首版固定 E2 |
| `src/Tuner.tsx` | `Views/ContentView.swift` 的 TunerView | SwiftUI 重写，仅第 6 弦 |
| `src/audio-bus.ts` | `AppAudioModel` | 单一拥有者；切页彻底停止，无并行视觉节拍 |
| `src/metronome-clock.ts` | `NativeMetronome`、`ClickBar` | 音频采样时钟循环；首版只实现基础 4/4，不声称完整 Web 行为等价 |
| 课程、曲库、存储 | 后续批次 | 复用稳定 ID 和内容来源；当前工程无虚假入口 |

原生 API 依据：[麦克风授权](https://developer.apple.com/documentation/avfaudio/avaudioapplication/requestrecordpermission(completionhandler:))、[音频 Tap](https://developer.apple.com/documentation/avfaudio/avaudionode/installtap(onbus:buffersize:format:block:))、[播放器的采样时间线](https://developer.apple.com/documentation/avfaudio/avaudioplayernode)、[系统中断](https://developer.apple.com/documentation/avfaudio/avaudiosession/interruptionnotification)、[JavaScriptCore](https://developer.apple.com/documentation/javascriptcore/jscontext)、[隐私清单必需理由](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)。
