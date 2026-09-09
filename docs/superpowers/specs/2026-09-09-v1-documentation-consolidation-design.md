# v1.0 文档收敛与迭代上下文设计

## 决策

v1.0 是当前稳定基线。仓库文档分为三层：面向使用者与贡献者的双语项目文档、以中文为主的开发过程与历史参考文档，以及面向人和 AI 的项目执行上下文。每条未来版本计划只有一个详细来源，避免 README、上下文文档和执行规则分别维护不同版本的计划。

本次只整理文档结构、内容和导航；不改变 CLI、静态分析规则、政策或门禁行为，不新增 v2.0 功能，也不把未来方向表述为已交付能力。

## 文档分层

| 层级       | 位置                                                                    | 语言                              | 读者                    | 职责                                                 |
| ---------- | ----------------------------------------------------------------------- | --------------------------------- | ----------------------- | ---------------------------------------------------- |
| 项目文档   | `README.md`、`README_ZH.md`、`docs/`、`docs/zh/`、`test-quality-audit/` | 中英文同步                        | 使用者、贡献者、外部 AI | 说明当前已实现能力、使用方式、稳定边界和公开契约。   |
| 项目上下文 | `docs/context.md`、`docs/zh/context.md`、`AGENTS.md`                    | 中英文 Context；AGENTS 为执行规则 | 维护者、开发者、AI      | 说明 v1.0 基线、不可变约束、文档职责与未来工作入口。 |
| 过程与历史 | `docs/history/`                                                         | 中文                              | 后续迭代维护者          | 抽象已完成版本的决策、能力演进、工程经验和已知限制。 |

`docs/roadmap.md` 与 `docs/zh/roadmap.md` 仍属于项目文档，但它们是未来计划的唯一详细来源。README、Context 和 AGENTS 只能摘要或链接 Roadmap，不得复制完整实施计划。

## 对外双语文档

根目录 README 改为任务导向结构：项目定位与限制、安装、首次审计、常用命令、advisory policy / baseline / decision / gate 的使用入口、退出码、下一步方向、文档导航、开发参与方式和许可证。现有按 v0.x 排列的章节应合并为当前能力说明；保留必要的输入输出示例，但不把历史实现顺序作为新用户的阅读路径。

`README.md` 是英文主入口，`README_ZH.md` 与其保持相同信息结构。`docs/` 与 `docs/zh/` 保持 requirements、architecture、rules、roadmap、development、README 和 context 的一一对应。公开行为、命令、规则、边界或导航改变时，必须同步两种语言及相关 Skill 资产。

Roadmap 将明确标出：

1. v1.0 已完成，仍是 source-only 的显式 opt-in FAKE-only gate；
2. v2.0 只是待独立设计的运行时、变异与可选 AI/LLM 适配方向；
3. 未来版本不得改变既有静态 findings/classification、FTR、Trust Score、现有退出码或 gate 输入；
4. 所有日期、供应商、阈值、覆盖率和兼容性扩展均不作承诺，除非后续有维护者决策和验证证据。

README 的“Next / 下一步”只陈述上述状态并链接 Roadmap，不列出具体实施步骤。

## Context 与 AGENTS

`docs/context.md` / `docs/zh/context.md` 是稳定的项目地图，包含项目目的、v1.0 能力地图、命令与主要 JSON 契约入口、分析边界、文件与文档导航、验证要求，以及未来迭代的 Roadmap 链接。它们不记录提交号、逐次测试输出或未批准的设计细节。

`AGENTS.md` 收拢可执行的长期规则：

1. 当前稳定基线为 v1.0；开始 v2.0 或更高版本前，必须阅读 Roadmap、Context、相关规则和测试；
2. 任何未来能力先形成独立设计并获得批准，再实施；
3. runtime、mutation 或模型能力只能作为独立、显式、可验证的适配层，不得暗中执行 reviewed source、读取凭据或调用网络；
4. 不得改变 source-only 静态 finding/classification、`FAKE`/`WEAK`/`UNASSESSED` 边界、FTR、Trust Score、既有命令退出码或 FAKE-only opt-in gate 的输入语义；
5. Roadmap 是未来计划的唯一详细来源；README 和 Context 只能引用或摘要它；
6. 项目公开文档与 Skill 资产维持中英文同步，过程与历史文档以中文维护；
7. 每次材料变更仍须遵守 TDD、验证、过程记录和精确 Git 暂存规则。

其中“过程记录”唯一指向 `docs/history/implementation-notes.md`：它以中文追加记录材料决策、范围变化、验证命令与已知限制。`AGENTS.md`、开发指南、README、文档索引和文档契约测试必须在删除旧记录前全部改为这一入口；不再维护英文过程记录，也不要求 history 中存在英文配对文件。

## 历史文档收敛

创建下列中文抽象文档：

| 新文件                                   | 来源                                     | 保留内容                                                                  | 不保留内容                                          |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `docs/history/product-evolution.md`      | 历史 roadmap、README 与版本设计          | v0.1–v1.0 的能力演进、当前基线、版本间依赖和已完成范围。                  | 逐版本的重复命令、未实现承诺、提交号。              |
| `docs/history/architecture-decisions.md` | specs、architecture、requirements、rules | source-only、分类边界、advisory/gate 分工、输入输出和安全边界的决策理由。 | 已被当前架构文档覆盖的逐行实现说明。                |
| `docs/history/implementation-notes.md`   | plans、implementation record、测试经验   | 可复用的 TDD、验证、CI/CLI 和审查经验，以及已知限制。                     | 单次 RED/GREEN 输出、重复验证日志、分支和提交流水。 |

内容被准确抽象后，删除 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 内与已完成 v0.1–v1.0 实现有关的逐版本文件；删除中英文 `docs/process/implementation-record*`。删除按以下原子顺序进行：先创建三份 history 文档并迁移有效结论；再更新 `AGENTS.md`、README、docs 索引、开发指南、Roadmap 链接与 `src/docs-contract.ts`；运行链接和契约验证；最后删除旧文件。禁止先删除再修复引用。

不删除 `docs/superpowers/` 目录本身。尚未实施的 v2.0 设计 `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md` 是当前唯一的详细未来设计，必须保留在该路径；双语 Roadmap 和 Context 继续链接它。未来已获批准但尚未实施的设计与计划也保留在 `docs/superpowers/`；只有完成交付且有效结论已经迁入 history 或当前文档后，才适用上述清理规则。

在删除前，实施者必须生成“旧文件 → 新文档章节”的迁移清单，确认每一项仍有效约束在当前双语项目文档、Context、AGENTS 或 history 中有唯一落点；仅是操作流水的内容可以不迁移。

## 验证与完成标准

1. 增加或更新文档契约测试，验证双语入口、Context、Roadmap、README、AGENTS 与历史文档的必需标记和有效链接。
2. 使用 `rg` 确认被废弃的 completed plan/spec/process 路径没有剩余入口引用；确认 Roadmap 与 Context 仍链接保留的 v2.0 设计，不要把它表述为已交付事实。
3. 运行 `npm test`、`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、`node dist/cli.js review benchmarks --format json`（预期退出 `1`）与 `git diff --check`。
4. 逐项检查中英文公开文档结构一致、历史文档只有中文、AGENTS 与 Roadmap 不互相矛盾，并在 `docs/history/implementation-notes.md` 中注明迁移范围和验证结果。

## 非目标

本次不发布 v1.0，不推送、不创建 PR，不新增或实现 v2.0 功能，不删除未迁移的有效设计结论，不改变测试审计结果，也不将历史设计翻译为英文档案。
