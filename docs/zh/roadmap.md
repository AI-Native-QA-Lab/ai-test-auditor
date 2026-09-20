<div align="right"><a href="../roadmap.md">English</a> · <strong>简体中文</strong></div>

# 迭代计划

## 当前基线

v1.1.1 是当前稳定发布版本。它以确定性、纯源码方式审计 JavaScript 与 TypeScript 测试，并提供显式 opt-in 的仅 `FAKE` 策略门禁。发布版本号不证明该版本的所有计划已完成；审计或门禁通过也不证明测试很强。

## 已交付演进

| 范围        | 已交付结果                                                         |
| ----------- | ------------------------------------------------------------------ |
| v0.1–v0.3   | AST 提取、确定性规则、CLI 报告和离线证据契约。                     |
| v0.4–v0.5   | 变异证据输入、Unit/API/E2E 规则扩展和变更文件选择。                |
| v0.6–v0.9   | 建议性策略、基线、决策投影和最小权限 GitHub Actions 参考工作流。   |
| v1.0        | 显式 opt-in 的仅 `FAKE` 门禁，具有稳定的 `0`/`1`/`2` 失败语义。    |
| v1.1–v1.1.1 | 离线 HTML 报告可用性、本地化、稳定输出路径和按框架的静态范围汇总。 |

已完成版本的决策理由见中文[历史文档](../history/product-evolution.md)。

## 路线图与 GitHub Project 的协作方式

