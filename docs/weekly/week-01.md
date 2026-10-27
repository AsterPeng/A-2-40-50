# 第 1 周执行记录：C.1 需求与范围确认

- 课程窗口：2026-09-22 至 2026-09-28。
- 实际执行日期：2026-10-27（Asia/Shanghai）；周计划未按原课程窗口完成，不倒填。
- 需求号：RQ-A-2-40、RQ-A-2-50。
- 当前结论：需求、边界和测试方向材料已建立；功能实现与真实 A-5 验收未完成，GitHub 推送待核实。

## 本周成果物

| 工作               | 仓库中的实际成果物                                                                                                                                                       | 状态                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 项目入口与范围     | `CURRENT_LINE_PROJECT_BRIEF.md`、`README.md`、`docs/requirements/requirements.md`                                                                                        | 已建立                                |
| 输入约定           | `docs/requirements/input-contract.md`、`src/domain/track.ts`                                                                                                             | 草案，待第 2 周复核                   |
| A-5 边界及未决问题 | `docs/requirements/a5-open-questions.md`、`src/ports/a5-track-client.ts`                                                                                                 | 草案，未取得正式契约                  |
| 验收标准与测试方向 | `docs/requirements/traceability.md`                                                                                                                                      | 已规划测试 ID，尚未实现功能测试       |
| 工程骨架           | `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`tsconfig.build.json`、`eslint.config.js`、`.prettierrc.json`、`.prettierignore`、`.gitignore` | 可运行质量检查和构建                  |
| 周内证据           | `docs/test-evidence/week-01.md`、`docs/weekly/项目周报-第1周.xlsx`、本文                                                                                                 | 已记录检查与阻塞；XLSX 按课程模板填写 |

## 测试与命令

计划测试 ID：UT-C-40-01..03、IT-C-50-01..15、CT-I3-A5-01..03；详细映射见追踪矩阵。本周不把规划 ID 写成已通过测试。实际执行的 `pnpm check` 和 `pnpm build` 均通过，但 Vitest 没有测试文件；命令、环境、摘要与结论见 `docs/test-evidence/week-01.md`。

## 阻塞与待确认

- 正式 A-5 地址、认证、schema、批次限制、202 与幂等语义及读回证据待确认；不访问真实 A-5。
- GitHub 对应仓库为 `https://github.com/AsterPeng/A-2-40-50`；已确认公开并抓取原有 `main` 初始提交，待完成推送和远端文件核对后才可声明 GitHub 交付。
- 课程窗口已过，按真实日期记录执行。
- 简报中 `RQ-A-1-40/50` 与本项目指定的 `RQ-A-2-40/50` 不一致，按本项目编号记录并保留原简报。

实际本地 commit：`652ef0f`（第一周需求、工程骨架与证据）；XLSX 周报将随下一提交纳入。GitHub 链接待推送成功并核对远端后记录；不预先编造。
