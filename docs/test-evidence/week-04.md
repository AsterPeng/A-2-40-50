# 第 4 周客户端正常/异常响应证据

- 课程窗口：待确认。
- 实际执行日期：2026-10-27（Asia/Shanghai）。
- 环境：Windows PowerShell、Node.js v24.20.0、pnpm 11.25.0、Vitest 3.2.7。
- 需求：RQ-A-2-50；输入为匿名合成的已规范化 `TrackPoint`。

| 检查           | 命令或方法                                                                      | 摘要与结论                                                                                             |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 开始前工作树   | `git status --short --branch`                                                   | `main...origin/main`，无未提交文件                                                                     |
| 测试先行       | 先建立 `test/a5-client/http-a5-track-client.test.ts`，再实现 `src/a5-client/**` | 初次运行因实现尚不存在而失败；实现后 10 个场景通过                                                     |
| 客户端测试     | `pnpm exec vitest run test/a5-client/http-a5-track-client.test.ts`              | IT-C-50-01、02、14、24..28、30、31 共 10 个测试通过                                                    |
| 类型和源码构建 | `pnpm typecheck`、`pnpm build`                                                  | TypeScript strict 检查与构建通过                                                                       |
| 工程质量       | `pnpm check`                                                                    | Prettier、ESLint、TypeScript 与 Vitest 均通过；3 个测试文件共 14 个测试通过，其中第四周新增 10 个      |
| 提交前核对     | `git diff --check`、`git status --short --branch`                               | 变更仅在第四周代码、测试和记录内；空白差异检查通过，Git 的 CRLF 转换提示不影响结论                     |
| Excel 周报核对 | 使用课程模板导出 XLSX，并以 `openpyxl.load_workbook` 只读核验                   | 保留 1 张工作表、58 个合并区域及状态下拉项；成果物栏 10 个相对路径均对应实际文件，周报文件纳入本次提交 |

## 代表性响应

测试中的全接收 202：`{"requestId":"req-001","acceptedCount":2,"rejected":[]}`，结果为 `accepted`。部分拒绝 202：`acceptedCount=1`、`rejected=[{"index":1,"code":"DUPLICATE","message":"synthetic rejection"}]`，结果为 `partial`。`acceptedCount=0` 且两个索引均被拒绝时仍为 `partial`。计数不守恒、索引重复/越界、字段缺失/额外或 JSON 无法解析时均为 `invalid-response`，不会记为成功。

请求体包含原始字符串 `113.918500123456789`、`12500.00`、`-0.000e+2`、`1E+02`，未转换为 JavaScript `number`。测试只使用注入的 `fetch`，无真实 HTTP、A-5 数据库或持久化读回。正式契约、授权、字符串测量值支持和真实验收仍为阻塞项。
