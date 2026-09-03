# 贡献 AI Test Auditor

提交贡献即表示同意其受仓库的 [PolyForm Noncommercial License 1.0.0](LICENSE) 约束。

感谢你帮助提升测试质量证据。项目优先选择少量、可解释的规则，而不是宽泛但不可验证的结论。

## 提交前

1. 阅读 [AGENTS.md](./AGENTS.md)、[架构设计](./docs/zh/architecture.md) 与相关[规则说明](./docs/zh/rules.md)。
2. 明确改动属于确定性源码规则、文档、基准 fixture，还是未来能力接口。
3. 修改规则时先添加最小失败回归测试，再实现代码。
4. 只有语法本身构成确定性证据时才标为 `FAKE`；上下文相关的提示应标为 `WEAK` 或不输出。

## 本地检查

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

## 文档与 Skill

- 先维护英文主文档；行为、范围或公共用法变化时同步中文。
- 不得把计划中的 LLM、Mutation 或 CI Gate 说成已实现能力。
- 修改 `test-quality-audit/` 时同步中英文 Skill、Prompt、参考资料、示例、评估用例和元数据。
- 示例不得包含凭证、私有地址或虚构的执行证据。
