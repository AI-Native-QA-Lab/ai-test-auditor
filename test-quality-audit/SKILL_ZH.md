---
name: test-quality-audit-zh
description: 当需要审查 JavaScript 或 TypeScript Unit、API、Playwright 测试源码中的虚假信心模式、无效断言或静态测试质量风险时使用。
---

# 测试质量审计

基于可追溯证据审查给定测试源码中的质量风险。核心问题是：**如果生产行为出错，这条测试真的会失败吗？**

## 范围

- 只对 [规则边界](./references/rule-boundary.md) 中已记录的源码模式使用确定性规则 ID。
- 只能把提供的源码与 CLI JSON/文本输出当作证据；不得声称测试已执行、import 已解析、行为被观察、覆盖率被统计或 mutation 被杀死。
- 未命中的测试为 `UNASSESSED`，不是 `STRONG`。
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
