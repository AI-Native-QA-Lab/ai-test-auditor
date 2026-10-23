---
name: test-quality-audit
description: Use when reviewing JavaScript or TypeScript unit, API, Playwright, or Node `node:test` source for false-confidence patterns, ineffective assertions, or static test-quality risks.
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

## v1.2 static catalog and benchmark

The current v1.2 catalog contains 10 Unit, 10 API, and 10 E2E rules plus `PARSER001`. Use `ata benchmark` or `npm run benchmark` to check versioned source fixtures and exact expected rule/classification identities. Benchmark output is fixture conformance evidence only; it is not runtime quality, coverage, mutation, precision, recall, or release evidence.

`--locale en` and `--locale zh-CN` localize human-readable text and HTML. Direct Node `node:test` callbacks are identified as `node-test`; recognized Node comparisons and single-argument `assert()` / `assert.ok()` calls count as native assertions when a value binding from `node:assert` is statically declared, including its named `strict` export. An unbound global `expect` is not assumed for `node:test`. Test registration recognizes supported `test`/`it` import aliases and framework-specific `.skip`, `.only`, `.concurrent`, `.failing`/`.fails`, Playwright `.fail`/`.fixme`, `.each`, `.skipIf`, and `.runIf` forms. Callback arguments can reference same-file function declarations and variables initialized directly with a function; imported callbacks, arbitrary aliases, shadowed bindings, and bindings with statically visible writes are not followed. Jest, Vitest, and Playwright matcher recognition accepts named `expect` imports; literal CommonJS destructuring aliases are supported for `@jest/globals`, `vitest`, and `@playwright/test`. Matcher chains include `.not`, `.resolves`, and `.rejects`; Vitest and Playwright `expect.soft`/`expect.poll` are recognized, with polling callback unwrapping limited to simple returns. Rule traversal skips uncalled nested functions and follows statically reachable same-scope helper chains before visible binding writes, including directly called helpers declared in an enclosing suite while keeping sibling test callbacks isolated. It follows Promise callbacks only for primitive `Promise.resolve`/`Promise.reject` chains awaited or returned from the test callback; an intermediate handler preserves a known settlement when its selected callback cannot run for that settlement, is omitted, returns a primitive literal, or is an empty `finally` handler. Recognized `expect.poll` and Playwright `expect(callback).toPass()` callbacks, selected callbacks on direct Array literals with a guaranteed invocation, and imported default/namespace `fast-check` callbacks in `fc.assert(fc.property(..., callback))` with a statically established positive run count are also followed. A sole assertion inside an opaque collection callback downgrades UT001/E2E001 to `WEAK`; the callback is not assumed to run. Array `sort`/`toSorted`, arbitrary methods, and unproven callbacks are not treated as executed. Unbound names, statically visible shadowing (including namespace blocks) or reassignment, and directly replaced namespace methods are not counted. Repeated call expressions are at most `WEAK`, never `FAKE`; UT003 also downgrades identical-expression comparisons containing fresh array/object/function/class/RegExp/JSX identities, property/element reads, coercive operators, template interpolation, spread or computed-property evaluation, or explicit mutation syntax to `WEAK`. An unawaited page action assigned to a local with no read reference is also a `WEAK` signal; a simple assignment target alone does not count as a read. Matcher bindings remain internal metadata and `expectBindings` is not included in audit JSON or the version 1 decision envelope. The auditor still does not execute reviewed source, and type-only imports are not runtime assertions. Audit config accepts legacy files without a version and normalizes them to version `1`, but rejects unknown fields, empty patterns, and unsupported providers. JSON remains the stable machine-facing schema.
