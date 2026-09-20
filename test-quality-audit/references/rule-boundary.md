# Rule Boundary

The GitHub Actions reference workflow uses `base-ref` to select changed source and may render an advisory result, but it never creates a PR comment or execution evidence.

This Skill mirrors the current CLI scope. It can cite all 31 catalog IDs: UT001–UT004, UT008, UT011–UT015, API001–API010, E2E001–E2E010, and PARSER001, only when their documented syntax is present. Read the repository [rule catalog](../../docs/rules.md) for triggers and exclusions.

The v1.2 additions remain source-only and bounded: request echoes, metadata-only API checks, empty results, unstable selectors, swallowed Playwright errors, conditional assertions, direct unawaited matchers, unawaited page actions, and empty UI values are not runtime conclusions. `ata benchmark` compares versioned fixture `expectedFindings` and `nonTriggers`; benchmark conformance is not execution evidence.

| Classification  | Use only when                                                               |
| --------------- | --------------------------------------------------------------------------- |
| `FAKE`          | A documented deterministic false-confidence syntax pattern is visible.      |
| `WEAK`          | A documented limited-assertion or fixed-wait pattern is visible.            |
| Review question | More application context, expected behavior, or runtime evidence is needed. |
| `UNASSESSED`    | No documented deterministic rule visibly applies.                           |

Do not report `INVALID` for import, fixture, dependency, syntax, or runtime failures unless separately supplied parser/execution evidence exists. The current CLI does not generate that evidence.

An optional version `1` policy (`id`, `mode: "advisory"`, and optional unique `disabledRuleIds`) is input to the source-only audit. It only presents disabled/active selection counts; it never executes test, model, or mutation commands, removes a finding, changes static classifications or exit semantics, becomes a CI gate, or makes a release decision.

An optional version `1` baseline records unique finding identities (`ruleId`, root-relative POSIX `filePath`, `line`, `classification`, and `severity`). Historical/new counts are advisory identity evidence only: historical findings are neither accepted nor waived and cannot change findings, classifications, scores, policy counts, or exit semantics.

An explicit gate policy uses `mode: "gate"` with `blockOn: ["FAKE"]`. The FAKE-only gate consumes a strict static snapshot, never executes source, and never blocks on WEAK.
