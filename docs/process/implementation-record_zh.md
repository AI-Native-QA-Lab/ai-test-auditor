<div align="right"><a href="./implementation-record.md">English</a> · <strong>简体中文</strong></div>

# 实施过程记录

## 2026-09-08 — v0.8.0 CI 无关的建议性决策

新增 `ata decision <envelope.json>`：一个本地 version `1` 静态快照适配器，输出简洁的 `advisory` 决策。它拒绝未知字段和 semantic/mutation 附件，校验静态汇总与发现项的一致性，并仅将策略/基线 ID 作为上下文。有效决策返回 `0`，无效信封返回 `2`。它不执行被审计源码、变异命令、模型、provider SDK 或 CI 集成；它不是 CI 门禁、发布决定、豁免或通过/失败结果。

已观察到 RED：`npx vitest run tests/core/decision.test.ts` 因 `src/core/decision.ts` 缺失失败；之后 `npx vitest run tests/cli.test.ts` 因 `decision` 为未知命令失败。最小模块和命令接入后，聚焦核心/CLI 测试 GREEN。未执行 CI、发布、打标或 Release。

最终验证：`npm test` 通过 15 个测试文件 / 153 项测试；lint、typecheck、format check、build 和 `git diff --check` 通过。`node dist/cli.js review benchmarks --format json` 以预期退出码 `1` 返回静态发现项。构建后的 `node dist/cli.js decision` 冒烟测试以 `advisory`、`attention` 和 `STATIC_FAKE_FINDINGS` 返回 `0`。

## 2026-09-08 — v0.7.0 基线对比

新增本地 version `1` 基线工件：以规则 ID、相对根目录 POSIX 路径、行号、分类和严重性组成稳定身份，只报告历史/新增发现项计数。历史项不是接受、豁免或质量背书；不会改变发现项、分类、汇总、FTR、Trust Score、策略计数或退出语义。无效基线返回退出码 `2`。

聚焦 RED：`npx vitest run tests/core/baseline.test.ts` 因 `src/core/baseline.ts` 不存在失败；`npx vitest run tests/core/audit.test.ts` 因缺少 baseline 附件失败；`npx vitest run tests/cli.test.ts tests/reporters.test.ts` 因 CLI flag、版本和文本区块缺失失败。相应 GREEN 均已观察到。完整验证：`npm test` 14 个文件 / 140 项通过，lint、typecheck、format check、build 与 `git diff --check` 通过；benchmark JSON 以预期退出码 `1` 返回。

## 2026-09-08 — 可选 AI 辅助延后到 v2.0

记录产品决策：可选模型辅助采用静态优先、默认关闭、仅建议性，并在 v1.0 opt-in 门禁之后作为 v2.0 的一部分推进（先加固离线契约，再做显式 live 调用）。AI 辅助不得输出 `FAKE`/`WEAK`/`STRONG`/`INVALID`，也不得改变静态汇总、FTR、Trust Score、退出语义或门禁输入。近期 v0.7–v1.0 范围不变；未实现 live provider。设计见 `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md`。已同步更新中英文公开路线图的 v2.0 表述。

## 2026-09-07 — v0.6.0 建议性策略公开契约完成

公开契约将 `--policy` 定义为纯源码审计的显式 version `1`、`mode: "advisory"` 输入。它只报告禁用/活跃选择计数；不会移除发现项，也不改变分类、汇总/FTR/Trust Score、退出语义、CI 门禁行为或发布决定。对应的中英文 README、路线图、架构、规则、Skill、Prompt、参考资料和评估材料均保留该边界。

聚焦文档契约 RED：`npx vitest run tests/docs-contract.test.ts` 因 8 个预期缺失标记失败：两份 README 与两份路线图均缺少 `0.6.0` 和纯源码审计措辞。GREEN：以最小的双语标记补充后，同一命令通过（1 个测试）。随后完整验证记录为：`npm test` 的 13 个文件 / 131 个测试通过，`npm run lint` 和 `npm run typecheck` 通过，格式化 `docs/roadmap.md` 后 `npm run format:check` 通过，`npm run build` 通过，`node dist/cli.js review benchmarks --format json` 以预期退出码 `1` 返回并产生 6 个 `FAKE` 与 1 个 `WEAK` 发现项，`git diff --check` 通过。策略处理不会执行被审计源码、测试、模型或 mutation 命令。

已观察到的策略实现证据：Task 3 运行 `npx vitest run tests/core/policy.test.ts`；RED 因 `src/core/policy.ts` 不存在而失败，随后 GREEN 通过 11 个测试。Task 4 运行 `npx vitest run tests/core/audit.test.ts tests/cli.test.ts tests/reporters.test.ts`；RED 显示预期的策略附加与 CLI 缺失失败，最终 GREEN 通过 38 个测试。这些记录与上述实际文档契约 RED/GREEN 和完整验证结果一并保留。

## 2026-09-07 — 历史 TDD 证据限制

