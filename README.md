# A-2-40-50

需求：RQ-A-2-40 / RQ-A-2-50。

独立的航迹十进制精度保护与 A-5 写入客户端项目。范围和十周安排见根目录的 [项目简报](CURRENT_LINE_PROJECT_BRIEF.md)。

## 当前状态

第 1 周确认需求、输入约定和边界；第 2 周形成[精度 ADR](docs/adr/0001-decimal-text-boundary.md)、[写入 ADR](docs/adr/0002-a5-write-semantics.md)、[OpenAPI 草案](contracts/a5/openapi.yaml)、[客户端设计](docs/design/a5-client.md)、[Mock 设计](docs/design/mock-a5.md)和[逐场景测试计划](docs/requirements/test-cases.md)。`src/domain` 与 `src/ports` 仍是待实现时复核的类型草案；精度校验、HTTP 客户端和 Mock 尚未实现。测试 ID 已在[追踪矩阵](docs/requirements/traceability.md)中规划，功能测试尚未执行。

精度承诺从本项目收到的已规范化原始测量值文本开始，保留其有效数字和字符表示；不能恢复上游先前丢失的精度，也不代表测量准确度提高。正式 A-5 是否接受 JSON 字符串测量值未确认。若只接受 JSON 数字，必须先记录契约冲突并确认精度方案，不能静默转换或宣称端到端验收通过。HTTP 202 或本地 Mock 成功也不证明真实 A-5 落库。

## 工程检查

要求 Node.js 22+ 和 pnpm。安装依赖后运行 `pnpm check`；源代码变更后运行 `pnpm build`。当前 `test` 命令允许无测试通过，仅用于设计阶段工程检查；不能把该结果作为需求验收。

项目不抓取上游数据、不处理供应商授权或范围过滤、不做字段/单位/时间规范化与去重，也不直连 A-5 数据库。后续测试只使用匿名合成的已规范化 `TrackPoint`。
