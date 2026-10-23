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

## 2026-09-09 HTML 报告口径与中文提示

HTML 汇总将 `summary.total` 明确标注为“静态审计项”，并单独展示由 AST 提取的测试回调数；两者在存在解析诊断时可以不同，均不等同于测试运行器的注册实例数。中文报告同时显示分类和严重度的中文含义与稳定枚举值。`E2E001`–`E2E004` 的规则 ID 提供悬浮说明，但不改变规则判定、静态汇总、FTR、Trust Score 或退出码。

## 2026-09-09 Allure 风格静态审计工作台

HTML 报告按文件聚合发现项并显示数量，修复建议改为原生折叠详情；筛选后空文件组自动隐藏，并新增按分类导航与中文无障碍标签。该改动只优化离线展示，不执行测试、不引入 Allure 或网络依赖、不暴露测试源码，也不改变发现项、FTR、Trust Score 或退出码。

## 2026-09-10 输出路径提示

`review --output <path>` 默认保持标准输出干净；新增可选 `--print-output-path`，在报告原子写入成功后向标准错误输出绝对路径。该提示不改变报告内容、退出码或 JSON schema，便于调用方生成本地文件链接。

HTML 未指定 `--output` 时会写入当前目录的默认文件：英文为 `audit.html`，中文为 `audit-zh.html`。text 与 JSON 继续写入标准输出，避免破坏管道与结构化消费者。

## 2026-09-10 v1.1.0 发布版本

`v1.1.0` 汇集静态 HTML 审计报告的口径澄清、中文分类/严重度提示、规则 ID 悬浮说明、Allure 信息架构风格的离线工作台，以及 HTML 默认输出路径与可选绝对路径提示。它仍是源码静态审计：不会执行被审计测试，也不将未评估项解释为测试质量结论。

## 2026-09-10 报告可读性修复

规则 ID 的解释不能只依赖浏览器原生 `title`，因为部分报告查看器不会显示该提示。HTML 报告改为提供可见的悬浮和键盘焦点 tooltip；“按规则浏览”同时直接显示规则短解释。文件分组以文件名作为标题，完整路径降为可换行的次级信息，以保留溯源能力并减少长绝对路径对阅读层级的干扰。

中文 HTML 报告对 `E2E001`–`E2E004` 同时本地化问题说明和修复建议；JSON 与文本报告仍保留规则引擎的稳定原始消息，因此不会改变机器消费者或静态发现语义。

## 2026-09-10 v1.1.1 发布版本

`v1.1.1` 修复离线 HTML 报告在部分查看器中无法展示原生规则说明的问题，补足 E2E 规则导航、正文提示以及中文问题说明与修复建议，并优化文件路径的阅读层级。静态发现、原始分类、FTR 和 Trust Score 的计算语义保持不变。

## 2026-09-10 按框架静态口径

HTML 报告新增 Vitest、Playwright 与 Jest 的框架分组，分别展示 AST 提取的静态测试回调数及关联发现项数。报告明确运行器注册实例未执行、未统计：该分组不能替代 Playwright/Vitest 的 `--list` 或实际执行结果。发现项仍按源文件关联，无法可靠归属到已提取回调的异常诊断不被虚构分配到某个框架；静态发现、FTR、Trust Score 和退出码保持不变。

## 2026-09-10 后续路线图与 Project 治理

`v1.1.1` 已发布不代表旧版 v1.1 计划完成。因版本号已使用，未完成的稳定性、公开契约、配置与报告目标统一转入 `v1.2`，并与规则增强、证据质量和 benchmark 工作一起排期。当前规则基线为 Unit 6 条、API 2 条、E2E 4 条和 Parser 1 条；v1.2 可以增强这些审计，但每条新增规则均须保留确定性/静态边界并具有正反例、benchmark 与双语文档。

