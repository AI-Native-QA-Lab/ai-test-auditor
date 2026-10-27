<div align="right"><a href="../roadmap.md">English</a> · <strong>简体中文</strong></div>

# 迭代计划

## 当前基线

v1.2.1 是当前稳定发布版本。它以确定性、纯源码方式审计 JavaScript 与 TypeScript 测试，并提供显式 opt-in 的仅 `FAKE` 策略门禁；v1.2.1 还修正了 advisory GitHub Actions workflow 的退出语义。发布版本号不证明该版本的所有计划已完成；审计或门禁通过也不证明测试很强。

## 已交付演进

| 范围        | 已交付结果                                                                            |
| ----------- | ------------------------------------------------------------------------------------- |
| v0.1–v0.3   | AST 提取、确定性规则、CLI 报告和离线证据契约。                                        |
| v0.4–v0.5   | 变异证据输入、Unit/API/E2E 规则扩展和变更文件选择。                                   |
| v0.6–v0.9   | 建议性策略、基线、决策投影和最小权限 GitHub Actions 参考工作流。                      |
| v1.0        | 显式 opt-in 的仅 `FAKE` 门禁，具有稳定的 `0`/`1`/`2` 失败语义。                       |
| v1.1–v1.1.1 | 离线 HTML 报告可用性、本地化、稳定输出路径和按框架的静态范围汇总。                    |
| v1.2.0      | 静态审计规则补全、版本化 benchmark corpus、配置加固和可复现验证。                     |
| v1.2.1      | advisory GitHub Actions workflow 退出语义与 CI 契约修复；其中的静态发现项保持不阻断。 |

已完成版本的决策理由见中文[历史文档](../history/product-evolution.md)。

## 路线图与 GitHub Project 的协作方式

