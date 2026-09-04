# AI Test Auditor v0.2 Implementation Plan

**Goal:** Make test discovery and AST extraction reliable for common nested and parameterized test syntax, with configured scope and explicit parse diagnostics.

**Architecture:** Preserve the v0.1 rule pipeline. Scanner configuration constrains candidate files; extractor returns both `TestCase` values and parse diagnostics; the audit service combines them into `INVALID` findings without claiming execution validity.

**Tech Stack:** Node 20, TypeScript compiler API, Vitest, JSON configuration.

## Constraints

- v0.2 supports Jest, Vitest, and Playwright source only.
- Diagnostics describe source parsing only; they do not assert that a test executes.
- Config paths are resolved relative to the config file; unsafe broad defaults are not introduced.
- New user-visible behavior is documented in English and Chinese.

## Tasks

1. Extend domain contracts with extraction outcomes and a source parser diagnostic; write failing type/extractor tests for invalid TypeScript and nested/parameterized tests.
2. Add `test.each` / `it.each`, `describe` ancestry, and Playwright `test.describe` extraction; preserve explicit callback locations and names.
3. Add an optional `ata.config.json` schema with `include` and `exclude`, `--config` resolution, globless deterministic filtering, and CLI diagnostics.
4. Add compatibility fixtures and matrices for Jest, Vitest, and Playwright; update bilingual guides, roadmap, rule boundary docs, process records, and CI validation.

## Validation

Run focused extractor/config/CLI tests first, then `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`, an actual configured CLI audit, and `git diff --check`.