GitHub Project 是路线图的执行视图：卡片记录版本、边界、验收证据、风险和状态；它不替代路线图，也不得把设计卡或未验证工作表述为已交付。获得 `project` scope 后，已在 `naodeng` 下创建 [AI Test Auditor Roadmap](https://github.com/users/naodeng/projects/3)：包含 v1.2 的 7 张执行卡，以及 v1.5、v2.0–v2.7、v3.0、v3.x 的 9 张 Epic 卡。所有卡片均已写入路线图版本、工作类型、证据状态、风险与路线图状态。

## 2026-09-20 v1.2 规则扩充与验证

材料决策：v1.2 保持确定性、纯源码边界，将 Unit、API、E2E 各扩充到 10 条稳定规则；新增规则只接受有边界的 AST 证据，依赖上下文的提示保持 `WEAK`，未命中的测试保持 `UNASSESSED`。增加 version `1` benchmark manifest，用精确的 finding/classification 身份和明确的 `nonTriggers` 固定三类 fixture 契约；不执行 fixture 源码，也不引入运行时、网络、mutation 或模型证据。

已观察的验证链：规则目录先以 RED 暴露缺失的 ID 与版本行为，再以 GREEN 通过；Unit、API、E2E 新规则分别完成正反例 RED/GREEN；benchmark manifest、配置兼容性、locale、reporter 无障碍状态和双语文档契约均完成聚焦 RED/GREEN。`npm run benchmark` 已实际构建并通过 3 个 v1.2 fixture（Unit/API/E2E 各 1 个），每个 fixture 均比对精确 finding/classification 身份。

最终 fresh 门禁：`npm test` 通过 23 个测试文件、239 个测试；`npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、`npm run benchmark` 和 `git diff --check` 均通过。`node dist/cli.js review benchmarks --format json` 按既有约定以退出码 `1` 返回确定性 FAKE/WEAK 发现项，并非命令错误。

已知限制：本迭代证据仍是静态源码和 fixture 一致性证据，不代表真实运行时质量、覆盖率、mutation、precision、recall、业务验收、部署或发布完成。

## 2026-09-20 v1.2 review follow-up

审查发现并修复四项边界问题：空 benchmark manifest 不再以 `0/0 passed` 假通过；配置中的显式 `null` 不再被当作缺省 version/include/exclude；package manifest 读取或解析失败会转换为受控的输入错误和退出码 `2`；中英文 Context 标题与 v1.1.1 基线保持一致。

本次修复先为四类行为补充回归测试并观察到聚焦 RED（4 个新增失败断言），再做最小实现；聚焦 GREEN 为 3 个测试文件、55 个测试通过。修复后的 fresh 门禁为 23 个测试文件、239 个测试通过，lint、类型检查、格式检查、构建、benchmark 和 diff check 均通过；benchmark 为 3/3 fixture，通过 `review benchmarks` 返回的退出码 `1` 仍仅表示样例包含确定性 FAKE/WEAK 发现项。

## 2026-09-20 v1.2.0 发布版本

v1.2.0 正式完成并发布 v1.2 静态审计增强：Unit、API、E2E 各维护 10 条规则；增加 version `1` 的纯源码 benchmark corpus；加固配置、CLI 输入、报告本地化与文档契约；继续保持不执行被审计源码、不访问网络、不引入运行时、mutation 或模型证据的边界。

发布提交前再次通过 23 个测试文件、239 个测试，lint、typecheck、format、build、benchmark（3/3）和 `git diff --check`；`package.json` 与 `package-lock.json` 同步为 `1.2.0`。

## 2026-09-20 advisory workflow 退出语义修复

GitHub Actions run `35501372111` 的 checkout、依赖安装和 build 均通过，失败点是 advisory workflow 在成功生成审计与 decision summary 后继续执行 `exit "$audit_exit"`；改动测试先观察到该旧契约的 RED，再将 `.github/workflows/audit-reference.yml` 改为发现项仍写入 Summary 但以 `0` 完成。无效输入 `2` 仍失败，显式 `audit-gate-reference.yml` 的 gate 退出语义保持不变。

本次修复后的聚焦 workflow 测试为 5/5，完整测试为 23 个文件、239 个测试通过；lint、typecheck、format、build、benchmark（3/3）和 `git diff --check` 均通过。

## 2026-09-20 v1.2.1 发布版本

v1.2.1 是 v1.2.0 的补丁发布，包含 advisory GitHub Actions workflow 退出语义修复：发现项仍写入 Job Summary，不再让 advisory workflow 因静态 FAKE/WEAK 结果失败；无效输入 `2` 与显式 gate 语义保持不变。

发布提交前通过 23 个测试文件、239 个测试，lint、typecheck、format、build、benchmark（3/3）和 `git diff --check`；`package.json` 与 `package-lock.json` 同步为 `1.2.1`。

## 2026-09-27 Node 原生断言识别

背景决策：Node `node:test` 回调纳入框架识别，框架值为 `node-test`；直接 `assert(...)`、`assert.method(...)` 以及从 `node:assert` 静态声明的绑定作为可识别的原生断言。比较型原生断言复用 `UT002`、`UT003`、`UT011` 的既有静态规则；Node 测试仍保持 `type: "unknown"`，因为 `node:test` 本身不能证明测试属于 unit、API 或集成类型。封装和间接 helper 不作推断，保持 `UNASSESSED`；审计器不 import、执行或解析运行时依赖。

验证证据：先为 Node 框架提取和 `assert.strictEqual` 断言补充回归测试并观察到聚焦 RED（2 条失败）；最小实现后聚焦 GREEN 为 4 个测试文件、86 个测试通过。复核参数顺序时又补充“独立 actual/expected 不应误报”的回归测试并观察到 1 条 RED，修正后聚焦 GREEN 为 4 个测试文件、87 个测试通过。随后增加同名业务函数反例，观察到 1 条 RED 后收紧为直接 `assert` 调用，聚焦 GREEN 为 1 个测试文件、48 个测试通过。最终 `npm test` 通过 23 个测试文件、244 个测试，`npm run lint`、`npm run typecheck`、`npm run build`、`npm run benchmark`（3/3）和 `git diff --check` 通过；本次变更文件的 Prettier 检查通过。完整 `npm run format:check` 仍仅被既有未跟踪的 `.impeccable/hook.cache.json` 阻断，本次变更文件没有格式问题。

实际审计验证：构建后的 `node dist/cli.js review /Users/nao.deng/awsomeCode/dsh-qa/test --format json` 识别 264 个测试回调，其中 219 个为 `node-test`，没有产生 `UT001`；修正原生断言参数顺序后静态汇总为 1 个 `FAKE`、40 个 `WEAK`、223 个 `UNASSESSED`。这只证明当前源码模式被正确提取和评估，不代表 dsh-qa 的运行时质量、覆盖率、mutation 或业务验收。

## 2026-09-27 报告发现项卡片样式修正

Impeccable detector 指出离线 HTML 报告的 finding 卡片使用 4px 左侧彩色边框，形成典型 side-tab 视觉。该反馈判定为真实设计问题，已改为 1px 中性全边框，`FAKE` 仅使用较暗的边框色；没有新增 ignore 或压制规则。报告数据、分类、发现项、FTR、Trust Score 和交互行为保持不变。

验证：`tests/reporters.test.ts` 的 22 个测试、lint、typecheck、`git diff --check`、本次变更文件的 Prettier 检查均通过；手动 detector 对 `src/reporters.ts` 返回空结果。

## 2026-10-23 项目品牌图形

新增 `assets/favicon.svg` 与 `assets/github-social-preview.jpg`，并在中英文 README 的“项目素材”章节展示。图标以放大镜和源码行表达静态审阅；GitHub 社交预览使用深色扫描插画，并明确写出“source-only”定位，不暗示测试执行、LLM 审查或质量通过结论。社交图为 1280×640 JPEG，低于 GitHub 当前 1 MB 上传限制，可在仓库 Settings 的 Social preview 中上传；本次只准备 README 展示和素材，没有修改 GitHub 仓库设置。

## 2026-09-27 Node 原生断言绑定误报修复

审查发现：`node:assert` 的具名 import 或别名虽然是有效断言，却因回调源码不包含文件级 import 而被 `UT001` 判为 `FAKE`。修复将静态 `node:assert` 绑定作为可选 `TestCase` 元数据传入规则；它只记录 ESM 的 default、namespace 和具名绑定，不做模块解析或执行。封装和间接 helper 仍不被推断，旧的直接 `assert(...)` 与 `assert.method(...)` 识别保持不变。

验证链：先增加真实 extractor → rule-engine 回归并观察到 RED，随后最小实现后聚焦测试 GREEN；`npm test` 通过 23 个测试文件、245 个测试，lint、typecheck、build、benchmark（3/3）、`git diff --check` 和本次变更文件的 Prettier 检查均通过。完整 `npm run format:check` 仍只被既有未跟踪的 `.impeccable/hook.cache.json` 阻断。构建后的 dsh-qa 审计没有产生 `UT001`；这些结果只证明源码模式识别，不代表运行时质量或业务验收。

## 2026-10-14 Node 断言遮蔽误报与 CommonJS 识别修复

审查发现 Node 断言识别仍有边界缺陷：回调或外层词法作用域中的参数、局部声明遮蔽 ESM 导入的 assertion 名称时会按名称误命中；CommonJS 以字面量 `require('node:test')` 和 `require('node:assert')` 声明依赖时，Node 框架与 assertion 绑定未被识别；回调源码与文件作用域分离后，未绑定的文件级自定义 `assert` 名称及被重新赋值的 CommonJS assertion 别名也可能被误认。修复只接受静态绑定、按测试调用位置过滤外层遮蔽，并排除可见重赋值；不执行源码或调用 require。英文/中文 README、规则、架构和 Skill 同步说明这一支持边界。

RED/GREEN 证据：遮蔽回归先运行 `npx vitest run tests/core/extractor.test.ts`，观察到期望 `UT001`、实际却得到 `UT002`；作用域修复后同命令通过 10 个测试。CommonJS 回归再次运行同一命令，观察到框架仍为 `unknown` 且没有 native assertion bindings；实现后同命令通过 11 个测试。type-only import 回归第三次运行同一命令，观察到它被误识别为原生断言并产生 `UT002`；排除 type-only 绑定后同命令通过 12 个测试。补充的 switch 跨 case 遮蔽反例确认现有作用域检查已正确处理该语法，无需额外实现。后续文件级自定义 `assert` 与可变 CommonJS 绑定回归先运行 `npx vitest run tests/core/extractor.test.ts`，观察到两项期望 `UT001` 的用例都错误得到 `UT002`；增加文件级绑定和写入检查后，`npx vitest run tests/core/extractor.test.ts tests/core/rule-engine.test.ts` 通过 2 个文件、63 个测试。外层块级遮蔽回归再次运行 `npx vitest run tests/core/extractor.test.ts`，观察到期望 `UT001`、实际却得到 `UT002`；将遮蔽筛选放到完整文件中的测试调用位置后，同一聚焦命令通过 16 个测试，extractor 与 rule-engine 合计 64 个测试通过。

最终审查又发现 CommonJS assertion namespace 的方法可在源码中被直接替换。新增回归先运行 `npx vitest run tests/core/extractor.test.ts`，观察到期望 `UT001`、实际得到 `UT002`；忽略存在直接方法替换的 namespace 后，`npx vitest run tests/core/extractor.test.ts tests/core/rule-engine.test.ts` 通过 2 个文件、65 个测试。识别边界限于源码中可见的直接成员赋值、更新和删除，不推断经别名或动态 helper 发生的修改。

扫描器复核发现 Vitest 已排除 `.worktrees/`，但 audit scanner 仍会递归审计其中的 checkout；文件扩展名正则也在 scanner 和 audit 各维护一份。新增 `.worktrees` fixture 后运行 `npx vitest run tests/core/scanner.test.ts`，观察到 scanner 错误纳入工作树测试文件；加入共享 `isSupportedTestFile` 并忽略该目录后，`npx vitest run tests/core/scanner.test.ts tests/core/audit.test.ts` 通过 2 个文件、9 个测试。

本次最终验证：`npm test` 通过 23 个文件、255 个测试；lint、typecheck、build、`npm run benchmark`（3/3）、变更文件 Prettier 检查和 `git diff --check` 通过。namespace 方法替换检测按 TypeScript 的 `DeleteExpression` 节点实现，最终 typecheck 与 CLI 入口测试通过。全仓 `npm run format:check` 被本地 Git exclude 中 `.impeccable/hook.cache.json` 的格式问题阻断，该文件未修改。构建后 `node dist/cli.js review benchmarks --format json` 汇总 30 个测试（12 FAKE、9 WEAK、9 UNASSESSED），JSON 中包含 25 个 finding；命令按约定以退出码 `1` 结束，这是 fixture 中存在静态 findings 的预期结果。

审查记录补充：2026-09-27 前一条实现记录没有保存聚焦 RED/GREEN 命令；无法从记录中可靠还原，未补造历史命令。本次记录保留了实际观察到的命令和结果。

## 2026-10-14 既有规则识别与误报边界复核

本轮先复核 v1 已有识别与规则，不新增规则 ID 或测试框架类型。修正测试回调中的可执行语法遍历：直接调用的本地 helper 与常见 Promise/数组回调可参与判断，未调用的嵌套 helper 不再掩盖 `UT001` 或制造 API/E2E 断言；增加嵌套作用域遮蔽检查。完善 Jest、Vitest、Playwright、Node test 的静态绑定与修饰符识别，并收紧框架特有 modifier、`expect`/原生断言别名、静态 CommonJS require 和可见重赋值边界。现有 API 规则纳入 Node 原生比较断言，修复否定断言误报；E2E 规则补齐现代 Playwright async matcher、复合 class/id selector 判断和否定空值断言边界。scanner 与单文件审计共用测试文件识别，并跳过 `.worktrees/`。

回归采用 RED/GREEN：为 modifier 提取、文件级 `var` 遮蔽、Node API 断言、否定 API/E2E 断言、复合 selector、未调用 helper、现代 Playwright matcher、循环解构重赋值和嵌套块 helper 遮蔽等边界逐项增加测试；实现前对应回归观察到错误提取、缺失/多余 finding 或预期 `UT001` 被错误压制，实现后聚焦 extractor 与 rule-engine 测试通过 2 个文件、108 个测试。新增参数化回归确认 Jest globals、Vitest 与 Playwright 的 CommonJS `expect` 别名都会参与对应规则。基准语料从 3 个扩展为 7 个契约用例，新增 unit/API/E2E matcher 和 Node assert 用例，并为非触发模式设置明确契约；`npm run benchmark` 通过 7/7，没有 missing、unexpected 或 non-trigger violation。

最终验证：`npm test` 通过 23 个文件、298 个测试；`npm run lint`、`npm run typecheck`、`npm run build`、`git diff --check` 与全部本次变更文件的 Prettier 检查通过。全仓 `npm run format:check` 仍只报告本地 Git exclude 中的 `.impeccable/hook.cache.json` 格式问题，该缓存未修改。构建后 `node dist/cli.js review benchmarks --format json` 审计 37 个 fixture 测试，得到 14 个 `FAKE`、11 个 `WEAK`、12 个 `UNASSESSED`；命令以退出码 `1` 结束，因为被审计的 benchmark 本来包含 findings。该汇总用于确认 CLI 可审计这些 fixture，不是测试质量百分比或运行时质量证明。

边界：静态识别限于已知绑定、局部源码语法及有限的可执行回调/直接 helper；动态包装、运行时别名、外部 helper 的语义、测试实际执行结果和覆盖率仍不在本轮证明范围。English/Chinese README、规则、架构、路线图、benchmark 与 Skill 说明已同步本轮支持边界。

## 2026-10-14 同文件具名测试回调识别加固

继续完善既有框架提取，不新增规则 ID 或框架类型。原提取器只接收内联函数回调，漏掉 Jest、Vitest、Playwright 和 Node `node:test` 常见的 `test(name, callbackFunction)` 形式；新增同文件函数声明及直接以函数初始化的变量解析，并把可见作用域写入检查归入 `scope-analysis`。不解析导入函数或任意别名；遇到遮蔽、函数级 `var` 遮蔽、循环赋值或静态可见的重赋值时保留未评估边界。

RED/GREEN：新增正向测试覆盖同文件函数声明与函数变量，负向测试覆盖导入函数、参数遮蔽、函数级 `var`、变量/函数重赋值和循环赋值。运行 `npx vitest run tests/core/extractor.test.ts -t 'imported, shadowed, or reassigned callback identifiers'` 时，先观察到 3 个本应未提取的注册被错误解析；实现并收拢作用域写入逻辑后，`npx vitest run tests/core/extractor.test.ts tests/core/rule-engine.test.ts` 通过 2 个文件、110 个测试。

验证：`npm test` 通过 23 个文件、300 个测试；`npm run lint`、`npm run typecheck`、`npm run build`、变更文件 Prettier 检查与 `git diff --check` 通过；`npm run benchmark` 通过 8/8，无 missing、unexpected 或 non-trigger violation。构建后 CLI 审计 benchmark 的 38 个测试回调得到 15 个 `FAKE`、11 个 `WEAK`、12 个 `UNASSESSED`；退出码 `1` 是因为 fixture 含静态 findings。全仓 `npm run format:check` 只被 `.impeccable/hook.cache.json` 的格式问题阻断；该文件被本地 Git exclude 忽略，本轮未改动。

限制：named callback 仅处理同文件、直接函数绑定与有边界的静态作用域；动态包装、导入解析、任意别名、实际运行结果及覆盖率仍不在审计证据范围内。

## 2026-10-14 原生数组 callback 遍历边界加固

继续补强已有规则的可执行语法遍历，不新增规则或框架类型。`find`、`findIndex`、`findLast`、`findLastIndex`、`flatMap`、`sort` 和 `toSorted` 的内联 callback 之前被忽略，导致其中已有断言时仍可能错误产生 `UT001`。将这些名称纳入受限 Array callback 集合，并保留未知方法不自动视为会执行 callback 的负向控制。另发现静态空数组的 callback 确定不会运行；现在对可见的空 Array 字面量跳过其中 callback，避免内部断言掩盖 `UT001`。

RED/GREEN：`npx vitest run tests/core/rule-engine.test.ts -t 'native array|arbitrary methods'` 先观察到 7 个常见 Array callback 用例错误得到 `UT001`，未知方法负向控制通过；实现后规则遍历识别这些 callback。随后针对 `[].map(() => expect(1).toBe(1))` 的回归先观察到只产生 `UT002`、缺少 `UT001`；增加空数组保护后 `npx vitest run tests/core/rule-engine.test.ts` 通过 1 个文件、71 个测试。Playwright 规则测试也确认这些 callback 内的可识别 matcher 不会使 journey 被误判为无断言。benchmark 的 Unit fixture 加入 `Array.find` callback 正向样例。

验证：`npm test` 通过 23 个文件、310 个测试；lint、typecheck、build、变更文件 Prettier 检查与 `git diff --check` 通过；`npm run benchmark` 通过 8/8。构建后 CLI 审计 benchmark 的 39 个测试回调得到 15 个 `FAKE`、11 个 `WEAK`、13 个 `UNASSESSED`；退出码 `1` 是 fixture 含静态 findings 的预期结果。全仓 `npm run format:check` 仍只被本地 Git exclude 忽略的 `.impeccable/hook.cache.json` 格式问题阻断，该缓存未修改。

边界：callback 识别限于静态列出的 Promise、Array、polling 与 `toPass` 调用形式；不会推断任意方法的执行语义，也不会把空 Array 字面量内的 callback 当成有效断言。未命中的测试仍是 `UNASSESSED`，不代表运行时质量结论。

## 2026-10-14 可执行 callback 与既有规则误报复核

整体复核发现 callback 遍历只按方法名推断执行会漏掉自定义对象上的 `map`、`then`、`catch`、`poll`、`toPass` 等同名方法；相反，`sort` / `toSorted`、单元素无初始值 `reduce` 和全空位数组的 callback 并不保证运行。遍历现在只识别有语法证据的直接 Array 字面量 callback，以及返回或等待的 primitive `Promise.resolve` / `Promise.reject` 链；另识别已绑定的 Vitest / Playwright `expect.poll` 与 Playwright `expect(callback).toPass()`。同时修复 Playwright `toPass` callback 的 AST 位置识别。E2E005 现处理 `xpath=` 与 `css=` engine 前缀；Node 原生断言识别补充 `import { strict as assert } from 'node:assert'`，并排除 CommonJS object-rest 绑定造成的伪断言。

RED/GREEN：新增 callback 执行边界回归后，`npx vitest run tests/core/rule-engine.test.ts` 首次观察到 13 项失败，覆盖不确定数组/Promise/custom-method callback、engine-prefixed selector 与 `toPass` 内部 matcher；修正后与提取器回归合并运行，`npx vitest run tests/core/rule-engine.test.ts tests/core/extractor.test.ts` 通过 2 个文件、153 项。strict assertion 和 CommonJS rest 用例先运行 `npx vitest run tests/core/extractor.test.ts -t 'strict assertion export|CommonJS object rest binding'`，观察到 2 项失败，新增绑定约束后聚焦测试通过。另为 API005 否定属性断言补强元数据回归；代码已有 `isNegated` 保护，因此无需生产代码变更。

验证：最终 `npm test` 通过 23 个文件、345 项；`npm run lint`、`npm run typecheck`、`npm run build` 和 `npm run benchmark`（8/8）通过。构建后 `node dist/cli.js review benchmarks --format json` 审计 39 个 fixture 回调，汇总为 15 个 `FAKE`、11 个 `WEAK`、0 个 `INVALID`、13 个 `UNASSESSED`；退出码 `1` 是 benchmark fixture 含静态 findings 的预期结果。`git diff --check` 通过。全仓 `npm run format:check` 仍因本地 Git exclude 忽略的 `.impeccable/hook.cache.json` 格式问题退出 `1`，该缓存保持未修改；变更文件的 Prettier 检查另行验证。

边界：静态 callback 白名单不证明任意对象方法或运行时替换后的执行语义；Promise 推断限于源码中可见的原生 primitive resolve/reject 形式和直接返回/等待关系。漏识别的测试继续保持 `UNASSESSED`，不代表运行时质量结论。

## 2026-10-14 函数作用域 callback 写入检查加固

继续完善具名测试 callback 的既有解析边界，不新增规则 ID 或测试框架类型。复核发现，作用域写入检查覆盖了赋值表达式，却漏掉嵌套块中的 `var callback = ...` 初始化和 `for (var callback of ...)`。这些写入可能覆盖先前识别出的 callback，令审计使用不确定的旧函数体。解析器现在会拒绝这类有同一函数/模块变量作用域的 callback，同时区分嵌套函数自己的 `var` 绑定；class static block 等不同变量作用域不会污染外层判断。

RED/GREEN：`npx vitest run tests/core/extractor.test.ts -t 'nested var initializer'` 先复现了错误提取；加入初始化写入判断后该用例通过。`npx vitest run tests/core/extractor.test.ts -t 'var for-of initializer'` 再复现 `for...of` 变量目标漏判；补齐迭代声明检查后，与嵌套函数局部 `var` 负向控制、既有具名 callback 用例一起通过，聚焦结果为 1 个文件、4 个测试。

验证：`npm test` 通过 23 个文件、313 个测试；`npm run lint`、`npm run typecheck`、`npm run build` 通过；`npm run benchmark` 通过 8/8，无 missing、unexpected 或 non-trigger violation。构建后 CLI 审计 benchmark 的 39 个测试回调得到 15 个 `FAKE`、11 个 `WEAK`、13 个 `UNASSESSED`；退出码 `1` 是 fixture 含静态 findings 的预期结果。全仓 `npm run format:check` 仍只报告本地 Git exclude 忽略的 `.impeccable/hook.cache.json` 格式问题；变更文件 Prettier 检查和 `git diff --check` 通过。

边界：本修复只拒绝静态可见且处于相同变量作用域的写入；动态调用、运行时覆盖和 callback 实际执行结果仍不在静态证据范围内。

## 2026-10-14 E2E008 显式丢弃 matcher promise 识别

继续加固现有 Playwright 规则，不新增规则 ID。审查发现 `void expect(...).toHave...()` 明确丢弃异步 matcher Promise，但原 E2E008 只检查裸表达式语句，因此会漏报。现在将 `void` 直接包裹的已识别异步 matcher 纳入 E2E008；已等待的 matcher、同步 matcher，以及直接传给 `Promise.all` 的 matcher 调用均保持为不触发形式。英文/中文规则目录和现有 E2E matcher benchmark fixture 已同步这一边界。

RED/GREEN：新增 `void expect(page.getByRole('heading')).toBeVisible()` 回归后运行 `npx vitest run tests/core/rule-engine.test.ts -t 'E2E008 for direct unawaited matchers'`，先观察到只有 E2E003、缺少 E2E008；增加显式 `void` 判断后，`npx vitest run tests/core/rule-engine.test.ts -t 'E2E008 for direct unawaited matchers|recognizes unawaited Playwright async matchers'` 通过 1 个文件、2 个测试，原有 await 与 Promise.all 负向控制也通过。

验证：`npm test` 通过 23 个文件、313 个测试；lint、typecheck、build 通过；`npm run benchmark` 通过 8/8。构建后 CLI 审计 benchmark 的 39 个回调得到 15 个 `FAKE`、11 个 `WEAK`、13 个 `UNASSESSED`；退出码 `1` 是 fixture 含静态 findings 的预期结果。变更文件 Prettier 检查和 `git diff --check` 通过；全仓 `npm run format:check` 仍只报告本地忽略的 `.impeccable/hook.cache.json`。

边界：规则仍只识别直接表达式和显式 `void` 丢弃，不追踪赋值给变量后是否再被等待的 promise 生命周期；该限制避免将稍后正确 await 的变量误报。

## 2026-10-14 本地断言 helper 重赋值边界

继续校正既有规则遍历，不新增规则 ID 或测试类型。审查发现，本地函数 helper 即使在声明后、直接调用前被重新赋值，遍历器仍会因同 block 中存在同名调用而追踪原函数体；这会把已被替换的旧断言算作测试断言。现在只在直接调用之前没有静态可见的绑定写入时，才跟踪声明函数；调用之后的重赋值不会抹掉先前有效的直接调用。英文和中文规则说明已同步该边界。

RED/GREEN：新增声明后重赋值回归后运行 `npx vitest run tests/core/rule-engine.test.ts -t 'local assertion helper with a visible reassignment'`，观察到只有 `UT002`、缺少应有的 `UT001`。随后发现全作用域写入检查也会漏掉调用后才发生的重赋值；为此增加“调用早于重赋值仍计入原断言”的负向控制并观察到缺少断言 finding 的 RED。按具体写入位置比较后，`npx vitest run tests/core/rule-engine.test.ts -t 'directly called local assertion helper|local assertion helper with a visible reassignment|local assertion helper called before a later reassignment|uncalled helper shadowed'` 通过 4 个测试；重赋值前调用、重赋值后调用和嵌套遮蔽均分别保持预期识别。

验证：`npm test` 通过 23 个文件、315 个测试；`npm run lint`、`npm run typecheck`、`npm run build`、`npm run benchmark`（8/8）、本轮源码/测试/双语规则文档的 Prettier 检查与 `git diff --check` 通过。`npm run format:check` 仍只被本地 Git exclude 忽略的 `.impeccable/hook.cache.json` 格式问题阻断，该缓存未修改。构建后 CLI 审计 benchmark 的 39 个回调得到 15 个 `FAKE`、11 个 `WEAK`、13 个 `UNASSESSED`；退出码 `1` 是 fixture 含静态 findings 的预期结果。

边界：helper 仅在同一 block 中直接调用且绑定无静态可见写入时跟踪；动态重赋值与别名语义不作推断，未识别断言的测试仍按现有契约报告 `UT001`，未命中的测试仍为 `UNASSESSED`。

## 2026-10-14 整体 Review 缺陷修复

修复整体代码 Review 确认的四项问题：严格 decision envelope 现在接受并验证提取器输出的 `expectBindings`，避免 GitHub reference workflow 在合法审计结果上解析失败；具名 callback 的 `expect` 与 Node 原生断言可见性按 callback 定义处的词法作用域判定，不再按注册调用点误判；提取器跳过未调用函数和测试 callback 内的延迟注册，同时继续遍历 suite callback、立即调用函数及静态解析到的直接本地 helper，并识别 `describe.skip` / `describe.only` 等 suite 变体；英文和中文规则目录移除了表格中断行，使 UT012 之后的规则保持在同一张表内。没有新增规则 ID 或框架类型。

RED/GREEN：修复前，decision matcher metadata、具名 callback 的 shadowing 和未调用 helper 三类聚焦回归均观察到预期失败。实现后 `npx vitest run tests/core/extractor.test.ts tests/core/decision.test.ts` 通过 68 项；补充 parameter shadow、简洁箭头 helper、IIFE、suite helper 与嵌套 test registration 边界后，最终 `npm test` 通过 23 个文件、319 项。

验证：最终 `npm run lint`、`npm run typecheck`、`npm run build`、`npm run benchmark`（8/8）、本轮源码/测试/中英文规则文档的 `npx prettier --check ...` 和 `git diff --check` 通过。全仓 `npm run format:check` 仍因 `.impeccable/hook.cache.json` 格式问题退出 1；`git check-ignore -v` 确认该本地缓存由 `.git/info/exclude` 忽略，本轮未修改。构建后 `node dist/cli.js review benchmarks --format json` 审计 39 个回调，汇总为 15 个 `FAKE`、11 个 `WEAK`、0 个 `INVALID`、13 个 `UNASSESSED`；命令以 1 退出是 benchmark 中存在静态 findings 的既有语义。

边界：函数遍历只跟踪静态可解析的直接本地调用，不跟踪 helper 别名、动态调用或任意 callback API；未命中的测试仍为 `UNASSESSED`。decision envelope 只保留源码审计所需的绑定元数据，不据此推断运行时测试结果。

## 2026-10-14 整体 Review 边界校正与覆盖补强

继续审查现有规则的确定性边界，不新增规则 ID 或测试类型。UT003 对结构相同的两次求值保留 `FAKE` 仅限可由语法确定的情形；属性/下标读取、类型转换、模板插值、展开、显式修改，以及会创建新身份的数组、对象、函数、class、RegExp 和 JSX 表达式均降为 `WEAK`。Promise settlement 推断会保留已知 fulfilled 状态：若 `.catch()` callback 因该状态不可能执行，后续 `.then()` 中的断言不会被误判为不在测试 callback 内。E2E009 的 action 结果引用检查按词法绑定区分同名遮蔽与外层闭包读取，并且不把简单赋值左值当成读取。

RED/GREEN：为重复属性/下标读取、类型转换、新建身份和只写重赋值增加回归，修复前分别观察到 UT003 错误为 `FAKE`、E2E009 漏报；去掉 class/JSX 身份保护时回归再次失败，恢复后通过。已知 fulfilled Promise 经 `.catch(...).then(...)` 的回归先观察到 UT001 误报，修复后与 unknown settlement 控制一起通过。最终聚焦命令 `npx vitest run tests/core/rule-engine.test.ts -t 'side-effectful expression|fulfillment when a catch|E2E009 for explicit page actions without await'` 通过 1 个文件、3 个测试。

验证：`npm test` 通过 23 个文件、355 个测试；lint、typecheck、build 通过；benchmark 通过 12/12。构建后 `node dist/cli.js review benchmarks --format json` 审计 44 个 callback，得到 13 个 `FAKE`、17 个 `WEAK`、14 个 `UNASSESSED`、0 个 `INVALID`；退出码 `1` 是 fixture 含静态 findings 的预期语义，输出未包含内部 `expectBindings`。`git diff --check` 通过。全仓 `npm run format:check` 只因 `.impeccable/hook.cache.json` 格式问题退出 `1`；`git check-ignore -v` 确认其由本地 `.git/info/exclude` 忽略，未修改缓存；变更文件的 Prettier 检查通过。

边界：规则只判断源码中可见的表达式结构与变量读取；不会执行用户代码或推断页面 action 的运行时调度。`WEAK` 是风险提示，不表示断言必然失败或页面 action 必然竞态；未命中仍为 `UNASSESSED`。
