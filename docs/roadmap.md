<div align="right"><strong>English</strong> · <a href="./zh/roadmap.md">简体中文</a></div>

# Roadmap

## Current baseline

v1.0 is the current stable baseline. It is a deterministic, source-only audit of JavaScript and TypeScript test source, with an explicit opt-in `FAKE`-only policy gate. A passing audit or gate is not proof that tests are strong.

## Delivered evolution

| Range     | Delivered outcome                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------ |
| v0.1–v0.3 | AST extraction, deterministic rules, CLI reporting, and offline evidence contracts.                    |
| v0.4–v0.5 | Mutation-evidence input, Unit/API/E2E rule expansion, and changed-file selection.                      |
| v0.6–v0.9 | Advisory policy, baseline, decision projection, and least-privilege GitHub Actions reference workflow. |
| v1.0      | Explicit opt-in `FAKE`-only gate with stable `0`/`1`/`2` failure semantics.                            |

Completed-version rationale is available in the Chinese [History](./history/product-evolution.md).

## v2.0 — pending design direction

v2.0 is not delivered. It may add explicit runtime, mutation, and LLM adapters only after separate design approval, safety review, and implementation evidence. The retained [optional AI assist design](./superpowers/specs/2026-09-08-optional-ai-assist-design.md) is a planning input, not a delivery claim.

Future adapters must remain optional and must not execute reviewed source by default, read credentials implicitly, or call networks without explicit design and user control. They must not change static findings/classifications, FTR, Trust Score, existing exit semantics, or explicit gate inputs.

## Planning rules

- This Roadmap is the only detailed source for future version plans; README and Context summarize or link it.
- Prefer explainable, source-backed evidence over rule-count growth.
- `FAKE` remains deterministic; contextual hints remain `WEAK` or omitted.
- CI gates remain explicit opt-in.

## Non-commitments

No dates, providers, mutation engines, thresholds, coverage targets, future framework support, or compatibility guarantees are committed without maintainer decisions and validation evidence.
