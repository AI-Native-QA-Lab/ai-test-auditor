# AI Test Auditor v0.3 Semantic Review Plan

**Goal:** Add an offline-first, versioned semantic-review contract with optional OpenAI and Anthropic provider configuration.

**Architecture:** Deterministic AST findings remain unchanged. A semantic report is a separately versioned JSON artifact, loaded only by `--semantic-report`; its inferences remain visibly separate and cannot change classifications, score, FTR, or exit codes. Provider configuration validates provider identity and environment-variable names but never reads credentials or performs network I/O without a future explicit invocation feature.

## TDD sequence

1. Write failing schema tests for valid/invalid semantic report payloads and provider config defaults; implement strict validation.
2. Write failing CLI tests for `--semantic-report` attachment and invalid-file exit semantics; implement the narrow CLI path.
3. Add a versioned evaluation corpus for supported and rejected semantic claims; update bilingual docs and process records.

## Constraints

- Default behavior is offline.
- No API key is read, logged, or transmitted in v0.3.
- OpenAI/Anthropic settings name a provider and environment-variable reference only.
- Semantic output is an inference, not deterministic or execution evidence.
- A semantic report never produces `STRONG`, changes static summary fields, or changes exit codes.