本文件是详细计划来源。[AI Test Auditor Roadmap GitHub Project](https://github.com/users/naodeng/projects/3) 是执行视图：每张卡关联一个路线图版本，写清范围、非目标、验收证据、需更新文档和验证命令。Project 卡不是交付声明。

使用字段：`Work type`（`Epic`、`Design`、`Implementation`、`Documentation`、`Validation`）、`Roadmap version`、`Roadmap status`（`Backlog`、`Ready for design`、`In progress`、`Blocked`、`Done`）、`Evidence status`（`Not started`、`Design approved`、`Validated`、`Blocked`）和 `Risk`（`Low`、`Medium`、`High`）。没有已记录的验证证据，不得把卡片移到 `Done`。

## v1.2：静态审计增强、补全与证据质量

因 `v1.1`/`v1.1.1` 版本号已经使用，`v1.2` 承接未完成的 v1.1 基础目标，同时增强现有审计和报告能力。它必须保持纯源码：不执行运行时、不访问网络、不做语义推断，也不因测试未被标记而推导 `STRONG`。

### 需要增强的规则基线

| 审计类型 | 当前已实现规则                                   | v1.2 方向                                                                                                   |
| -------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unit     | 10 条：`UT001`–`UT004`、`UT008`、`UT011`–`UT015` | 已交付裸 expect、矛盾断言计数、仅 mock 交互和仅 snapshot 断言等保守源码模式，并有反例控制。                 |
| API      | 10 条：`API001`–`API010`                         | 已交付响应元数据、请求回显、空结果和吞掉请求错误等有边界检查；依赖上下文的情形保持 `WEAK`。                 |
| E2E      | 10 条：`E2E001`–`E2E010`                         | 已交付 selector、吞掉错误、条件断言、await、page action 和空结果等有边界检查；依赖上下文的情形保持 `WEAK`。 |
| Parser   | 1 条：`PARSER001`                                | 保持仅报告源码语法的含义，并与运行时有效性严格分离。                                                        |

上表是当前规则清单，不是质量评分，也不承诺固定的规则总数。每条新增规则均需经过设计审查、聚焦 RED/GREEN、代表性不可触发样例、benchmark 标签、规则目录更新和中英文文档同步。

v1.2 benchmark manifest 是 version `1` 的纯源码契约。`ata benchmark`（也由 `npm run benchmark` 调用）比对 10 条 Unit、10 条 API 和 10 条 E2E 规则的精确 finding/classification 身份，并包含明确的 non-triggers。benchmark 输出只表示 fixture 一致性，不是运行时质量、覆盖率、mutation、precision、recall 或发布证据。

### v1.2 Project 卡片

| 卡片                                            | 类型                    | 范围与完成证据                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `v1.2 / Rule inventory and public contract`     | Documentation           | 对齐 `Finding`、`Rule`、JSON 输出、CLI help、规则目录和双语 Skill 资产；任何 schema/CLI 兼容性变化均须有明确迁移决定和回归覆盖。                                                           |
| `v1.2 / Unit audit enhancement`                 | Design + Implementation | 经 false-positive 审查后选择保守的 Unit 模式；保留 `FAKE` 的确定性要求，并提供聚焦正反例测试。                                                                                             |
| `v1.2 / API audit enhancement`                  | Design + Implementation | 只实现静态可见且排除条件明确的 API 模式；不得声称 endpoint、schema 或 business state 已被执行或理解。                                                                                      |
| `v1.2 / E2E audit enhancement`                  | Design + Implementation | 实现 selector 稳定性、吞掉失败、条件断言等保守源码模式；保持静态边界和报告无障碍。                                                                                                         |
| `v1.2 / Benchmark contract and corpus`          | Design + Implementation | 版本化 fixture 格式：源码、期望 finding、期望规则/分类和明确不可触发项；标签不符或出现非预期 finding 必须确定性失败。                                                                      |
| `v1.2 / Configuration and reporter enhancement` | Implementation          | 加固既有 policy、baseline、mutation-report、output、locale、changed-file 输入；增强离线报告导航、筛选、空/错误状态和纯源码说明，不能改变原始 JSON/静态语义。                               |
| `v1.2 / Reproducible validation`                | Validation              | 对材料行为变更记录 RED/GREEN，运行文档化本地门禁和 benchmark 命令。benchmark 仅报告 fixture 一致性；除非另有获批度量设计，不得称为运行时质量、覆盖率、mutation 得分、Precision 或 Recall。 |

**退出标准：** 公开契约和规则目录与实现一致；每条改动规则均有已观察的 RED/GREEN 与反例覆盖；benchmark 已版本化且可复现；报告/配置明确静态边界；中英文公开文档同步；`0`/`1`/`2` 语义与仅 `FAKE` 门禁不变。

## v1.5：Evidence Contract

**设计门槛：** 实现前必须独立设计并获得批准。

定义版本化、可溯源的外部证据 envelope，用于 semantic、mutation、runtime、coverage、requirement、change 等输入。它必须保留来源、置信度与 schema 校验。外部证据可以展示或排序，但绝不能改写确定性 finding、classification、FTR、Trust Score、退出语义或 gate 输入。

初始卡片：`Evidence envelope design`、`Schema validator and fixtures`、`Reporter projection`、`Bilingual contract documentation`、`Compatibility validation`。

## v2.0：Semantic Test Auditor

运行时、变异和 LLM 适配器仍属于未来证据层，v1.2 尚未交付。

**设计门槛：** 需要独立设计批准与安全审查。

探索测试意图、已观测 oracle、缺失 oracle 和可能存活缺陷假设的结构化证据。provider、凭据、网络和执行必须是显式 opt-in，`--no-ai` 必须继续支持。结果是供审查的证据，不是 `FAKE` 改写、`STRONG` 分类或默认测试生成。

## v2.1–v2.7：按证据类型扩展

这些版本均依赖获批准的前序证据契约：v2.1 API 语义审计、v2.2 E2E 语义审计、v2.3 显式 mutation runtime、v2.5 Change-to-Test analysis、v2.7 requirement traceability。它们必须使用独立 evidence namespace，不得静默扩大静态规则目录或暗示执行已发生。每个 Epic 从设计、契约/fixture、报告投影和边界验证卡开始。

## v3.0：AI QA Agent 与 v3.x 语言

**设计门槛：** 两者都只是 Epic，不是可直接实现的功能。只有证据契约被证明后，Agent 才能收集显式证据、挑战假设并输出带不确定性标记的 assessment。新增语言一次只评估一种：使用语言专属 extractor 与 fixture，同时保持 evidence/assessment 层语言无关。

## 规划规则

- 本迭代计划是未来版本计划的唯一详细来源；README 和 Context 只能摘要或链接它，GitHub Project 镜像执行状态。
- 优先可解释、纯源码的证据，而不是只追求规则数量。
- `FAKE` 必须保持确定性；上下文提示保持 `WEAK` 或省略。
- Runtime、网络、凭据和 CI gate 始终显式 opt-in。
- Finding 与 assessment 是不同层；未来证据不得静默改变静态结论。

## 不作承诺

未获得维护者决策和验证证据前，不承诺日期、provider、mutation engine、阈值、覆盖率目标、未来框架支持或兼容性保证。
