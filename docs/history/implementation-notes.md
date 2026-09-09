# 实施经验

## 迁移清单

| 旧资料                                   | 新的规范位置                                                     |
| ---------------------------------------- | ---------------------------------------------------------------- |
| 已完成的 v0.1–v1.0 specs 与 plans        | 本 `docs/history/` 文档集与当前项目文档                          |
| `docs/process/implementation-record*.md` | `docs/history/implementation-notes.md`                           |
| 待实施的 optional AI assist 设计         | `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md` |

## 可复用实践

### 材料决策

实现先区分当前事实、假设和未来工作。行为变化先有独立设计和批准；Roadmap 是未来版本计划的唯一详细来源。公开项目文档保持中英文同步，过程资料和历史参考以中文维护。

### 验证命令

行为变更遵循已观察到的 RED/GREEN；交付前运行 `npm test`、`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、`node dist/cli.js review benchmarks --format json` 与 `git diff --check`。基准审计预期返回 `1`，因为它包含确定性 `FAKE` fixture。

### 工程与审查

参考工作流使用最小权限，审计和 gate 的 `0`、`1`、`2` 必须被明确处理。提交前精确暂存并检查缓存差异；审查发现要先复现或用回归测试确认，再做最小修复。

### 已知限制

静态审计不证明运行时质量、覆盖率、变异得分或发布就绪性。未来 runtime、mutation 与模型能力必须是显式、独立、可验证的适配层，且不能改写 v1.0 静态结论。

## 2026-09-09 文档收敛

本次将已完成版本的过程资料抽象为中文历史参考，双语项目文档保留当前使用契约，Context 记录稳定基线。已验证：文档契约测试、完整 `npm test`（175 项）、lint、typecheck、format check、build 和 `git diff --check` 通过；基准审计按预期以退出码 `1` 返回确定性 `FAKE` 发现项。

## 2026-09-09 npm 分发边界

`v1.0.1` 将 npm 发布物限制为编译后的 `dist/`、双语 README 与许可证；源码、测试、历史过程资料和 CI 配置保留在 GitHub 仓库，不进入运行时 CLI 包。`prepack` 在打包和发布前执行 TypeScript 构建，避免分发过期产物。

## 2026-09-09 npm 运行时依赖修复

发布后的 CLI 在全局安装环境中会加载 TypeScript Compiler API；因此 `typescript` 必须位于 `dependencies`，不能仅位于 `devDependencies`。`v1.0.2` 以补丁版本修正该 manifest 契约，并增加回归测试以防止再次遗漏。

## 2026-09-09 发布产物回归测试

npm CLI 的符号链接回归测试需要先生成 `dist/`；测试通过 Node 的模块解析定位 TypeScript 编译器，兼容干净 CI checkout 与共享依赖的本地 worktree。`v1.0.3` 只修复该验证前置条件，审计行为与 npm 运行时产物保持不变。
