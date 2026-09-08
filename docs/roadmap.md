<div align="right"><strong>English</strong> · <a href="./zh/roadmap.md">简体中文</a></div>

# Roadmap

## Delivered MVP foundation

- Problem definition: ineffective / false-confidence tests.
- Source-only AST pipeline, deterministic rules, CLI, JSON/text reporting, transparent score/FTR.
- Jest/Vitest/Playwright direct callback support, benchmark fixtures, bilingual Skill, and CI foundation.

## Iteration plan

| Phase | Outcome                                                                             | Evidence required before claiming delivery                                      |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0.1   | Deterministic static-rule MVP.                                                      | Rule-level positive/negative tests and CLI fixtures.                            |
| 0.2   | More framework extraction and configuration, including explicit parser diagnostics. | Fixture corpus and compatibility matrix.                                        |
| 0.3   | Optional semantic review interface.                                                 | Versioned prompt/schema, disclosed model and evidence limits, evaluation set.   |
| 0.4   | Delivered: offline mutation-evidence adapter.                                       | Versioned schema, command/threshold provenance, parser and CLI contracts.       |
| 0.5   | Delivered: Unit/API/E2E rule expansion and changed-file selection.                  | Rule catalog, false-positive analysis, integration tests.                       |
| 0.6.0 | Delivered: advisory source-only audit policy presentation and selection counts.     | Public contracts and the full documented validation gate.                       |
| 0.7   | Planned: baseline comparison.                                                       | Separate maintainer decision, fixture evidence, and no delivery claim.          |
| 0.8   | Planned: CI-neutral adapter.                                                        | Separate maintainer decision, adapter contract, and no delivery claim.          |
| 0.9   | Planned: GitHub examples.                                                           | Separate maintainer decision, example validation, and no delivery claim.        |
| 1.0   | Planned: opt-in policy-gate integration.                                            | Opt-in configuration, CI samples, and documented failure semantics.             |
| 2.0   | Separately planned: runtime, mutation, and LLM adapters; optional static-first AI assist after v1.0. | Separate design, safety review, and implementation evidence; no delivery claim. |

## Sequencing principles

1. Define false-confidence patterns before automating them.
2. Keep deterministic evidence distinct from model inferences and execution evidence.
3. Prefer precision and explainability over a large rule count.
4. A CI gate must remain opt-in until stable, measured false-positive behavior exists.

v0.7 through v0.9 remain source-only and advisory, preserving the source-only/advisory boundary: they do not execute reviewed source or change the static meaning of findings. v1.0 remains source-only and is a stable explicit opt-in quality gate, blocking only when a repository policy enables it. v2.0 runtime, mutation, and LLM adapters require a separate design and evidence. Optional AI assist is static-first and post-v1.0 only: default off, advisory-only, never emits `FAKE`/`WEAK`/`STRONG`/`INVALID`, and never changes static summary, FTR, Trust Score, exit semantics, or gate inputs. See [`docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md`](./superpowers/specs/2026-09-08-optional-ai-assist-design.md).

## v0.2 compatibility matrix

| Framework  | Direct `test` / `it` | Nested suite names        | `test.each` / `it.each` | Parser diagnostics |
| ---------- | -------------------- | ------------------------- | ----------------------- | ------------------ |
| Jest       | Supported            | Supported                 | Supported syntax        | Supported          |
| Vitest     | Supported            | Supported                 | Supported syntax        | Supported          |
| Playwright | Supported            | `test.describe` supported | Not claimed             | Supported          |

`ata.config.json` may provide `include` and `exclude` arrays of test-file basenames. This is a narrow source-selection control, not a framework runtime configuration.

## v0.3 semantic-review contract

`--semantic-report <path>` loads a version `1` advisory JSON artifact. Default operation is offline. `semanticProvider` configuration accepts `offline`, `openai`, or `anthropic` plus an environment-variable name and optional model; v0.3 validates configuration but never reads keys or makes network calls. [`test-quality-audit/evals/semantic-report-v1.json`](../test-quality-audit/evals/semantic-report-v1.json) is the versioned acceptance/rejection corpus for this contract.

## v0.4 mutation-evidence contract

`--mutation-report <path>` loads a version `1` offline artifact containing an engine label, recorded command, threshold value and source, plus total/killed/survived mutant counts and a derived score. The command is provenance only and is never executed. The adapter validates counts and score consistency; a score below the recorded threshold is advisory, not a gate, and never changes static results or exit semantics.

## v0.6.0 advisory-policy contract

`--policy <path>` accepts a version `1` JSON object with a non-empty `id`, `mode: "advisory"`, and optional unique non-empty `disabledRuleIds`. It is input to the source-only audit and adds policy selection counts to the output without removing findings or changing static classifications, summary values, FTR, Trust Score, or exit semantics. Invalid policy input exits `2`; there is no default CI gate or release decision.

## Non-commitments

Dates, coverage targets, model providers, mutation engines, supported future frameworks, and gate thresholds are intentionally not committed in this roadmap. They need evidence and maintainer decisions.
