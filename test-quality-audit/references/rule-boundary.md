# Rule Boundary

The GitHub Actions reference workflow uses `base-ref` to select changed source and may render an advisory result, but it never creates a PR comment or execution evidence.

This Skill mirrors the current CLI scope. It can cite UT001, UT002, UT003, UT004, UT008, UT011, API001, API002, E2E001, E2E002, E2E003, and E2E004 only when their documented syntax is present. Read the repository [rule catalog](../../docs/rules.md) for triggers and exclusions.

| Classification  | Use only when                                                               |
| --------------- | --------------------------------------------------------------------------- |
| `FAKE`          | A documented deterministic false-confidence syntax pattern is visible.      |
| `WEAK`          | A documented limited-assertion or fixed-wait pattern is visible.            |
| Review question | More application context, expected behavior, or runtime evidence is needed. |
| `UNASSESSED`    | No documented deterministic rule visibly applies.                           |

Do not report `INVALID` for import, fixture, dependency, syntax, or runtime failures unless separately supplied parser/execution evidence exists. The current CLI does not generate that evidence.

An optional version `1` policy (`id`, `mode: "advisory"`, and optional unique `disabledRuleIds`) is input to the source-only audit. It only presents disabled/active selection counts; it never executes test, model, or mutation commands, removes a finding, changes static classifications or exit semantics, becomes a CI gate, or makes a release decision.

An optional version `1` baseline records unique finding identities (`ruleId`, root-relative POSIX `filePath`, `line`, `classification`, and `severity`). Historical/new counts are advisory identity evidence only: historical findings are neither accepted nor waived and cannot change findings, classifications, scores, policy counts, or exit semantics.
