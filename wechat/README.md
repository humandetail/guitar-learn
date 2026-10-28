# 六弦 · 微信小程序

可以导入微信开发者工具的原生小程序工程：WXML、WXSS、JavaScript，无 WebView、账号、服务器或运行时 npm 依赖。课程、曲谱和指法随包提供，运行时无需联网获取内容。

## 已实现

- **14 节零基础课程**：从认琴、持琴与调弦说明，到节拍、识谱、单音、单弦／换弦爬格子，再到和弦、弹唱与指弹入门。认琴图可点选 11 个部位。
- **继续学习与自查**：保留课程步骤、已勾选项目和已完成课程；保存失败保留内存中的操作并提供重试，损坏数据不自动覆盖。
- **9 组短练习、5 级曲库、12 份编配**：单音、弹唱、指弹路线筛选；默认两小节，可切换全曲；TAB 逐列动作、半拍读法、调速合成示范、播放高亮、旋律／低音／填充音的独立延音。
- **弹唱模式**：伴奏谱与跟唱旋律分开，提供原有项目的原创中文练习词、和弦指法、前置课程和进阶自查提示。
- **练习工具**：10 个基础和弦及参考音、六弦空弦参考音；30–240 BPM 节拍器，2／3／4 拍和每拍 1／2／4 下细分。
- **声音生命周期**：全局单一播放拥有者，切页、切换练习、后台／锁屏或 WebAudio 中断后停止，不自动恢复。声音由音频时钟调度；节拍器循环一小节合成 PCM，UI 定时器只读播放位置。

本版不收音检测，也不判断弹奏是否正确。调弦课请配合独立调音器；参考音只帮助熟悉音高。原识别库的精度问题尚未解决，不因制作小程序而更换算法或放宽验收。

## 如何在你的 iPhone 上试

1. 在 Mac 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，用你的微信扫码登录。
2. 选择「导入项目」，目录选择仓库里的 **`wechat`**（包含 `project.config.json`），不要选择整个仓库或 `ios` 目录。
3. 配置中的 `touristappid` 是游客导入占位。要扫码预览或真机调试，请在工具中选择可用测试号，或填写你自己小程序的 AppID；登录微信账号需有相应开发权限。游客模式不能作为已具备真机预览权限的证明。
4. 选择普通小程序、JavaScript，不启用云开发。不需要「构建 npm」。选择当前稳定基础库；播放 API 至少要求基础库 **2.19.0**，建议手机微信也更新到近期稳定版。
5. 点击「编译」，检查「学吉他」「分级曲库」「练习工具」。用「预览」生成二维码，在你的 iPhone 微信中扫码。第一次进入不会自动发声；点击示范或节拍的播放按钮。

**这条测试路径不需要 Xcode 或 Apple 开发者会员。** 目前本机只有微信客户端，未找到微信开发者工具，尚未生成预览二维码，也未完成模拟器和 iPhone 微信验收。教程、构建配置不等于真机已可运行；具体测试记录见 [微信验收清单](../docs/verification/wechat-app.md)。

项目不包含 AppSecret 或上传私钥，不需要把这些密钥发给助手。正式上传、隐私声明与发布审核在真机测试后另行处理。

## 内容更新与检查

交付目录已包含生成好的 `miniprogram/data/content.js`，首次导入无需先运行 Node。以后修改公共课程或曲谱时，从仓库根目录执行：

```sh
pnpm wechat:data
pnpm wechat:check
```

需要 Node.js 24+ 和已安装的仓库依赖。生成脚本读取已有 `src/lessons.ts`、`exercises.ts`、`graded-repertoire.ts`、`repertoire-types.ts`、`chords.ts`、`guitar-parts.ts`；只打包数据，不复制浏览器 API 或 React 组件。不要直接修改生成文件。

`wechat:check` 运行内容一致性、存储异常、课程和曲谱页面逻辑、音频边界及工程引用检查。声音 API 被替身模拟，不会操作真实麦克风或扬声器。

若已安装可执行的微信 `wcc`、`wcsc`，还可进行独立模板语法检查：

```sh
WECHAT_COMPILER_DIR=/path/to/compiler-directory pnpm wechat:templates
```

本次使用 `wechat-miniprogram` 发布的 `miniprogram-compiler@0.2.3` 完成此检查，它是旧版独立编译器；不能代替当前微信开发者工具的完整构建和基础库运行。编译器只是本机检查工具，没有打入小程序包。

## 与 Web / iOS 的边界

| 领域 | 小程序承接 |
| --- | --- |
| 课程、曲谱、指法、部位文字 | 复用现有数据、稳定 ID 与来源；只有部位数组抽出到公共文件，Web 交互不改 |
| React 页面与图形 | 原生 WXML 页面、自定义组件；认琴图用微信 Canvas，指法与 TAB 用原生视图 |
| 本地进度 | `wx.getStorageSync` / `wx.setStorageSync`；独立命名空间，不读取 Web localStorage 或 iOS 数据 |
| 示例演奏 | `wx.createWebAudioContext`；保留声部延音、同弦重新起音、休止和分段结束裁切 |
| 节拍器 | 采样时钟循环；修改参数先停止，再手动开始，不提供 Web 的下一小节改速或静音模式 |
| 调音与逐弦检测 | 暂不移植；工具页和课程入口明确改为参考音与人工自查 |
| 自定义和弦、记录、文件备份 | 后续扩展；本次只做内置和弦和学习进度，没有同步或导入按钮 |

五级曲谱的主编配与跟唱旋律已迁入；L1 历史曲谱的额外旧版基础伴奏切换未迁入，可使用曲库 L2 的专门弹唱编配。谱面始终上 1 弦、下 6 弦，不提供左手镜像或基准音设置。进度不自动跨设备同步，清除小程序数据会丢失进度。

## 平台依据

微信文档页面在本次环境无法直接打开，接口签名及说明通过[微信官方 API 类型定义](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.api.d.ts)核对，包括 `createWebAudioContext`、`createBuffer`、`createBufferSource`、`createOscillator`、`createGain`、`resume`、`close` 和 Canvas。特别遵守 `close()` 后不再访问 context 状态的限制。

曲谱来源与原创中文练习词说明见原有 [分级曲库来源](../docs/verification/graded-repertoire-sources.md)；每份小程序曲谱也提供来源说明及复制链接入口。
