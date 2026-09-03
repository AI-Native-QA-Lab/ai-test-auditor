# Contributing to AI Test Auditor

Contributions are accepted under the repository's [PolyForm Noncommercial License 1.0.0](LICENSE).

Thank you for improving test-quality evidence. This project values a small number of explainable rules over broad, unverified claims.

## Before opening a change

1. Read [AGENTS.md](./AGENTS.md), [architecture](./docs/architecture.md), and the affected entry in the [rule catalog](./docs/rules.md).
2. State whether the proposal is a deterministic source rule, documentation, fixture, or future-work interface.
3. For a rule change, add a minimal failing regression test before the implementation.
4. Keep the rule classification bounded: use `FAKE` only when syntax itself is deterministic evidence; use `WEAK` for limited assertions; otherwise do not emit a finding.

## Local checks

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

## Documentation and Skill changes

- Update English documentation first and synchronize its Chinese counterpart when public behavior changes.
- Do not turn planned LLM, mutation, or CI-gate work into a current capability claim.
- For `test-quality-audit/`, maintain the English and Chinese Skill, prompts, references, examples, eval cases, and metadata together.
- Examples must not contain credentials, private endpoints, or fabricated execution evidence.

## Pull request checklist

- [ ] Scope is limited to the stated problem.
- [ ] A deterministic behavior change has a focused regression test.
- [ ] Rule message and remediation state the static-analysis boundary.
- [ ] Required English/Chinese documentation is synchronized.
- [ ] All local checks above have been run.
