# 待人工／实机验收清单

整理日期：2026-10-28。

现有 Ticket 01–14 的软件均已实现，状态仍为 `needs-info`，等待正式人工／实机验收。此前的自动化测试、截图与走查结果见[软件交付报告](software-progress.md)及各专项验证记录；本次提交不把待测项标成已验收。

## 原有 Tickets

每票链接包含原验收标准与人工操作步骤。下表用于后续逐项勾选，完整设备矩阵、重复收音测试和时序测量需另留时间。

| 验收 | Ticket | 主要测试内容 | 是否需要琴 |
| --- | --- | --- | --- |
| [ ] | [01 E2 调音与音频能力](../../.scratch/guitar-learn-mvp/issues/01-e2-audio-gate.md) | 手机 E2、六弦音域、高把位、响应速度；授权拒绝、断麦和后台恢复 | 是 |
| [ ] | [02 六弦调音与基准](../../.scratch/guitar-learn-mvp/issues/02-six-string-tuner.md) | 六根弦、音名和八度、偏高偏低、大偏差提示；430–450 Hz 设置与刷新恢复 | 收音部分需要 |
| [ ] | [03 内置和弦与参考音](../../.scratch/guitar-learn-mvp/issues/03-built-in-chords.md) | 校对十个指法，整和弦与逐弦试听；编号、镜像及偏好恢复 | 否，可先测 |
| [ ] | [04 基础节拍器](../../.scratch/guitar-learn-mvp/issues/04-basic-metronome.md) | 开始、改速、静音、重音、后台手动继续；实际发声时序 | 否，可先测 |
| [ ] | [05 拍号与细分](../../.scratch/guitar-learn-mvp/issues/05-meter-and-subdivisions.md) | 2／3／4 拍、四分／八分／十六分；下一小节统一切换、视听对应 | 否，可先测 |
| [ ] | [06 自定义和弦](../../.scratch/guitar-learn-mvp/issues/06-custom-chords.md) | 新增、复制、同名后缀、编辑、删除、刷新恢复、保存失败保留表单 | 否，可先测 |
| [ ] | [07 横按与高把位](../../.scratch/guitar-learn-mvp/issues/07-barre-and-high-frets.md) | 第 1–24 品、横按图、冲突校验、保存重开、镜像及目标参考音 | 编辑可先测 |
| [ ] | [08 和弦文件](../../.scratch/guitar-learn-mvp/issues/08-chord-files.md) | 导出再导入、同名处理、无效文件整份拒绝、写入失败不产生部分导入 | 否，可先测 |
| [ ] | [09 Am 检测与保存](../../.scratch/guitar-learn-mvp/issues/09-am-practice-round.md) | 等待、错音、重测、逐弦推进、基准锁定；保存一轮、中途退出不留部分记录 | 是 |
| [ ] | [10 任意和弦检测](../../.scratch/guitar-learn-mvp/issues/10-all-chord-practice.md) | Am／C 差异、自定义高把位、错八度、切目标；编辑后旧记录保持快照 | 是 |
| [ ] | [11 记录查看与清理](../../.scratch/guitar-learn-mvp/issues/11-practice-history.md) | 排序、详情、正确弦数；取消删除、单条删除、清空与空状态 | 可用已有／导入记录先测 |
| [ ] | [12 记录备份恢复](../../.scratch/guitar-learn-mvp/issues/12-record-files.md) | 导出恢复、重复去重、同 ID 冲突、未知版本、格式错误及写入失败 | 可用已有／导入记录先测 |
| [ ] | [13 未保存结果救回](../../.scratch/guitar-learn-mvp/issues/13-unsaved-result-recovery.md) | 写入失败后结果保留、导出本轮、清理后返回重试、不重复保存 | 完整检测链路需要 |
| [ ] | [14 音频切换与中断](../../.scratch/guitar-learn-mvp/issues/14-audio-transitions.md) | 检测时暂停 click／参考音，麦克风互斥；后台、断麦、重试与手动恢复 | 完整收音链路需要 |

## 新增教学与曲库的人工验收

这两项属于后续扩展，尚未分配原 Ticket 编号。

- [ ] **零基础 14 课**：从认琴、持琴、调音、节拍与识谱开始；实际照谱完成单音、单弦／换弦爬格子、短旋律、Em／Am、分解伴奏、弹唱与双声部入门。确认图文能看懂、手上动作能照做；工具预选与返回、自查、刷新继续正确。[已有软件验证](beginner-learning.md)。
- [ ] **五级分级曲库**：从 L1 开始试练四首旋律与不同级别编配，检查路线／阶段筛选、两小节分段、全曲、速度及播放停止；试唱原创中文练习词，核对半拍、旋律与伴奏配合；实际弹出旋律、低音、填充音和独立延音。[已有软件验证](graded-repertoire.md)及[来源与编配说明](graded-repertoire-sources.md)。

## 验收条件与已知待解决项

- 实际设备范围仍为 iPhone、Android、macOS、Windows 的当前稳定 Chrome；记录具体机型、系统和浏览器版本。手机收音需要设备信任的 HTTPS。
- 收音项目使用安静室内的钢弦／尼龙弦原声吉他。每项重复 10 次，至少 9 次须在拨弦后 1 秒内得到稳定正确结果；稳定条件是连续 300 毫秒音名、八度一致且波动不超过 10 音分。记录表见[真实音频验收表](ticket-01-audio.md)。
- 节拍器实际发声时序：30／80／240 BPM 各 60 秒，覆盖细分，累计偏差不超过 100 毫秒，并检查漏拍、连发及视听对应；预排调度不能代替实际发声测量。
- 已知指定音频库 40 项合成诊断中仍有 10 项失败，精度问题尚未解决；优先复核 01，再决定是否需要处理库能力缺口。详见[原始诊断](ticket-01-synthetic.json)。
- 真实设备上的小屏、横屏、触控、声音和实际持琴学习尚需人工确认；桌面浏览器模拟尺寸通过不能替代这些结论。

## 反馈模板

```text
Ticket／教学项：
设备、系统、Chrome 版本：
吉他／麦克风（收音项目填写）：
操作步骤：
预期与实际结果：
通过／未通过／待测：
截图、录屏或重复测试记录：
```
