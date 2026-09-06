# v0.5 Implementation Plan

**Goal:** Deliver the roadmap's Unit/API/E2E expansion and changed-file selection.
**Architecture:** Preserve extraction/scoring; add narrow category predicates and a read-only Git selection adapter before extraction.
**Tech Stack:** TypeScript AST, Node child_process execFile, Commander, Vitest.

## Task 1 — Rules

- [x] Add `tests/core/v05-rules.test.ts`: UT004/API002/E2E003 positives, mixed-content negatives, modifiers, missing assertions, types and line locations.
- [x] Run `npm test -- tests/core/v05-rules.test.ts`; observe missing-rule assertion failures.
- [x] Update `src/rules/unit.ts`, `api.ts`, `e2e.ts`, and `utils.ts` with the documented all-assertions predicates.
- [x] Rerun focused tests; existing rule tests must stay green.

## Task 2 — Selection and CLI

- [x] Add `tests/changed-selection.test.ts` using real isolated Git repositories and `runCli` to cover the design selection/error matrix and report metadata.
- [x] Run focused tests and observe unknown-option/missing-selection failures.
- [x] Create `src/core/changed-files.ts`; integrate `changedSince` in `src/core/audit.ts`, the CLI option in `src/cli.ts`, optional selection metadata in `types.ts`, and human-readable scope in `reporters.ts`.
- [x] Rerun focused tests plus full suite. Add any discovered edge regression before fixing it.

## Task 3 — Delivery contract

- [x] Update the version test to 0.5.0, observe RED, then synchronize package, lockfile and CLI versions.
- [x] Synchronize English/Chinese README, rule catalog/false-positive analysis, requirements, architecture, development, roadmap, Skill boundaries/prompts/evals and process records.
- [x] Format touched files only. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`, `node dist/cli.js review benchmarks --format json`, and `git diff --check`.
- [x] Verify built CLI changed-selection and version/help; record actual outcomes and final Git status. Leave changes uncommitted as required by AGENTS.md.
