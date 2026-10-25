# Issue tracker: Local Markdown

2026-10-25 用户确认：本项目使用本地 Markdown 保存规格和任务。

- 每个功能使用 `.scratch/<feature-slug>/` 目录。
- 规格保存为 `.scratch/<feature-slug>/spec.md`。
- 每个实现任务独立保存为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 01 编号；用户批准颗粒度与依赖后才发布。
- 状态使用文档顶部的 `Status:` 字段；标签约定见 [triage-labels.md](triage-labels.md)。
- “发布到 issue tracker”即写入上述本地目录，不表示发布到 GitHub 或其他外部服务。
- `ready-for-agent` 表示规格准备就绪，不取代本项目“用户明确说开始执行后才开始实现”的前置条件。

当前 MVP 规格：[Guitar Learn MVP](../../.scratch/guitar-learn-mvp/spec.md)。

已批准并发布的 14 个 MVP tickets：[任务索引](../../.scratch/guitar-learn-mvp/issues/README.md)。发布不代表开始实现。
