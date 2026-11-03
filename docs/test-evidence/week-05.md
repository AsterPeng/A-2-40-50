# 第 5 周失败处理与幂等可靠性证据

- 课程窗口：待确认。
- 实际执行日期：2026-11-03（Asia/Shanghai）。
- 环境：Windows PowerShell、Node.js v24.20.0、pnpm 11.25.0、Vitest 3.2.7。
- 需求：RQ-A-2-50；输入是匿名合成、已规范化的 `TrackPoint`。

| 检查         | 命令或方法                                                                                    | 摘要与结论                                                                                |
| ------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 修改前工作树 | `git status --short --branch`                                                                 | `main...origin/main`；已有未提交的第四周 Excel 周报修改和一份新设计说明书，均未被本周修改 |
| 测试先行     | `pnpm exec vitest run test/a5-client/http-a5-reliability.test.ts`                             | 首次运行 15 个测试中 13 个失败、2 个通过；失败集中于尚未实现的重试、超时、取消和脱敏记录  |
| 取消竞态复现 | `pnpm exec vitest run test/a5-client/http-a5-reliability.test.ts -t "does not start a fetch"` | 新增测试先失败，显示取消早于真正发送时仍被计为一次不确定尝试；修复后通过                  |
| 第五周专项   | `pnpm exec vitest run test/a5-client/http-a5-reliability.test.ts`                             | IT-C-50-03..06、12、13、15..19、29、32、33；含取消竞态与等待上限补充场景，全部通过        |
| 类型检查     | `pnpm typecheck`                                                                              | TypeScript strict 检查通过                                                                |
| 全量质量检查 | `pnpm check`                                                                                  | Prettier、ESLint、TypeScript 与 Vitest 通过；4 个测试文件共 31 个测试，其中第五周 17 个   |
| 源码构建     | `pnpm build`                                                                                  | TypeScript ESM 构建通过                                                                   |
| 提交前核对   | `git diff --check`、`git status --short`、`git diff --cached --name-only`                     | 检查空白差异、变更范围和暂存成果物；第四周 Excel 与新设计说明书不列入本周提交             |

## 代表性断言

- 400/409 均只尝试一次；409 不更换幂等键补写。429 的 `Retry-After: 2` 等待 2000 ms；规范 HTTP-date 按注入时钟计算；无效值回退退避，过长值受 `maxDelayMs` 限制。
- 503 和网络异常在上限内重试，达到上限即停止。每次重试使用完全相同的 JSON 请求体和 SHA-256 幂等键；长小数、尾零、指数及负零仍以原始字符串发送。
- 默认超时不重试且返回 `uncertain: true`；显式开启超时重试后仍受尝试次数上限约束。调用方取消进行中请求或退避等待时立即停止；发送前取消不会调用 `fetch`。
- 失败回调只含原因、尝试数、批次条数、未确认标志和可选 HTTP 状态；抛出的异常消息、外部响应正文、请求体及测量值未进入记录。

所有 HTTP 响应均由测试注入的 `fetch` 生成。本周未连接真实 A-5、未实现本机 HTTP Mock，也未检查数据库或持久化读回。正式地址、授权、schema、JSON 字符串测量值及真实幂等窗口仍待确认；HTTP 202 不构成真实落库验收。
