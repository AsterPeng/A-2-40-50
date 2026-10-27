# 第 1 周检查证据

实际执行日期：2026-10-27（Asia/Shanghai）。课程窗口：2026-09-22 至 2026-09-28；不倒填为该窗口内完成。

| 检查            | 命令或方法                                                                                                | 结果                                                         | 结论                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| 工作树初始状态  | `git status --short --branch`                                                                             | 初始目录非 Git 仓库，且无项目文件                            | 已建立独立本地 Git 仓库                  |
| 简报副本        | 桌面原文与根目录副本的 SHA-256 对比                                                                       | 两者相同                                                     | 原文完整放在项目根目录                   |
| 环境            | `node --version`; `pnpm --version`                                                                        | Node.js v24.20.0；pnpm 11.25.0；PowerShell                   | 满足 Node.js 22+ 基线                    |
| 依赖            | `pnpm install --frozen-lockfile`                                                                          | 成功，`pnpm-lock.yaml` 已生成；仅允许 `esbuild` 必需构建     | 锁文件可用于后续复现                     |
| 质量检查        | `pnpm check`                                                                                              | Prettier、ESLint、`tsc --noEmit` 成功；Vitest 报告无测试文件 | 工程骨架检查通过，功能需求未验收         |
| 构建            | `pnpm build`                                                                                              | 成功                                                         | 类型与端口草案可编译，`dist/` 被忽略     |
| GitHub 远端读取 | `git -c http.sslBackend=schannel -c http.version=HTTP/1.1 ls-remote origin HEAD`；`git fetch origin main` | 成功，远端 `main` 初始提交为 `753569a`，仅有 `README.md`     | 本地 `main` 已接入远端历史；推送仍待核实 |
| Git 成果物核对  | `git diff --cached --name-only`、`git diff --cached --check`、`git status`                                | 第一批 19 个文件已提交为本地 `652ef0f`，周报 XLSX 待下一提交 | 只把仓库中实际存在的文件写入周报成果物   |

本周映射的测试 ID 见 `docs/requirements/traceability.md`；均为计划中的测试，执行证据待对应周次生成。真实 A-5 地址、授权与契约尚未确认，未访问真实服务。安装过程曾因网络/无交互模式和 `esbuild` 构建许可中断，已只允许该依赖的构建并完成安装；不把这些中断写成最终检查失败。GitHub 曾因代理及私有状态不可读，仓库公开后以 Windows TLS 选项读取并抓取成功。
