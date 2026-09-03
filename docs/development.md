<div align="right"><strong>English</strong> · <a href="./zh/development.md">简体中文</a></div>

# Development Guide

## Prerequisites

- Node.js 20+
- npm

```bash
npm install
```

## Daily workflow

1. Read `AGENTS.md`, the affected source, and its current test.
2. For behavior changes, write one focused test and run it to confirm the expected failure.
3. Implement the narrowest change and rerun that focused test.
4. Update English and Chinese docs plus Skill references when public behavior changes.
5. Record material choices, scope, and validation in `docs/process/implementation-record.md`.

## Commands

```bash
npm test                    # all Vitest contracts
npm test -- tests/core/rule-engine.test.ts
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

`npm run format` modifies files; use `format:check` for verification. The generated `dist/` output is ignored and should be rebuilt for CLI checks.

## Rule implementation checklist

- [ ] Positive and negative source snippets are covered by tests.
- [ ] Test failure was observed before implementation.
- [ ] Rule is confined to a deterministic AST pattern.
- [ ] Finding includes scope-bounded message and remediation.
- [ ] Rule catalog, Chinese catalog, README table, Skill reference, and benchmark fixtures remain accurate.

## CI

The GitHub workflow runs the same test, lint, typecheck, format check, and build commands under Node 20. It does not run reviewed benchmark sources as tests and does not make an external release decision.
