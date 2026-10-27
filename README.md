# A-2-40-50

需求：RQ-A-2-40 / RQ-A-2-50。

独立的航迹十进制精度保护与 A-5 写入客户端项目。范围和十周安排见根目录的 [项目简报](CURRENT_LINE_PROJECT_BRIEF.md)。

## 当前状态

第 1 周确认需求、输入约定和边界；第 2 周形成[精度 ADR](docs/adr/0001-decimal-text-boundary.md)、[写入 ADR](docs/adr/0002-a5-write-semantics.md)、[OpenAPI 草案](contracts/a5/openapi.yaml)、[客户端设计](docs/design/a5-client.md)、[Mock 设计](docs/design/mock-a5.md)和[逐场景测试计划](docs/requirements/test-cases.md)。第 3 周实现了[精度校验与 JSON 边界](src/precision/)，UT-C-40-01..04 已通过。第 4 周实现了[HTTP 客户端的正常写入与 202 响应校验](src/a5-client/)，10 个第四周测试场景已通过，结果见[第四周证据](docs/test-evidence/week-04.md)。重试、超时、取消与本机 Mock 仍按后续周次实施。

精度承诺从本项目收到的已规范化原始测量值文本开始，保留其有效数字和字符表示；不能恢复上游先前丢失的精度，也不代表测量准确度提高。正式 A-5 是否接受 JSON 字符串测量值未确认。若只接受 JSON 数字，必须先记录契约冲突并确认精度方案，不能静默转换或宣称端到端验收通过。HTTP 202 或本地 Mock 成功也不证明真实 A-5 落库。

## 工程检查

要求 Node.js 22+ 和 pnpm。安装依赖后运行 `pnpm check`；源代码变更后运行 `pnpm build`。`pnpm test` 运行 Vitest，测试文件缺失会导致失败。本地测试通过只说明已覆盖的代码行为符合本项目草案。

项目不抓取上游数据、不处理供应商授权或范围过滤、不做字段/单位/时间规范化与去重，也不直连 A-5 数据库。后续测试只使用匿名合成的已规范化 `TrackPoint`。
