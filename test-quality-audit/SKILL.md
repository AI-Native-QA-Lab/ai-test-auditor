---
name: test-quality-audit
description: Use when reviewing JavaScript or TypeScript unit, API, or Playwright test source for false-confidence patterns, ineffective assertions, or static test-quality risks.
---

# Test Quality Audit

Review supplied test source for evidence-bounded test-quality risks. The central question is: **if production behavior is wrong, can this test actually fail?**

## Scope

- Use deterministic rule IDs only for source patterns documented in [the rule boundary](./references/rule-boundary.md).
- Treat supplied source and CLI output as evidence; do not claim tests were executed, imports resolved, behavior was observed, coverage was measured, or mutations were killed.
- An unflagged test is `UNASSESSED`, not `STRONG`.
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
