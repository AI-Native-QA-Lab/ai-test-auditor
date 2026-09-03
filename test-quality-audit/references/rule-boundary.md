# Rule Boundary

This Skill mirrors the current CLI scope. It can cite UT001, UT002, UT003, UT008, UT011, API001, E2E001, E2E002, and E2E004 only when their documented syntax is present. Read the repository [rule catalog](../../docs/rules.md) for triggers and exclusions.

| Classification  | Use only when                                                               |
| --------------- | --------------------------------------------------------------------------- |
| `FAKE`          | A documented deterministic false-confidence syntax pattern is visible.      |
| `WEAK`          | A documented limited-assertion or fixed-wait pattern is visible.            |
| Review question | More application context, expected behavior, or runtime evidence is needed. |
| `UNASSESSED`    | No documented deterministic rule visibly applies.                           |

Do not report `INVALID` for import, fixture, dependency, syntax, or runtime failures unless separately supplied parser/execution evidence exists. The current CLI does not generate that evidence.
