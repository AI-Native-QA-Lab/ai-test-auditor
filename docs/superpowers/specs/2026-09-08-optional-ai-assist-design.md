# Optional AI Assist Layer (v2.0 Principles)

## Decision

Keep AI Test Auditor **static-first**. Treat optional model assistance as a **v2.0** concern that starts only after the **v1.0** opt-in quality gate is stable. Near-term work (v0.7–v1.0) stays source-only and does not implement live model calls.

This document records product principles and a two-phase contract. It is not a delivery claim and does not change v0.6.0 behavior.

## Placement relative to shipped versions

| Phase       | Status             | AI relationship                                                                                                               |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| v0.3        | Delivered          | Offline `--semantic-report` loader and provider-config validation only. No credentials read, no network, no model invocation. |
| v0.4–v0.6.0 | Delivered          | Mutation evidence, rule expansion, changed-file selection, advisory policy. No live AI.                                       |
| v0.7–v1.0   | Planned            | Baseline, CI-neutral adapter, GitHub examples, opt-in static gate. Gate inputs remain static/policy, never model conclusions. |
| v2.0        | Separately planned | Optional AI assist: phase A offline contract hardening, then phase B explicit live invocation.                                |

Current shipped version at the time of this decision: **v0.6.0**. The AI assist layer is **not** a v0.6 patch and is **not** inserted into v0.7–v1.0 delivery scope.

## Product premise

Static deterministic rules remain the primary detector for false-confidence patterns and are expected to address most practical cases when the rule set is strong enough. That coverage figure is a **product planning assumption**, not a measured public quality metric and must not appear as a tool claim.

AI is an optional assistant for the remainder: explanation and review hints that static rules cannot responsibly assert.

## Goals

1. Preserve a zero-network, no-credential default path that runs only deterministic AST rules.
2. Allow users to opt into AI assistance after v1.0 without changing the meaning of static findings.
3. Extend the existing semantic evidence channel rather than inventing a second classification system.

## Non-goals (through the first v2.0 AI slice)

- Detecting whether a test was authored by an AI.
- Upgrading `UNASSESSED` to `FAKE`, `WEAK`, `INVALID`, or `STRONG` because a model said so.
- Letting model output change FTR, Trust Score, static summary counts, or process exit codes.
- Using model output as a CI/PR blocking input.
- Executing reviewed tests, mutation commands, or coverage tools as part of AI assist.
- Implementing live providers before the offline contract and evaluation set are ready.

## Invariants

1. **Default off.** Without an explicit user/repository enablement path, the tool never reads API keys, opens network connections, or calls a model.
2. **Static ownership.** Rule engine findings and classifications remain the only deterministic audit result.
3. **Advisory isolation.** Model output is a separate evidence layer, labeled model/advisory.
4. **No borrowed classifications.** AI entries must not emit `FAKE`, `WEAK`, `STRONG`, or `INVALID`.
5. **Gate isolation.** v1.0 and later blocking decisions may use static findings and explicit repository policy only. Model assist is never a gate input unless a future major version revisits this invariant with a new design.
6. **No silent merge.** Reporters must keep static findings and AI assist in distinct sections/fields.

## Capability scope (approved)

When AI assist is enabled in v2.0, it may do both of the following, still advisory-only:

1. **Explain existing static findings** — clarify why a deterministic pattern looks like false confidence and suggest remediation.
2. **Review `UNASSESSED` tests** — provide review hints where no current rule fired. Absence of a hint, or presence of a hint, is not a quality endorsement.

## Output shape (approved)

AI assist entries are independent advisory records, shaped as an evolution of the v0.3 semantic inference contract:

- `filePath`, `line`
- optional `relatedRuleId` when explaining an existing static finding
- `kind`: `explain-finding` | `review-unassessed`
- `confidence`: `LOW` | `MEDIUM` | `HIGH`
- `summary`
- optional `remediation`
- provenance: provider/model/mode (`offline` | live provider id), and that the entry is advisory

Forbidden:

- classification fields using `FAKE` / `WEAK` / `STRONG` / `INVALID`
- folding into `summary.fake|weak|invalid`, FTR, Trust Score, or exit semantics
- deleting, demoting, or suppressing static findings

## Two-phase delivery inside v2.0

### Phase A — Offline contract hardening (no live calls)

- Version the assist artifact as an extension of `--semantic-report` (or a clearly versioned successor that remains load-only).
- Distinguish `explain-finding` vs `review-unassessed` entries in schema and reporters.
- Keep Skill/prompt assets aligned so external agents can produce the artifact without the CLI calling a model.
- Ship acceptance/rejection fixtures and bilingual boundary docs before any live path.

### Phase B — Explicit live invocation (after Phase A)

- Add an explicit opt-in switch (CLI and/or config). Default remains off.
- Only then may the tool read a configured credential environment variable and perform network I/O.
- Live mode must produce the same advisory artifact shape as Phase A and attach it without altering static results.
- Failure modes (missing key, provider error, timeout, malformed model output) are input/provider errors or empty advisory attachment; they must not fabricate static findings or flip exit codes except through documented invalid-input semantics for malformed artifacts.

## Switch and privacy boundary (Phase B intent)

- Enablement is explicit and local/repository-scoped; there is no implied always-on assistant.
- Reviewed source leaves the machine only when the user enables live mode.
- Documentation must state what is sent (test source and static finding context needed for the requested kinds) and what is never claimed (runtime proof, mutation kill, coverage).
- Provider configuration continues the v0.3 pattern: named provider, env var name, optional model; secrets are never hard-coded.

## Relationship to existing adapters

| Adapter                    | Role relative to this design                                                      |
| -------------------------- | --------------------------------------------------------------------------------- |
| Deterministic rules        | Primary detector; unchanged ownership of classifications.                         |
| `--semantic-report` (v0.3) | Mount point for Phase A offline assist artifacts.                                 |
| `--mutation-report` (v0.4) | Separate execution-evidence channel; not AI assist.                               |
| `--policy` (v0.6.0)        | Advisory rule selection counts only; not a model switch and not a gate by itself. |
| v1.0 opt-in gate           | Static/policy only; AI assist remains outside gate inputs.                        |

## Sequencing principles retained

1. Strengthen false-confidence static patterns before automating model review.
2. Keep deterministic evidence distinct from model inferences and execution evidence.
3. Prefer precision and explainability over rule count or model verbosity.
4. Keep any future gate opt-in until false-positive behavior is measured; model assist does not relax that bar.

## Near-term actions (this decision only)

1. Record this design under `docs/superpowers/specs/`.
2. Update public roadmap v2.0 wording so optional static-first AI assist is an explicit post-v1.0 boundary.
3. Record the decision in the bilingual process record.
4. Do **not** implement live providers, new CLI AI flags, or schema changes in v0.7–v1.0 unless a later maintainer decision revises this placement.

## Open points deferred to a future v2.0 implementation design

- Exact JSON schema version bump vs additive fields on semantic report v1.
- CLI flag / config key names for live enablement.
- Prompt packing limits, redaction, and max tests sent per invocation.
- Evaluation set size and pass criteria for explain vs unassessed review quality.
- Whether Skill-only offline generation remains a supported long-term path beside CLI live mode.
