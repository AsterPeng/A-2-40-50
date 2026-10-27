# 第 3 周精度专项证据

- 课程窗口：2026-10-19 至 2026-10-25。
- 实际执行日期：2026-10-27（Asia/Shanghai）；不倒填。
- 环境：Windows PowerShell、Node.js v24.20.0、pnpm 11.25.0、Vitest 3.2.7。
- 需求：RQ-A-2-40；测试 ID：UT-C-40-01..04。

| 检查           | 命令或方法                                                     | 摘要与结论                                                                                             |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 开始前工作树   | `git status --short --branch`                                  | `main...origin/main`，无未提交文件                                                                     |
| 测试先行       | 先建立 `test/precision/*.test.ts`，再实现 `src/precision/**`   | 四个 ID 的输入和断言先落地；首次 `pnpm test` 因受限进程环境的 `spawn EPERM` 未执行断言，不视为测试结果 |
| 缺陷复现与修复 | `pnpm exec vitest run test/precision/track-batch-json.test.ts` | 稀疏 `tracks` 数组新增断言先失败；改为逐项检查并拒绝空位后，同一测试通过                               |
| 精度与批次测试 | `pnpm test`                                                    | 2 个测试文件、4 个测试均通过；UT-C-40-01..04 各有一个实际测试场景                                      |
| 工程质量       | `pnpm check`                                                   | Prettier、ESLint、TypeScript 与 Vitest 全部通过                                                        |
| 源码构建       | `pnpm build`                                                   | TypeScript 构建通过；`dist/` 未纳入成果物                                                              |
| 提交前核对     | `git status --short --branch`、`git diff --check`              | 变更仅在本周代码、测试和文档内；差异空白检查通过，Git 提示的 CRLF 转换警告不影响检查结论               |

未决：正式 A-5 地址、认证、正式 JSON 测量值类型、持久化及读回契约未确认。以上测试仅限本地代码，不作为真实 A-5 落库或端到端精度验收证据。