v0.3 和 v0.5 缺少可恢复的、已观察到的聚焦 RED 与 GREEN 命令记录。历史 RED/GREEN 证据未记录。本条目不作追溯性的 TDD 声明，也不虚构过去的命令或结果。未来的关键行为变更必须在发布验证前记录已观察到的聚焦 RED 与 GREEN 命令。

## 2026-09-05 — v0.4 离线变异证据

新增位于 `--mutation-report` 后的 version `1` 变异报告适配器。证据必须包含引擎标识、已记录命令、阈值来源、数量和一致的分数。记录的命令绝不会被执行；阈值状态仅供建议，不改变静态发现、分类、FTR、Trust Score 或退出码。

TDD 证据：`npx vitest run tests/core/mutation.test.ts` 先因 `src/core/mutation.ts` 不存在而失败；加入严格 parser 和 loader 后，4 个测试通过。随后 `npx vitest run tests/cli.test.ts tests/reporters.test.ts` 因缺少 CLI 选项和报告段而失败；接入 mutation 附加和输入错误处理后，聚焦套件通过。

初始 v0.4 验证：`npm test` 通过 9 个文件、61 个测试；`npm run lint`、`npm run typecheck`、`npm run format:check` 和 `npm run build` 均通过。`node dist/cli.js review benchmarks --mutation-report /private/tmp/ata-v0.4-mutation-report.json --format json` 输出了 `mutation.meetsThreshold: false`，但由于基准原有的静态 `FAKE` 发现保持不变，仍按预期返回退出码 `1`。

测试补强：新增不支持的版本、两位小数分数取整、格式错误和缺失文件、达标/未达标渲染、携带 mutation 证据的静态 `FAKE` 退出码，以及若被执行将创建标记文件的已记录命令等契约用例。聚焦命令 `npx vitest run tests/core/mutation.test.ts tests/cli.test.ts tests/reporters.test.ts` 通过 28 个测试；标记文件未被创建。

## 2026-09-04 — v0.3 离线语义接口

新增版本化 semantic-report 加载和可选的 offline/OpenAI/Anthropic provider 配置校验。Provider 仅是配置：v0.3 不读取凭证，也不通过网络发送被审计源码。语义推断仅供参考，不改变静态发现、分类、分数或退出码。

## 2026-09-04 — TDD 交付政策

今后的所有功能、修复、重构和行为变更必须遵循已观察到的 RED-GREEN-REFACTOR 循环。关键改动需同时记录聚焦 RED、GREEN 命令和全量验证证据。

## 2026-09-04 — v0.2 提取范围

v0.2 增加嵌套套件标签、参数化 Jest/Vitest 测试提取、解析诊断和可选 basename 排除配置。诊断会转换为 `PARSER001` `INVALID` 发现项，并使 CLI 返回退出码 `2`；它仍不代表运行时有效性。

## 2026-09-05 — v0.1–v0.4 审查修复

通过 TDD 的 RED/GREEN 证据修复三项契约缺口：格式错误的 semantic report 现在返回 CLI 退出码 `2`；parser 诊断现在生成 `PARSER001` `INVALID` 发现项，无效源码审计返回退出码 `2`；包元数据与 `ata --version` 统一报告 `0.4.0`。新增版本化 semantic 接受/拒绝语料库 `test-quality-audit/evals/semantic-report-v1.json`。

修复后验证：`npm test` 通过 10 个文件、76 个测试；`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build` 和 `git diff --check` 均通过。

后续 TDD 修复：`npx vitest run tests/reporters.test.ts` 首先失败，因为 parser 诊断被呈现成提取出的测试。随后将报告契约改为把 `summary.total` 标记为审计条目，并通过 `result.tests.length` 显示提取出的测试数；聚焦 reporter 测试套件通过。

双语公开标记 guard：`npx vitest run tests/docs-contract.test.ts` 首先失败，因为尚不存在文档校验器。新增检查会对比中英文的 mutation/parser/退出码公共标记、规则 ID/分类和 README 退出码行；它不声称能够证明全部正文翻译等价。聚焦测试和全量测试均通过。

审查后续修复：semantic corpus 测试先因成功用例只覆盖 `offline` 而失败；现在要求并验证 `offline`、`openai` 和 `anthropic`。需求文档改用“当前含义”，不再错误标注为 v0.1 行为；已完成的 v0.4 计划也记录了当前 `INVALID` 优先的退出码顺序。

## 2026-09-03 — 许可证决策

项目许可证改为 PolyForm Noncommercial License 1.0.0。`LICENSE`、包元数据、公开入口和贡献指南均链接至官方条款；仓库不提供法律意见，也不对具体商业用途作出判断。

## 范围

在隔离 worktree `codex/initial-mvp` 中实施初始 MVP。用户要求交付确定性的纯源码 CLI、英文优先且可切换中文的 README、需求/架构/规则/路线图/开发文档、独立双语 Skill 与 Prompt、基准 fixture、CI 和过程证据。

## 设计决策

