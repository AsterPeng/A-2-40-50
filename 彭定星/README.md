# 彭定星：A-2-40 / A-2-50 每周成果物

本目录按 `deliverables/`、`docs/`、`src/` 三类组织，第1至第5周均使用 `week-01` 至 `week-05` 区分。

| 周次 | 交付物与原文映射 | 文档与执行记录 | 可复现源码工程 | 历史源码基线 |
| --- | --- | --- | --- | --- |
| 第1周 | [交付清单](deliverables/week-01/交付清单.md) · [Excel周报](deliverables/week-01/项目周报-第1周.xlsx) | [执行记录](docs/week-01/week-01-execute.md) · [测试证据](docs/week-01/week-01.md) · [项目状态](docs/week-01/project-status.md) | [工程目录](src/week-01) | `06d83d3` |
| 第2周 | [交付清单](deliverables/week-02/交付清单.md) · [Excel周报](deliverables/week-02/项目周报-第2周.xlsx) | [执行记录](docs/week-02/week-02-execute.md) · [测试证据](docs/week-02/week-02.md) · [项目状态](docs/week-02/project-status.md) | [工程目录](src/week-02) | `b4bbf2f` |
| 第3周 | [交付清单](deliverables/week-03/交付清单.md) · [Excel周报](deliverables/week-03/项目周报-第3周.xlsx) | [执行记录](docs/week-03/week-03-execute.md) · [测试证据](docs/week-03/week-03.md) · [项目状态](docs/week-03/project-status.md) | [工程目录](src/week-03) | `34fe0ce` |
| 第4周 | [交付清单](deliverables/week-04/交付清单.md) · [Excel周报](deliverables/week-04/项目周报-第4周.xlsx) | [执行记录](docs/week-04/week-04-execute.md) · [测试证据](docs/week-04/week-04.md) · [项目状态](docs/week-04/project-status.md) | [工程目录](src/week-04) | `939fbe2` |
| 第5周 | [交付清单](deliverables/week-05/交付清单.md) · [Excel周报](deliverables/week-05/项目周报-第5周.xlsx) | [执行记录](docs/week-05/week-05-execute.md) · [测试证据](docs/week-05/week-05.md) · [项目状态](docs/week-05/project-status.md) | [工程目录](src/week-05) | `5c8eeb7` |

## 版本与复现

每周源码取该周的历史提交快照，包含当时必要的类型、实现、测试、锁文件与配置。较早周次不会因本次归档而获得后续周次的功能。设计、需求和接口契约也采用对应历史版本；执行记录与 Excel 采用当前本地文件。

五份 Excel 以用户截至2026-11-07提供的本地修改版本为基础，交付版已将成果物引用同步为个人目录下的新路径，日期与进度保持不变。每周交付清单逐项保留整理前本地 Excel D7:D10 的成果物路径，并映射到本次仓库内的实际位置。

进入相应 `src/week-XX/` 后运行 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm build`。Node.js 基线为22或更高。

第1、2周没有功能测试，历史脚本中的 `--passWithNoTests` 只用于骨架检查。第3、4、5周分别具有4、14、31个本地测试；这些测试不代表真实 A-5 接口、存储或读回验收。

## 后续命名约定

- 周次使用两位数字：`week-06`、`week-07`，后续依次增加。
- 执行记录固定命名为 `week-XX-execute.md`，放在 `docs/week-XX/`。
- 测试证据命名为 `week-XX.md`，与执行记录区分。
- Excel 周报与交付清单放在 `deliverables/week-XX/`；可运行工程放在 `src/week-XX/`。
- 提交信息包含功能项编号 A-2-40 或 A-2-50，直接提交 main。

仓库不包含 node_modules、编译产物、虚拟环境、缓存或环境密钥。
