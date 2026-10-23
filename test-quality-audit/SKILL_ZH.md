---
name: test-quality-audit-zh
description: 当需要审查 JavaScript 或 TypeScript Unit、API、Playwright 或 Node `node:test` 测试源码中的虚假信心模式、无效断言或静态测试质量风险时使用。
---

# 测试质量审计

基于可追溯证据审查给定测试源码中的质量风险。核心问题是：**如果生产行为出错，这条测试真的会失败吗？**

## 范围

- 只对 [规则边界](./references/rule-boundary.md) 中已记录的源码模式使用确定性规则 ID。
- 只能把提供的源码与 CLI JSON/文本输出当作证据；不得声称测试已执行、import 已解析、行为被观察、覆盖率被统计或 mutation 被杀死。
- 将可选的 advisory 策略视为纯源码审计的输入：它可展示禁用/活跃选择计数，但不能移除静态发现项、改变分类或退出码、创建 CI 门禁或作发布决定。不得执行测试、模型或 mutation 命令。
- 将可选的 version `1` 基线只视为建议性的身份证据：历史发现项不代表已接受或已豁免，且不改变发现项、分类、分数、策略计数或退出码。
- 将 `ata decision` 输出仅视为版本化建议性摘要：它不是 CI 门禁、通过/失败结果、豁免或发布决定。
- 将 GitHub Actions 参考工作流仅视为纯源码建议性展示：其必填手动 `base-ref` 或 PR base SHA 选择变更测试，且不得创建 PR 评论或执行证据。
- 未命中的测试为 `UNASSESSED`，不是 `STRONG`。
- 将 `ata gate` 视为显式仅 FAKE 门禁：只有 `blockOn: ["FAKE"]` 有效；WEAK 永不阻断，且门禁不执行源码。
- 英文输出读取 [SKILL.md](./SKILL.md) 与 `prompts/test-quality-audit.md`。

## 流程

1. 确认框架、测试类型、给定源码和 CLI 报告；材料缺失时明确列为缺口。
2. 仅应用源码中可见的规则触发条件；规则 ID、行号、观察证据、分类、置信度和修复建议必须放在一起。
3. 对未被确定性规则覆盖的上下文问题，标为审查问题，不得标为 `FAKE`。
4. 使用 [中文 Prompt](./prompts/test-quality-audit-zh.md) 输出独立报告；格式参考 [示例](./examples)，校准时读取 [评估用例](./evals/cases.md)。

## 输出契约

依次输出：范围与证据、确定性发现项、审查问题、未审计边界、按优先级排序的下一步。明确区分静态证据与推断。

## 不要做

- 编造产品需求、期望值、测试执行结果、质量分数或生产缺陷。
- 没有已记录的确定性触发条件时将 `WEAK` 升级为 `FAKE`。
- 声称修改建议能证明测试会发现所有回归。

## v1.2 静态目录与 benchmark

当前 v1.2 目录包含 10 条 Unit、10 条 API、10 条 E2E 规则以及 `PARSER001`。使用 `ata benchmark` 或 `npm run benchmark` 检查版本化源码 fixture 与精确的 rule/classification 身份。benchmark 输出只表示 fixture 一致性，不是运行时质量、覆盖率、mutation、precision、recall 或发布证据。

`--locale en` 与 `--locale zh-CN` 本地化人类可读的 text 和 HTML。直接 Node `node:test` 回调会被识别为 `node-test`；只有源码中静态声明了 `node:assert` value binding 时，相关比较断言和单参数 `assert()` / `assert.ok()` 才会计为原生断言，也包括 `node:assert` 的命名 `strict` 导出。`node:test` 不假定存在未绑定的全局 `expect`。测试注册识别从受支持框架导入的 `test`/`it` 别名及各框架适用的 `.skip`、`.only`、`.concurrent`、`.failing`/`.fails`、Playwright `.fail`/`.fixme`、`.each`、`.skipIf`、`.runIf` 形式。回调参数可以引用同文件的函数声明或直接初始化为函数的变量；导入回调、任意别名、被遮蔽的绑定或存在静态写入的绑定不会被跟踪。Jest、Vitest 和 Playwright matcher 识别接受具名 `expect` 导入；也支持从 `@jest/globals`、`vitest` 或 `@playwright/test` 通过字面量 CommonJS 解构取得别名。matcher 链支持 `.not`、`.resolves` 和 `.rejects`；Vitest 与 Playwright 的 `expect.soft`/`expect.poll` 也会识别，但 polling 回调只解开简单返回表达式。规则遍历会跳过未调用的嵌套函数，并且只在调用早于可见绑定写入时跟踪静态可达的同作用域 helper 链，包括外层 suite 中被当前测试直接调用且与同文件兄弟测试隔离的 helper。Promise callback 仅在 primitive 字面量 `Promise.resolve`/`Promise.reject` 链被测试回调 await 或 return 时计入；当已知 settlement 使选中的 callback 不会执行、handler 被省略、返回基本字面量或 `finally` handler 结果为空时，都会保留已知状态。同时识别受支持 `expect.poll` 和 Playwright `expect(callback).toPass()` callback、直接 Array 字面量上能静态保证至少执行一次的部分 callback，以及运行次数可静态确认为正数的已导入 `fast-check` 默认/namespace `fc.assert(fc.property(..., callback))` 形式。若断言只位于接收者不透明的集合 callback 中，UT001/E2E001 会降为 `WEAK`；不会据此认定 callback 一定执行。Array `sort`/`toSorted`、任意方法和无法证明执行的 callback 不会被当作已执行。未绑定名称、源码中可静态识别的遮蔽（包括 namespace block）或重赋值，以及被直接替换的 namespace 方法不会被计入。重复函数调用最多标为 `WEAK`，不会标为 `FAKE`；UT003 对包含新建数组/对象/函数/class/RegExp/JSX 身份、属性/下标读取、可能触发类型转换的运算符、模板插值、展开或计算属性，或显式修改语法的相同表达式也降为 `WEAK`。赋给没有读取引用的局部变量的未 await page action 也只作为 `WEAK` 提示；简单赋值目标本身不算读取。matcher binding 保持为内部元数据，`expectBindings` 不会进入审计 JSON 或 version 1 decision envelope。审计器仍不会执行被审计源码，type-only import 也不算运行时断言。审计配置兼容没有 version 的旧文件并规范化为 version `1`，但会拒绝未知字段、空模式和不支持的 provider。JSON 继续是稳定的机器接口 schema。
