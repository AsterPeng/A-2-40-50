# 第 2 周设计核对证据

- 课程窗口：2026-10-12 至 2026-10-18。
- 实际执行日期：2026-10-27（Asia/Shanghai）；不倒填课程窗口。
- 运行环境：Windows PowerShell、Node.js v24.20.0、pnpm 11.25.0。
- 需求：RQ-A-2-40、RQ-A-2-50。

| 检查             | 命令或方法                                                                                                                     | 摘要与结论                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 开始前工作树     | `git status --short --branch`、`git diff -- docs/requirements`                                                                 | 三份 RQ-A-2-40 相关文档已有未提交修改；完整保留其输入边界及 A5-Q11 解释后继续设计                            |
| OpenAPI 草案语法 | `pnpm exec prettier --write contracts/a5/openapi.yaml`、`pnpm check` 中的 `prettier --check .`                                 | YAML 能被 Prettier 解析并通过格式检查；这不是正式 A-5 契约认可或完整 OpenAPI 语义验证                        |
| 测试 ID          | 从 `docs/requirements/test-cases.md` 的表格 ID 列提取并去重                                                                    | 41 个计划 ID，41 个唯一；逐场景输入与断言见该文件，尚无实现                                                  |
| 工程检查         | `pnpm check`                                                                                                                   | Prettier、ESLint、TypeScript 类型检查通过；Vitest 明确显示无测试文件；不得写为功能测试通过                   |
| 源码构建         | `pnpm build`                                                                                                                   | 端口类型修改后构建通过；`dist/` 未纳入 Git                                                                   |
| Git 成果物       | `git diff --check`、`git diff --cached --name-only`、`git ls-tree -r --name-only HEAD`、`git ls-remote origin refs/heads/main` | 13 个本周文件已在提交 `f060872a69be560e39f26db7da482cf2a0156b21`；远端 `main` 曾核对为同一 SHA。只列实际文件 |

本周设计映射的主要测试 ID：UT-C-40-01..04、CT-I3-A5-01..04、IT-C-50-01..33 中[测试场景设计](../requirements/test-cases.md)列明的 33 个场景。ID 是未来自动测试的标识，不能当作已执行证据。CT-I3-A5-04 仅在正式 A-5 出现 JSON 数字契约冲突且取得授权后执行。

阻塞项：正式 A-5 地址、认证、请求/响应 schema、批次和字节上限、202/幂等语义、字符串测量值支持与精度读回均未确认。未访问真实服务，也未把 Mock 或 HTTP 202 视为落库证据。

本周设计提交：[f060872a69be560e39f26db7da482cf2a0156b21](https://github.com/AsterPeng/A-2-40-50/commit/f060872a69be560e39f26db7da482cf2a0156b21)。

2026-11-07 补报核对：`docs/weekly/项目周报-第2周.xlsx` 保留一张工作表、54 处合并单元格和项目状态下拉；总体进度为数值 `20%`。成果物栏的 14 条路径均存在，其中 13 条可在上述第二周设计提交中查到，新增 Excel 随补报提交。设计和测试日期仍按 2026-10-27 记录，不补造功能测试结果。

补报提交前再次运行 `pnpm check`，其 Prettier 阶段因工作树中已有未跟踪的 `A-5-10.20/`、`A-5-30.40.50/` 和 `tmp/` 共 18 个文件格式不符而停止；这些文件不属于第二周成果物，本次未改动。第二周两份 Markdown 的定向 Prettier 检查、当前代码的 `pnpm typecheck` 及 `pnpm test`（31/31）通过；后两项是 2026-11-07 的回归结果，不代表第二周当时有功能测试通过。
