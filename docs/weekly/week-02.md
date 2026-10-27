# 第 2 周执行记录：C.2 方案与测试设计

- 课程窗口：2026-10-12 至 2026-10-18。
- 实际执行日期：2026-10-27（Asia/Shanghai）；不倒填。
- 需求：RQ-A-2-40、RQ-A-2-50。
- 结论：设计和测试场景已形成开发草案；功能实现、自动功能测试及真实 A-5 验收均未完成。

## 本周成果物

| 工作             | 实际文件                                                                                          | 结论                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 精度与验收边界   | `docs/adr/0001-decimal-text-boundary.md`、`docs/requirements/requirements.md`                     | 从本项目输入的已规范化原始文本起保真；不恢复上游精度或提高测量准确度 |
| 写入可靠性决策   | `docs/adr/0002-a5-write-semantics.md`、`docs/design/a5-client.md`、`src/ports/a5-track-client.ts` | 202、失败、取消、有限重试、未确认状态和稳定幂等键均有设计            |
| 接口和 Mock 草案 | `contracts/a5/openapi.yaml`、`docs/design/mock-a5.md`                                             | 测量值用 JSON 字符串；本地 Mock 不代表真实存储                       |
| 测试方向与追溯   | `docs/requirements/test-cases.md`、`docs/requirements/traceability.md`                            | 41 个唯一的计划测试 ID，需求、接口和场景可追溯；尚无功能测试文件     |
| 外部问题和入口   | `docs/requirements/a5-open-questions.md`、`README.md`                                             | A5-Q11 单列字符串测量值契约冲突；所有外部确认仍为待确认              |
| 执行证据         | `docs/test-evidence/week-02.md`、本文                                                             | 记录真实日期、文件、命令、结果和阻塞                                 |

## 检查和阻塞

命令、环境和结果见[第二周证据](../test-evidence/week-02.md)。`pnpm check` 与 `pnpm build` 通过，但 Vitest 无测试文件，不能视为 RQ-A-2-40/50 功能通过。正式 A-5 的地址、认证、契约和字符串测量值支持尚未确认；若正式接口只接受 JSON 数字，必须记录冲突、确认精度方案，不静默转换，也不宣称端到端验收通过。

本周未生成课程 Excel 周报；待用户提出周报任务时，按模板填报并只列已提交到 GitHub 的实际成果物。

实际设计提交：[f060872a69be560e39f26db7da482cf2a0156b21](https://github.com/AsterPeng/A-2-40-50/commit/f060872a69be560e39f26db7da482cf2a0156b21)，已核对 GitHub `main` 曾指向同一 SHA。本周未创建 PR；本文的证据链接更新随后单独提交。
