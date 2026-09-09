<div align="right"><strong>English</strong> · <a href="./README_ZH.md">简体中文</a></div>

# AI Test Auditor

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

> Do not trust AI-generated tests. Verify their static evidence.

AI Test Auditor is a local-first, source-only audit for deterministic signs of ineffective JavaScript and TypeScript tests. It reads test source; it does not import or execute it.

## Why AI Test Auditor?

Tests can look complete while failing to verify observable behavior. This tool surfaces narrow, source-backed signals of false confidence before a team relies on a test.

## Core capabilities and limits

It extracts direct Jest, Vitest, and Playwright callbacks and reports source-located `FAKE` or `WEAK` findings with remediation. It supports changed-file selection, optional mutation evidence, advisory policy, baseline comparison, advisory decision projection, and an explicit opt-in policy gate.

It does not run tests, inspect runtime behavior, invoke an LLM, calculate coverage, or infer production-code-to-test relevance. An unflagged test is `UNASSESSED`, never `STRONG`. FTR and Trust Score are prioritization aids, not release decisions.

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run build
node dist/cli.js review ./tests --format json
```

The installed package exposes the same command as `ata review [path]`. A source checkout uses `node dist/cli.js review [path]`.

Expected result: JSON lists extracted tests and any deterministic findings; exit `1` means at least one `FAKE`, while `0` does not prove tests are strong.

## Common workflows

```bash
# Select supported test files changed since a local ref.
node dist/cli.js review . --changed-since HEAD~1 --format json

# Add versioned evidence or advisory context without changing static meaning.
node dist/cli.js review ./tests --mutation-report ./mutation-report.json
node dist/cli.js review ./tests --policy ./audit-policy.json
node dist/cli.js review ./tests --baseline ./finding-baseline.json

# Project a strict advisory decision or evaluate an explicit gate.
node dist/cli.js decision ./decision-envelope.json
node dist/cli.js gate ./gate-policy.json ./audit-envelope.json
```

`--policy` is advisory: it reports disabled/active selection counts only and does not change findings, classifications, summary values, FTR, Trust Score, or exit semantics. Invalid policy input exits `2`; it is not a default CI gate or a release decision. `ata decision` is also advisory: a valid decision exits `0`, while invalid input exits `2`.

The explicit opt-in policy gate accepts only `mode: "gate"` with `blockOn: ["FAKE"]`: run it with `ata gate`. `WEAK does not block`; a pass is not evidence that tests are strong. The GitHub Actions reference workflow uses `base-ref`, `--changed-since`, and `contents: read`; it does not create PR comments.

## Results and exit codes

`FAKE` is deterministic syntactic evidence, `WEAK` is non-blocking context, and `UNASSESSED` means no static conclusion. FTR and Trust Score prioritize review work; they do not measure runtime quality.

| Code | Meaning                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------- |
| `0`  | No deterministic `FAKE` was emitted; this does not prove tests are strong.                     |
| `1`  | At least one deterministic `FAKE` was emitted.                                                 |
| `2`  | Invalid command, path, invalid policy input, input, or selected source, including `PARSER001`. |

## Project boundaries

The auditor never imports, executes, or evaluates reviewed source. It does not prove test strength, runtime quality, coverage, mutation score, or release readiness.

## Documentation

Read the [rule catalog](./docs/rules.md) before treating output as a release decision.

- [Requirements](./docs/requirements.md) · [中文](./docs/zh/requirements.md)
- [Architecture](./docs/architecture.md) · [中文](./docs/zh/architecture.md)
- [Roadmap](./docs/roadmap.md) · [中文](./docs/zh/roadmap.md)
- [Project Context](./docs/context.md) · [中文](./docs/zh/context.md)
- [Development](./docs/development.md) · [中文](./docs/zh/development.md)
- [Chinese implementation notes](./docs/history/implementation-notes.md)
- [Contributing](./CONTRIBUTING.md) · [中文](./CONTRIBUTING_ZH.md)

## Next

v1.0 is the current stable baseline. v2.0 is not delivered; its optional runtime, mutation, and AI/LLM directions are described only in the [Roadmap](./docs/roadmap.md).

## Contributing

See the [contribution guide](./CONTRIBUTING.md). Before opening a change, run:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [AGENTS.md](./AGENTS.md) for repository rules and [Development](./docs/development.md) for the full workflow.

## License

This project uses the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is not permitted; read the [official terms](https://polyformproject.org/licenses/noncommercial/1.0.0).
