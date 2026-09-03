# AGENTS.md

## Project purpose

`ai-test-auditor` is a deterministic static analyzer for test source. v0.1 identifies narrow, source-backed signs of ineffective JavaScript and TypeScript tests. Do not describe it as a test runner, an LLM reviewer, a mutation-testing tool, or evidence that an unflagged test is strong.

## Scope and boundaries

- Supported source conventions: Jest, Vitest, and Playwright `test` / `it` callbacks in JS/TS/TSX files.
- Do not import, execute, or evaluate reviewed test source.
- Findings require a stable rule ID, classification, severity, confidence, source location, bounded message, remediation, and regression test.
- `FAKE` is reserved for deterministic syntactic evidence. Context-dependent hints must be `WEAK` or omitted.
- An unflagged test is `UNASSESSED`, never `STRONG`.
- Keep English public documentation primary and synchronize Chinese counterparts when public behavior changes.

## Working conventions

1. Read the related rule, its test, and [docs/rules.md](./docs/rules.md) before changing analysis behavior.
2. Add a focused failing test before production-rule changes; run it red, implement the smallest fix, then run it green.
3. Preserve unrelated working-tree changes. Do not reset, clean, or overwrite them.
4. Add process evidence to `docs/process/implementation-record.md` and its Chinese counterpart `docs/process/implementation-record_zh.md` for material decisions, validation commands, scope changes, and known limits.
5. Keep `test-quality-audit/` bilingual: English `SKILL.md`, Chinese `SKILL_ZH.md`, matching prompts, and maintained examples/evals.

## Commands

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

Run the relevant tests after every code change and the full command set before reporting completion. Never claim a check passed without fresh command output.

## Documentation rules

- State facts, assumptions, and future work separately.
- Do not invent quality percentages, execution results, coverage, mutation scores, integrations, or compatibility guarantees.
- Link only to paths that exist in this repository.
- Mermaid is preferred for editable architecture diagrams.

## Delivery

Do not commit, push, tag, or create a pull request unless the user explicitly asks. Keep CI limited to the documented local validation commands.
