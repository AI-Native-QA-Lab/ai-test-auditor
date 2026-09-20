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

## v2.0 — Semantic Test Auditor

The runtime, mutation, and LLM adapters remain future evidence layers and are not delivered by v1.2.

**Design gate:** independent design approval and safety review are required.

Explore structured evidence about test intent, observed oracles, missing oracles, and surviving-bug hypotheses. Providers, credentials, network use, and execution must be explicit opt-ins; `--no-ai` remains supported. The result is review evidence, not a `FAKE` rewrite, `STRONG` classification, or default test generation.

## v2.1–v2.7 — Evidence-specific extensions

These versions each require an approved preceding evidence contract: v2.1 API semantic audit, v2.2 E2E semantic audit, v2.3 explicit mutation runtime, v2.5 Change-to-Test analysis, and v2.7 requirement traceability. They must use distinct evidence namespaces, not silently expand the static rule catalog or imply execution. Each Epic starts with a design, contract/fixture, report projection, and boundary-validation card.

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