本文件是详细计划来源。[AI Test Auditor Roadmap GitHub Project](https://github.com/users/naodeng/projects/3) 是执行视图：每张卡关联一个路线图版本，写清范围、非目标、验收证据、需更新文档和验证命令。Project 卡不是交付声明。

使用字段：`Work type`（`Epic`、`Design`、`Implementation`、`Documentation`、`Validation`）、`Roadmap version`、`Roadmap status`（`Backlog`、`Ready for design`、`In progress`、`Blocked`、`Done`）、`Evidence status`（`Not started`、`Design approved`、`Validated`、`Blocked`）和 `Risk`（`Low`、`Medium`、`High`）。没有已记录的验证证据，不得把卡片移到 `Done`。

## v1.2：静态审计增强、补全与证据质量

因 `v1.1`/`v1.1.1` 版本号已经使用，`v1.2.0` 完成了未完成的 v1.1 基础目标，同时增强现有审计和报告能力。它保持纯源码：不执行运行时、不访问网络、不做语义推断，也不因测试未被标记而推导 `STRONG`。

### 需要增强的规则基线

| 审计类型 | 当前已实现规则                                   | v1.2 方向                                                                                                   |
| -------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unit     | 10 条：`UT001`–`UT004`、`UT008`、`UT011`–`UT015` | 已交付裸 expect、矛盾断言计数、仅 mock 交互和仅 snapshot 断言等保守源码模式，并有反例控制。                 |
| API      | 10 条：`API001`–`API010`                         | 已交付响应元数据、请求回显、空结果和吞掉请求错误等有边界检查；依赖上下文的情形保持 `WEAK`。                 |
| E2E      | 10 条：`E2E001`–`E2E010`                         | 已交付 selector、吞掉错误、条件断言、await、page action 和空结果等有边界检查；依赖上下文的情形保持 `WEAK`。 |
| Parser   | 1 条：`PARSER001`                                | 保持仅报告源码语法的含义，并与运行时有效性严格分离。                                                        |

上表是当前规则清单，不是质量评分，也不承诺固定的规则总数。每条新增规则均需经过设计审查、聚焦 RED/GREEN、代表性不可触发样例、benchmark 标签、规则目录更新和中英文文档同步。

当前目录包含 10 条 Unit、10 条 API 和 10 条 E2E 规则。v1.2 benchmark manifest 是 version `1` 的纯源码契约。`ata benchmark`（也由 `npm run benchmark` 调用）通过 8 个代表性 fixture 比对这些规则目录的精确 finding/classification 身份，并包含明确的 non-triggers。它们不构成逐规则代码覆盖率。benchmark 输出只表示 fixture 一致性，不是运行时质量、覆盖率、mutation、precision、recall 或发布证据。

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

下方待审的 API 场景方案依赖该契约将需求适用性、源码到场景的关联、断言观察、运行结果和来源分别建模。此处只是提案，不代表 v1.5 范围已经获批。

## v2.0：Semantic Test Auditor

运行时、变异和 LLM 适配器仍属于未来证据层，v1.2 尚未交付。

**设计门槛：** 需要独立设计批准与安全审查。

探索测试意图、已观测 oracle、缺失 oracle 和可能存活缺陷假设的结构化证据。provider、凭据、网络和执行必须是显式 opt-in，`--no-ai` 必须继续支持。结果是供审查的证据，不是 `FAKE` 改写、`STRONG` 分类或默认测试生成。

## v2.1–v2.7：按证据类型扩展

这些版本均依赖获批准的前序证据契约：v2.1 API 语义审计、v2.2 E2E 语义审计、v2.3 显式 mutation runtime、v2.5 Change-to-Test analysis、v2.7 requirement traceability。它们必须使用独立 evidence namespace，不得静默扩大静态规则目录或暗示执行已发生。每个 Epic 从设计、契约/fixture、报告投影和边界验证卡开始。

### v2.1 提案：API 场景追溯（待审）

**状态：** 供维护者审阅的草案，尚未批准、排期或达到可实现状态。现有设计门槛继续有效。

#### 问题与当前边界

当前 API 规则逐个检查提取出的测试回调。API001–API010 识别有限的断言模式，例如只检查状态码、只检查 body 是否存在、请求回显、空结果和吞掉请求错误。它们不会识别 API 操作、定义该操作需要的场景，也不会判断测试集合是否包含成功路径、无效输入、授权、未找到、冲突、边界或其他适用场景。详见 [API 规则](../src/rules/api.ts) 与[规则目录](./rules.md)。

当前还有分类限制：提取器将 Playwright 回调标记为 `e2e`，其他已支持的回调标记为 `unknown`；`--type auto` 保留提取结果。显式 `--type api` 会覆盖本次选中的每个回调，因此混合目录中的选择较粗。详见[提取器](../src/core/extractor.ts)与[审查类型处理](../src/core/audit.ts)。增加套件级场景报告前，应先刻画并完善现有 API 审查路径。

#### 目标

- 区分单个测试的断言质量与测试集合的场景追溯。
- 让项目为每个操作声明场景是必需、可选、不适用，还是尚未决定。
- 使用明确证据和不确定性，把静态可见的测试关联到操作与场景。
- 单独展示是否观察到可识别的断言，与测试是否执行并通过。
- 保持现有静态 finding、classification、FTR、Trust Score、退出码和仅 `FAKE` 门禁不变。

#### 第一阶段的非目标

- 不为所有接口推断统一场景清单。认证、分页、幂等性等场景因操作而异。
- 源码扫描不完整或测试使用不支持的动态 helper 时，不把未关联场景说成已证实缺少测试。
- 不声称源码关联证明场景已经运行、通过或验证了正确业务结果。
- 在必需场景的分母和证据语义经过评审和验证前，不输出场景覆盖率百分比。
- 第一阶段不添加 Java 解析或被审计源码执行能力，不访问网络或凭据，也不使用 LLM。

#### 建议的证据模型

保持三层证据相互独立：

1. **测试质量：** 当前针对单个回调的静态 finding，例如 API001 或 API010。
2. **场景追溯：** 在经审阅的 manifest 或静态可识别源码中找到的操作和场景关联。它表示关联证据，不表示执行或正确性。
3. **运行证据：** 未来通过显式适配器导入的测试结果。运行结果必须保留报告来源，且不能改写静态 finding。

建议以项目维护的版本化 JSON 场景 manifest 作为规范输入。OpenAPI 可以用于初始化操作清单，但不能替项目决定哪些业务场景必需。每个操作使用稳定的 `operationId` 或项目 ID、HTTP method 和 path。每个场景包含 ID、适用性（`required`、`optional`、`not_applicable` 或 `unknown`）及可选原因。例如：

```json
{
  "version": 1,
  "operations": [
    {
      "id": "users.create",
      "method": "POST",
      "path": "/users",
      "scenarios": [
        { "id": "success", "applicability": "required" },
        { "id": "invalid-email", "applicability": "required" },
        {
          "id": "unauthenticated",
          "applicability": "not_applicable",
          "reason": "Public registration endpoint"
        }
      ]
    }
  ]
}
```

每个操作/场景组合分别报告以下字段：

- **源码关联：** `linked`、`candidate`、`no_source_match` 或 `unassessed`。
- **断言观察：** `recognized`、`weak_only`、`none_recognized` 或 `unassessed`；这不判断业务正确性。
- **运行结果：** 只有在后续单独版本化的报告适配器提供时才出现；不得从源码推断。
- **来源信息：** manifest/spec 版本、扫描路径范围、源码位置、关联方法及 parser 或不支持语法的限制。

仅在扫描范围完整且已声明时，才能使用 `no_source_match`。部分选择、parser diagnostic、不支持的请求 helper、动态 endpoint 或有歧义的关联必须标记为 `unassessed` 或 `candidate`，不能断言确定缺失。

#### 建议的源码关联方式

以下证据顺序需通过覆盖所选请求客户端的 fixture 评审：

1. 版本化 manifest 或其引用的映射文件中显式声明测试到操作/场景的关联。
2. 在受支持的 JS/TS 请求形式中静态识别到完全匹配的 HTTP method 与字面 path。
3. 测试标题、文件名或间接 helper 相似度只能作为候选；不能单独构成确定性关联。

动态 path、不透明 wrapper、生成测试和存在多个可能操作的情况保持 `candidate` 或 `unassessed`。只有显式数据或受支持的静态语法能确立关联时，一个测试才可链接到多个场景。实现不得执行测试代码来解析关联。

#### 建议的推进顺序

| 阶段                   | 范围                                                                                                        | 待审证据                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0. 加固现有 API 路径   | 刻画 `auto`、显式 `--type api` 与混合目录；选择保守的 API 识别信号；复核现有 API 规则的触发和 non-trigger。 | 聚焦回归 fixture，包含混合 API/unit 测试及有歧义/动态请求。                                      |
| 1. v1.5 证据契约       | 定义版本化操作/场景输入、源码关联状态、适用性、来源信息，以及与运行结果的严格分离。                         | 覆盖有效、无效、部分扫描和适用性未知场景的 schema fixture。                                      |
| 2. v2.1 JS/TS 追溯切片 | 根据 manifest 与支持的静态请求形式生成操作×场景报告；保持现有 `ata review` JSON 契约。                      | 带 happy path、负向、边界、不适用、有歧义和不支持场景的标注 fixture，以及精确 non-trigger 预期。 |
| 3. 后续运行适配器      | 仅在证据契约获批后考虑导入测试执行结果；保持 opt-in 并单独标注来源。                                        | 兼容性与来源校验，证明运行输入不会改写静态 finding 或门禁行为。                                  |

初始报告建议作为独立版本化的追溯结果（候选命令：`ata trace-api <tests> --contract <manifest>`），而不是把推断出的覆盖声明加入现有 review JSON。命令名称和呈现方式仍待评审。后续 Java 可以通过单独的语言 extractor 使用同一语言无关的场景契约；Java 不属于 v2.1 切片。

#### 验收证据

- 文档说明 `auto`、显式类型选择和混合目录下的 API 分类行为；有歧义的情况保持未评估。
- 每个场景结果都注明源码关联状态、断言观察、扫描范围和证据来源。
- 必需场景没有源码关联时，措辞是“在本次扫描范围内没有源码匹配”，不声称没有测试。
- 静态场景追溯不改变规则 ID、`FAKE`/`WEAK`/`UNASSESSED`、现有 JSON review 语义、分数、退出码或门禁输入。
- fixture 覆盖正向关联、反例、有歧义映射、不支持客户端、不完整扫描、parser diagnostic 和不适用场景。
- 实现完成前，中英文契约、CLI、示例和限制保持一致。

#### 待评审决策

1. 项目维护的 JSON manifest 是否应作为规范来源，并仅用 OpenAPI 初始化操作清单？
2. 首个匹配切片只支持显式映射，还是同时支持部分字面 method/path 请求形式？
3. 应采用独立的 `trace-api` 命令，还是未来 review 命令中单独命名空间的投影？
4. 第一批 fixture 应覆盖哪些 JS/TS 请求客户端与测试库？
5. 是否提供内置场景模板作为可选建议，并且不自动把任何场景标记为必需？

这些决策获批之前，本提案不构成发布承诺、覆盖率目标、框架保证或实现任务。

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
