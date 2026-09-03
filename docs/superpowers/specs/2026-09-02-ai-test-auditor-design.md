# AI Test Auditor v0.1 Design

## Decision

Build a local-first TypeScript CLI and standalone QA Skill that audit source code, not test execution. The governing question is: **if production behavior is wrong, can this test actually fail?**

## Scope

v0.1 supports JavaScript and TypeScript test source that follows Jest, Vitest, or Playwright conventions. It reports deterministic, source-backed `FAKE`, `WEAK`, and `UNASSESSED` results. It does not execute tests, invoke an LLM, run mutation testing, or make release decisions.

## Architecture

```text
test files -> scanner -> TypeScript AST -> test extractor -> rule engine
                                                       -> findings -> score -> CLI / JSON
```

Framework discovery and extraction are separate from rules. Later semantic-review, coverage, mutation, git-diff, and CI adapters remain interfaces; they cannot silently alter deterministic results.

## Implemented-rule boundary

The initial rules are UT001/E2E001 (no assertion), UT002 (tautology), UT003 (self assertion), UT008 (swallowed error), UT011 (expected value uses the SUT), API001 (status-only), E2E002 (URL-only), and E2E004 (hard-coded sleep). Tests without a finding are `UNASSESSED`, never automatically `STRONG`.

## Contract

`ata review [path] [--type unit|api|e2e|auto] [--format text|json]` defaults to the current directory. It returns `0` with no FAKE finding, `1` with a FAKE finding, and `2` for invalid input. Fake Test Ratio is `fake / assessed * 100`; the transparent heuristic score deducts 25 per critical and 10 per warning finding.

## Delivery and controls

Use Node 20+, strict TypeScript, Vitest, ESLint, Prettier, and GitHub Actions. Preserve English-first README and a synchronized Chinese entry. Never execute arbitrary source fixtures, hard-code credentials, or claim runtime/semantic evidence the tool does not possess.
