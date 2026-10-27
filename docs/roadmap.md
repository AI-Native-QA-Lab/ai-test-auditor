<div align="right"><strong>English</strong> · <a href="./zh/roadmap.md">简体中文</a></div>

# Roadmap

## Current baseline

v1.2.1 is the current stable release. It is a deterministic, source-only audit of JavaScript and TypeScript test source, with an explicit opt-in `FAKE`-only policy gate; v1.2.1 also corrects the advisory GitHub Actions workflow exit semantics. A release number is not proof that every planned goal for that version was completed; a passing audit or gate is not proof that tests are strong.

## Delivered evolution

| Range       | Delivered outcome                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| v0.1–v0.3   | AST extraction, deterministic rules, CLI reporting, and offline evidence contracts.                                    |
| v0.4–v0.5   | Mutation-evidence input, Unit/API/E2E rule expansion, and changed-file selection.                                      |
| v0.6–v0.9   | Advisory policy, baseline, decision projection, and a least-privilege GitHub Actions reference workflow.               |
| v1.0        | Explicit opt-in `FAKE`-only gate with stable `0`/`1`/`2` failure semantics.                                            |
| v1.1–v1.1.1 | Offline HTML report usability, localization, stable output paths, and framework-scoped static summaries.               |
| v1.2.0      | Static audit rule completion, versioned benchmark corpus, configuration hardening, and reproducible validation.        |
| v1.2.1      | Advisory GitHub Actions workflow exit semantics and CI contract correction; static findings remain non-blocking there. |

Completed-version rationale is available in the Chinese [History](./history/product-evolution.md).

## Roadmap and GitHub Project operating model

