<div align="right"><strong>English</strong> · <a href="./README_ZH.md">简体中文</a></div>

# AI Test Auditor

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

> Static analysis for JavaScript and TypeScript tests, without running them.

AI Test Auditor is a local-first, source-only audit for narrowly defined signs of ineffective tests. It reads supported test source and reports evidence for human review.

## Why AI Test Auditor?

Tests can look complete without checking observable behavior. AI Test Auditor helps reviewers find source patterns that may create false confidence before relying on a test.

## Core capabilities and limits

- Supports Jest, Vitest, Playwright, and Node `node:test` `test` / `it` callbacks.
- Reports source-located `FAKE` findings and `WEAK` hints with remediation.
- Supports changed-file review, optional mutation evidence, advisory policy, baselines, decision projection, HTML reports, and an explicit opt-in policy gate.
- Does not run tests, invoke an LLM, calculate coverage, or infer production-code-to-test relevance. An unflagged test is `UNASSESSED`, never `STRONG`.

`FAKE` is deterministic source evidence. `WEAK` is a contextual hint. FTR and Trust Score prioritize review; they do not measure runtime quality.

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run build
node dist/cli.js review ./tests --format json
```

The JSON report lists extracted tests and findings. Exit code `1` means at least one `FAKE` finding was emitted. An installed package also exposes `ata review <path>`.

## Common workflows

```bash
# Review supported test files changed since a local ref.
node dist/cli.js review . --changed-since HEAD~1 --format json

# Add optional evidence or advisory context.
node dist/cli.js review ./tests --mutation-report ./mutation-report.json
node dist/cli.js review ./tests --policy ./audit-policy.json
node dist/cli.js review ./tests --baseline ./finding-baseline.json

# Generate a local HTML report.
node dist/cli.js review ./tests --format html --locale zh-CN --output audit-zh.html

# Project an advisory decision or run the opt-in FAKE-only gate.
node dist/cli.js decision ./decision-envelope.json
node dist/cli.js gate ./gate-policy.json ./audit-envelope.json

# Check the versioned source fixtures.
npm run benchmark
```

`--policy` is advisory, is not a default CI gate, and does not change findings or classifications. Invalid policy input exits `2`. Review configuration details are in the [requirements](./docs/requirements.md). `--locale` localizes text and HTML; JSON keeps its stable schema and English messages.

The v1.2 catalog has 10 Unit, 10 API, and 10 E2E rules. `ata benchmark` checks fixture conformance against source examples; it does not measure code coverage or runtime quality.

`ata decision` is advisory: a valid decision exits `0`, and it is not a CI gate. Run the explicit opt-in policy gate with `ata gate`; it accepts only `mode: "gate"` with `blockOn: ["FAKE"]`. WEAK does not block, and a passing gate does not prove tests are strong. The GitHub Actions reference workflow uses `base-ref`, `--changed-since`, and `contents: read`; it does not create PR comments.

## Results and exit codes

| Code | Meaning                                                                                 |
| ---- | --------------------------------------------------------------------------------------- |
| `0`  | No deterministic `FAKE` was emitted; this does not prove tests are strong.              |
| `1`  | At least one deterministic `FAKE` was emitted.                                          |
| `2`  | Invalid command, path, invalid policy input, or selected source, including `PARSER001`. |

## Project boundaries

The auditor never imports or executes reviewed source. It does not prove test strength, runtime quality, coverage, mutation score, or release readiness. Read the [rule catalog](./docs/rules.md) before using findings in a release decision.

## Documentation

- [Rules](./docs/rules.md) · [Requirements](./docs/requirements.md) · [Architecture](./docs/architecture.md)
- [Project context](./docs/context.md) · [Roadmap](./docs/roadmap.md) · [Development](./docs/development.md)
- [Contributing](./CONTRIBUTING.md) · [中文](./CONTRIBUTING_ZH.md)
- [Chinese implementation notes](./docs/history/implementation-notes.md)

## Next

v1.2.1 is the current stable release. Roadmap items beyond the current release are not delivered features; see the [Roadmap](./docs/roadmap.md).

## Contributing

See the [contribution guide](./CONTRIBUTING.md). Before opening a change, run:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [AGENTS.md](./AGENTS.md) for repository rules and the [development guide](./docs/development.md) for the full workflow.

## License

This project uses the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is not permitted; read the [official terms](https://polyformproject.org/licenses/noncommercial/1.0.0).
