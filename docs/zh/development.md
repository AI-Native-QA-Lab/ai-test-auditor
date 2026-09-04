<div align="right"><a href="../development.md">English</a> · <strong>简体中文</strong></div>

# 开发指南

## 前置条件

- Node.js 20+
- npm

```bash
npm install
```

## 日常流程

1. 阅读 `AGENTS.md`、受影响源码和现有测试。
2. 对每个新功能、缺陷修复、重构或行为变更，先写一个聚焦测试，并运行确认预期 RED 失败。
3. 实现最小改动，重新运行聚焦测试直至 GREEN；只允许在测试保持绿色时重构。
4. 公共行为变化时同步英文、中文文档和 Skill 参考资料。
5. 将关键决定、范围、验证记录在 `docs/process/implementation-record_zh.md`，并与英文过程记录同步。

## 命令

```bash
npm test                    # 全量 Vitest 契约
npm test -- tests/core/rule-engine.test.ts
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

`npm run format` 会改写文件；验证使用 `format:check`。生成的 `dist/` 被忽略；CLI 检查前应重建。

## 规则实现清单

- [ ] 覆盖正例和反例源码。
- [ ] 实现前已观察到测试失败。
- [ ] 规则仅限定在确定性 AST 模式。
- [ ] Finding 信息和修复建议有明确边界。
- [ ] 规则目录、中英文目录、README 表、Skill 参考和 benchmark fixture 保持准确。

## 不可协商的 TDD 要求

- 在对应失败测试前，不得先写生产行为代码。
- 关键改动须在过程记录中保留聚焦 RED 与 GREEN 命令。
- 若测试在预期行为存在前已通过，它不是有效 RED 证据；实现前先修正测试。

## CI

GitHub workflow 在 Node 20 下运行同样的 test、lint、typecheck、format check 和 build。它不把 benchmark 源码当作被执行测试，也不作外部发布决策。
