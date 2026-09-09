---
name: test-quality-audit
description: Use when reviewing JavaScript or TypeScript unit, API, or Playwright test source for false-confidence patterns, ineffective assertions, or static test-quality risks.
---

# Test Quality Audit

Review supplied test source for evidence-bounded test-quality risks. The central question is: **if production behavior is wrong, can this test actually fail?**

## Scope

- Use deterministic rule IDs only for source patterns documented in [the rule boundary](./references/rule-boundary.md).
- Treat supplied source and CLI output as evidence; do not claim tests were executed, imports resolved, behavior was observed, coverage was measured, or mutations were killed.
- Treat an optional advisory policy as input to the source-only audit: it can present disabled/active selection counts, but cannot remove static findings, change classifications or exit codes, create a CI gate, or make a release decision. Do not execute test, model, or mutation commands.
- Treat an optional version `1` baseline as advisory identity evidence only: historical findings are not accepted or waived and do not change findings, classifications, scores, policy counts, or exit codes.
- Treat `ata decision` output as a versioned advisory summary only: it is not a CI gate, pass/fail result, waiver, or release decision.
- Treat a GitHub Actions reference workflow as source-only advisory presentation: its required manual `base-ref` or PR base SHA selects changed tests, and it must not create PR comments or execution evidence.
- An unflagged test is `UNASSESSED`, not `STRONG`.
- Treat `ata gate` as an explicit FAKE-only gate: only `blockOn: ["FAKE"]` is valid; WEAK never blocks, and the gate never executes source.
- For Chinese output, read [SKILL_ZH.md](./SKILL_ZH.md) and `prompts/test-quality-audit-zh.md`.

## Workflow

1. Identify framework, test type, supplied source, and any CLI JSON/text report. Mark missing material as a gap.
2. Apply only rules whose syntactic trigger is visibly present. Keep finding ID, source line, observed evidence, classification, confidence, and remediation together.
3. For contextual concerns not covered by a deterministic rule, label them as a review question rather than a `FAKE` finding.
4. Use [the English prompt](./prompts/test-quality-audit.md) for a standalone audit response. Read [examples](./examples) for expected shape and [eval cases](./evals/cases.md) when calibrating the Skill.

## Output contract

Return, in order: scope and evidence, deterministic findings, review questions, unassessed boundaries, and prioritized next steps. Clearly distinguish static evidence from inference.

## Do not

- Invent product requirements, expected values, test execution results, quality scores, or production defects.
- Convert `WEAK` into `FAKE` without a documented deterministic trigger.
- Claim a recommendation proves an improved test will detect every regression.