| 决策                            | 原因                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| 优先静态 AST 证据               | 在不假装观察运行时行为的前提下，提供可复现、可解释的发现项。      |
| 使用 `UNASSESSED` 而非 `STRONG` | 当前规则未命中不能证明测试有效。                                  |
| `FAKE` 仅用于窄范围语法模式     | 避免把依赖上下文的建议报告成确定缺陷。                            |
| 文本投影加完整 JSON 契约        | 文本报告服务人工阅读；JSON 保留完整结构化审计结果，供自动化使用。 |
| 透明的 FTR 与分数               | 让启发式可检查，而不是伪装成质量测量。                            |

## 实施顺序

1. 建立 TypeScript/Vitest/ESLint/Prettier/Commander 脚手架和不可变审计契约。
2. 添加安全扫描器和 TypeScript 编译器 API 提取器；只读取审计源码，绝不执行。
3. 添加单元/API/E2E 的确定性规则和源码定位契约。
4. 添加聚合、评分、报告器、`ata review` 和退出码文档。
5. 添加双语公开文档、协作规则、Skill/Prompt 资产、基准 fixture 和 CI。
6. 通过 red-green 流程新增 `E2E001`：规则引擎用例先因无发现项失败，加入窄规则后通过。

## 审查修复（2026-09-03）

本轮针对最终审查结论进行了范围受控的修复。先添加三个聚焦回归用例，再实施最小改动：

1. UT011 现在要求 callee 和全部参数的 TypeScript AST 结构文本均一致；不同参数不再命中。
2. UT003 使用 TypeScript AST 打印的结构文本比较，保留字符串字面量的空白和内容，避免把 `'a b'` 与 `'ab'` 当作相同表达式。
3. 提取器把 `TestCase.line` 定义为回调起始行，因此回调跨行书写时，发现项定位不会错误地以 `test(...)` 起始行作为基准。
4. CI 仅允许 benchmark 审计预期产生的退出码 `1`，其余任何退出码都会失败。
5. 需求和架构文档明确：文本是可读投影，JSON 是完整结构化公开结果；不再错误承诺二者携带完全相同的数据。
6. 实施计划中原先的 `ts-morph` 表述已更正为 TypeScript 编译器 API，以匹配实际实现。

## 验证证据

| 检查                              | 状态       | 证据                                                                                                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| UT011/UT003/回调定位回归（RED）   | 已观察失败 | 修改实现前，聚焦测试以 3 个预期失败退出：UT011 不同参数仍命中、UT003 丢失字面量空白、提取器返回 `test(...)` 第 3 行而非回调第 5 行。 |
| UT011/UT003/回调定位回归（GREEN） | 已通过     | 修改后同一聚焦测试集通过；完整命令输出将在本轮最终验证后记录。                                                                       |

### 最终审查验证（2026-09-03）

| 检查                        | 状态       | 证据                                                                                                                                                          |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 聚焦回归 RED                | 按预期通过 | 实现前运行 `npm test -- tests/core/rule-engine.test.ts tests/core/extractor.test.ts`，恰好出现 3 个预期失败：UT011 不同参数、UT003 字面量空白和回调行号基准。 |
| 聚焦回归 GREEN              | 已通过     | 最小实现修改后，同一聚焦命令通过。                                                                                                                            |
| 完整测试集                  | 已通过     | `npm test`：7 个文件、45 个测试通过。                                                                                                                         |
| Lint/typecheck/format/build | 已通过     | `npm run lint`、`npm run typecheck`、`npm run format:check` 和 `npm run build` 均以 0 退出。                                                                  |
| 构建后的 CLI benchmark      | 已通过     | `node dist/cli.js review benchmarks --format json` 输出了包含 UT011 在内的文档化发现项，并如预期返回退出码 `1`。                                              |
| CI benchmark 退出码策略     | 已通过     | workflow 中的 shell 条件接受真实 benchmark 的退出码 `1`，并拒绝模拟的非预期退出码 `0`。                                                                       |
| Diff 空白检查               | 已通过     | `git diff --check` 没有输出。                                                                                                                                 |

## 已知边界

- 工具不执行被审计测试，也不验证 import、fixture、运行时结果、覆盖率或产品行为。
- 当前提取器只支持直接 `test` / `it` 回调，不支持每一种框架 DSL 变体。
- LLM 执行、变异命令执行和 CI gate 强制执行仍属于路线图，不是已实现功能。

## 过程文档政策

后续关键决策、范围变化、验证命令、失败和未解决风险都记录在本文件，并同步英文过程记录。不得用回顾性描述替代命令证据。

## v0.5 — 2026-09-06

- 新增有边界的 WEAK 规则 UT004、API002、E2E003。谓词要求每个直接断言都使用文档规定的无参数 matcher；修饰符、裸 expect 和混合断言是反向控制。
- 新增 `--changed-since <ref>`，相对于已验证的本地提交，从当前 diff 和未跟踪文件状态中选择现有支持的测试文件。不会执行源码、检查变更生产代码或推断测试关联性。
- 验证：`npm test`（108 个测试）、`npm run lint`、`npm run typecheck`、`npm run build`、`npm run format:check` 和 `git diff --check` 均通过。