This document is the detailed planning source. The [AI Test Auditor Roadmap GitHub Project](https://github.com/users/naodeng/projects/3) is its execution view: every card links to one roadmap version and includes scope, non-goals, acceptance evidence, documentation updates, and validation commands. A Project card is not a delivery claim.

Use fields `Work type` (`Epic`, `Design`, `Implementation`, `Documentation`, `Validation`), `Roadmap version`, `Roadmap status` (`Backlog`, `Ready for design`, `In progress`, `Blocked`, `Done`), `Evidence status` (`Not started`, `Design approved`, `Validated`, `Blocked`), and `Risk` (`Low`, `Medium`, `High`). Do not move a card to `Done` without recorded validation evidence.

## v1.2 — Static audit enhancement, completion, and evidence quality

`v1.2.0` completes the unfinished v1.1 foundation work because `v1.1`/`v1.1.1` version numbers were already used. It enhances existing audits and report capabilities while remaining source-only: no runtime execution, network use, semantic inference, or `STRONG` conclusion from an unflagged test.

### Rule baseline to strengthen

| Audit type | Implemented rules today                       | v1.2 direction                                                                                                                                                      |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit       | 10: `UT001`–`UT004`, `UT008`, `UT011`–`UT015` | Delivered conservative source patterns for bare expects, contradictory assertion counts, mock-only assertions, and snapshot-only assertions with negative controls. |
| API        | 10: `API001`–`API010`                         | Delivered bounded response metadata, request-echo, empty-result, and swallowed-request-error checks; context-dependent cases remain `WEAK`.                         |
| E2E        | 10: `E2E001`–`E2E010`                         | Delivered bounded selector, swallowed-error, conditional-assertion, await, page-action, and empty-result checks; context-dependent cases remain `WEAK`.             |
| Parser     | 1: `PARSER001`                                | Preserve its source-syntax-only meaning and its separation from runtime validity.                                                                                   |

The table is a current rule inventory, not a quality score or a promise of a fixed rule count. A new rule requires a reviewed design, focused RED/GREEN evidence, representative non-trigger cases, benchmark labels, rule catalog updates, and English/Chinese documentation in the same change.

The v1.2 benchmark manifest is a version `1` source-only contract. The `ata benchmark` command, also exposed through `npm run benchmark`, compares exact finding/classification identities for 10 Unit, 10 API, and 10 E2E rules, including explicit non-triggers. Benchmark output is fixture conformance evidence only; it is not runtime quality, coverage, mutation, precision, recall, or release evidence.

### v1.2 Project cards

| Card                                            | Type                    | Scope and completion evidence                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v1.2 / Rule inventory and public contract`     | Documentation           | Reconcile `Finding`, `Rule`, JSON output, CLI help, rule catalog, and bilingual Skill assets. Any schema/CLI compatibility change needs an explicit migration decision and regression coverage.                                                                                     |
| `v1.2 / Unit audit enhancement`                 | Design + Implementation | Select conservative Unit patterns after false-positive review; preserve `FAKE` for deterministic evidence and add focused positive/negative tests.                                                                                                                                  |
| `v1.2 / API audit enhancement`                  | Design + Implementation | Implement only statically visible API patterns with explicit exclusions; no claim that an endpoint, schema, or business state was executed or understood.                                                                                                                           |
| `v1.2 / E2E audit enhancement`                  | Design + Implementation | Implement conservative source patterns for selector stability, swallowed failures, and conditional assertions; preserve static boundaries and report accessibility.                                                                                                                 |
| `v1.2 / Benchmark contract and corpus`          | Design + Implementation | Version a fixture format containing source, expected findings, expected rule/classification, and explicit non-triggers. Label mismatch or unexpected findings must fail deterministically.                                                                                          |
| `v1.2 / Configuration and reporter enhancement` | Implementation          | Harden existing policy, baseline, mutation-report, output, locale, and changed-file inputs; improve offline report navigation, filtering, empty/error states, and source-only explanations without changing raw JSON/static semantics.                                              |
| `v1.2 / Reproducible validation`                | Validation              | Record RED/GREEN for material behavior changes and run the documented local gate plus the benchmark command. Report benchmark results as fixture conformance, not runtime quality, coverage, mutation score, precision, or recall unless a separate measurement design is approved. |

**Exit criteria:** the public contract and catalog agree with implementation; each touched rule has observed RED/GREEN and negative coverage; benchmark cases are versioned and reproducible; reports/configuration explain static boundaries; public English and Chinese documents are synchronized; `0`/`1`/`2` semantics and the `FAKE`-only gate remain unchanged.

## v1.5 — Evidence Contract

**Design gate:** independent design approval is required before implementation.

Define a versioned, source-attributed external-evidence envelope for semantic, mutation, runtime, coverage, requirement, and change inputs. It must preserve provenance, confidence, and schema validation. External evidence can be displayed or prioritized, but must never rewrite deterministic findings, classifications, FTR, Trust Score, exit semantics, or gate inputs.

Initial cards: `Evidence envelope design`, `Schema validator and fixtures`, `Reporter projection`, `Bilingual contract documentation`, `Compatibility validation`.

The under-review API scenario proposal below depends on this contract being able to keep requirement applicability, source-to-scenario links, assertion observations, runtime results, and provenance as separate evidence. This is a proposal for review, not approved v1.5 scope.

## v2.0 — Semantic Test Auditor

The runtime, mutation, and LLM adapters remain future evidence layers and are not delivered by v1.2.

**Design gate:** independent design approval and safety review are required.

Explore structured evidence about test intent, observed oracles, missing oracles, and surviving-bug hypotheses. Providers, credentials, network use, and execution must be explicit opt-ins; `--no-ai` remains supported. The result is review evidence, not a `FAKE` rewrite, `STRONG` classification, or default test generation.

## v2.1–v2.7 — Evidence-specific extensions

These versions each require an approved preceding evidence contract: v2.1 API semantic audit, v2.2 E2E semantic audit, v2.3 explicit mutation runtime, v2.5 Change-to-Test analysis, and v2.7 requirement traceability. They must use distinct evidence namespaces, not silently expand the static rule catalog or imply execution. Each Epic starts with a design, contract/fixture, report projection, and boundary-validation card.

### v2.1 proposal: API scenario traceability (under review)

**Status:** Draft for maintainer review. It is not approved, scheduled, or implementation-ready. The existing design gate remains in force.

#### Problem and current boundary

The current API rules evaluate one extracted test callback at a time. API001–API010 detect bounded assertion patterns such as status-only checks, existence-only body checks, request echoes, empty results, and swallowed request errors. They do not identify an API operation, define its required scenarios, or determine whether a test suite includes happy-path, invalid-input, authorization, not-found, conflict, boundary, or other applicable cases. See the [API rules](../src/rules/api.ts) and [rule catalog](./rules.md).

There is also a current classification limitation: the extractor marks Playwright callbacks as `e2e` and other supported callbacks as `unknown`; `--type auto` keeps that extracted value. Explicit `--type api` overwrites the type for every selected callback, which is coarse for a mixed directory. See the [extractor](../src/core/extractor.ts) and [review type handling](../src/core/audit.ts). The first work must characterize and improve this existing API path before adding suite-level scenario reporting.

#### Goals

- Distinguish per-test assertion quality from test-suite scenario traceability.
- Let a project state which scenarios are required, optional, not applicable, or not yet decided for each operation.
- Link statically visible tests to operations and scenarios with explicit evidence and uncertainty.
- Show whether recognized assertion evidence exists, separately from whether a test was executed and passed.
- Keep the existing static findings, classifications, FTR, Trust Score, exit codes, and `FAKE`-only gate unchanged.

#### Non-goals for the first slice

- Do not infer a universal scenario checklist for every endpoint. Authentication, pagination, idempotency, and other cases are operation-specific.
- Do not call an unlinked scenario a proven missing test when the source scan is incomplete or the test uses unsupported dynamic helpers.
- Do not claim that a source link proves a scenario ran, passed, or asserted the correct business result.
- Do not produce a scenario coverage percentage until the required-scenario denominator and evidence semantics have been reviewed and validated.
- Do not add Java parsing or reviewed-source execution, access networks or credentials, or use an LLM in the first API slice.

#### Proposed evidence model

Keep three evidence layers separate:

1. **Test quality:** existing static findings for an individual callback, such as API001 or API010.
2. **Scenario traceability:** operation and scenario references found in a reviewed manifest or statically recognized source. This reports association, not execution or correctness.
3. **Runtime evidence:** optional imported test results in a later, explicit adapter. A runtime result must retain its report source and must not alter static findings.

A versioned, project-owned JSON scenario manifest is the proposed normative input. OpenAPI may seed the operation inventory, but it does not define the project's required business scenarios. Each operation should use a stable `operationId` or project ID, HTTP method, and path. Each scenario should have an ID, applicability (`required`, `optional`, `not_applicable`, or `unknown`), and an optional rationale. Example:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "users.create",
      "method": "POST",
      "path": "/users",
      "scenarios": [
        { "id": "success", "applicability": "required" },
        { "id": "invalid-email", "applicability": "required" },
        {
          "id": "unauthenticated",
          "applicability": "not_applicable",
          "reason": "Public registration endpoint"
        }
      ]
    }
  ]
}
```

For each operation/scenario pair, report separate fields:

- **Source link:** `linked`, `candidate`, `no_source_match`, or `unassessed`.
- **Assertion observation:** `recognized`, `weak_only`, `none_recognized`, or `unassessed`; this does not judge business correctness.
- **Runtime result:** absent unless supplied by a separately versioned report adapter; never infer it from source.
- **Provenance:** manifest/spec version, scanned path set, source locations, mapping method, and any parser or unsupported-pattern limitation.

`no_source_match` is valid only for a complete, declared scan scope. A partial selection, parse diagnostic, unsupported request helper, dynamic endpoint, or ambiguous mapping must yield `unassessed` or `candidate`, not a definitive absence claim.

#### Proposed source-to-scenario mapping

Use the following evidence order, subject to a fixture-backed review of supported request clients:

1. Explicit test-to-operation/scenario mapping in the versioned manifest or a referenced mapping file.
2. Exact statically visible HTTP method and literal path recognized in a supported JS/TS request form.
3. Test title, file name, or indirect helper resemblance as a candidate only; never as a deterministic link by itself.

Dynamic paths, opaque wrappers, generated test cases, and multiple possible operations remain `candidate` or `unassessed`. One test may link to several scenarios only when explicit data or supported static syntax establishes that relationship. The implementation must not execute test code to resolve it.

#### Proposed sequence

| Stage                            | Scope                                                                                                                                                                  | Evidence to review                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Existing API path hardening   | Characterize `auto`, explicit `--type api`, and mixed directories; select conservative API identification signals; review current API rule positives and non-triggers. | Focused regression fixtures, including mixed API/unit tests and ambiguous/dynamic requests.                                             |
| 1. v1.5 evidence contract        | Define versioned operation/scenario inputs, source-link states, applicability, provenance, and strict separation from runtime results.                                 | Schema fixtures for valid, invalid, partial-scan, and unknown-applicability cases.                                                      |
| 2. v2.1 JS/TS traceability slice | Build an operation-by-scenario report from the manifest and supported static request forms; preserve the current `ata review` JSON contract.                           | Labeled fixtures with happy path, negative, boundary, not-applicable, ambiguous, and unsupported cases; exact non-trigger expectations. |
| 3. Later runtime adapter         | Consider importing test execution results only after the evidence contract is approved; keep it opt-in and separately attributed.                                      | Compatibility and provenance checks proving runtime inputs cannot rewrite static findings or gate behavior.                             |

The initial report should be a separate, versioned traceability result (candidate CLI: `ata trace-api <tests> --contract <manifest>`), rather than adding inferred coverage claims to existing review JSON. The command name and presentation remain open for review. Java can consume the same language-neutral scenario contract later through a separate language extractor; Java is not part of this v2.1 slice.

#### Acceptance evidence

- API classification behavior is documented for `auto`, explicit type selection, and mixed directories; ambiguous cases stay unassessed.
- Every scenario result names its source link state, assertion observation, scan scope, and evidence provenance.
- Required scenarios without a source match are phrased as “no source match in the scanned scope,” never as proof that no test exists.
- Static scenario traceability does not change rule IDs, `FAKE`/`WEAK`/`UNASSESSED`, current JSON review semantics, scores, exit codes, or gate inputs.
- Fixtures include positive links, negative controls, ambiguous mappings, unsupported clients, incomplete scans, parser diagnostics, and not-applicable scenarios.
- English and Chinese contract, CLI, examples, and limitations remain aligned before implementation is considered complete.

#### Decisions for review

1. Is a project-owned JSON manifest the right normative source, with OpenAPI used only to seed operations?
2. Should the first matching slice support explicit mappings only, or also selected literal method/path request forms?
3. Should this be a separate `trace-api` command, or a separately namespaced projection from a future review command?
4. Which JS/TS request clients and test libraries should be represented in the first fixture corpus?
5. Should any built-in scenario templates be offered as optional suggestions, with no scenario automatically marked required?

Until these decisions are approved, the proposal does not add a release commitment, coverage target, framework guarantee, or implementation task.

## v3.0 — AI QA Agent and v3.x languages

**Design gate:** both are Epics, not implementation-ready features. Only after the evidence contracts are proven can an agent collect explicit evidence, challenge hypotheses, and present an uncertainty-labelled assessment. Additional languages are evaluated one at a time using language-specific extractors and fixtures while keeping evidence and assessment layers language-independent.

## Planning rules

- This Roadmap is the only detailed source for future version plans; README and Context summarize or link it, and GitHub Project mirrors execution state.
- Prefer explainable, source-backed evidence over rule-count growth.
- `FAKE` remains deterministic; contextual hints remain `WEAK` or omitted.
- Runtime, network, credentials, and CI gates remain explicit opt-in.
- Finding and assessment are separate layers; future evidence cannot silently change static conclusions.

## Non-commitments

No dates, providers, mutation engines, thresholds, coverage targets, future framework support, or compatibility guarantees are committed without maintainer decisions and validation evidence.
