<div align="right"><strong>English</strong> · <a href="./zh/rules.md">简体中文</a></div>

# Rule Catalog

## Reading a finding

Rule findings are syntactic, local, and high-confidence for the narrow pattern named by their ID. A message explains the observed pattern; it does not prove the whole test or application is defective. Use the remediation as a review starting point.

| ID        | Class   | Severity | Deterministic trigger                                                                                          | Does not prove                                                              |
| --------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| UT001     | FAKE    | CRITICAL | Unit/Jest/Vitest callback contains no `expect(...)` call.                                                      | That an assertion-free test can never have value through another mechanism. |
| UT002     | FAKE    | CRITICAL | An `expect` matcher compares identical primitive literals.                                                     | That every constant assertion is unhelpful in its broader suite.            |
| UT003     | FAKE    | CRITICAL | The actual and expected expressions have identical TypeScript-AST structural text, preserving literal content. | That semantically equivalent but differently written expressions are safe.  |
| UT008     | FAKE    | CRITICAL | A `catch` block is empty or only logs to `console`.                                                            | That every catch with additional work handles errors correctly.             |
| UT011     | FAKE    | CRITICAL | Both sides of a matcher call the same callee with structurally identical arguments.                            | That all two-call comparisons are ineffective in every context.             |
| UT004     | WEAK    | WARNING  | Every direct assertion uses zero-argument `toBeDefined` or `toBeTruthy`.                                       | That existence or truthiness is never the intended unit contract.           |
| API001    | WEAK    | WARNING  | Every recognized assertion targets `response.status` or `response.statusCode`.                                 | That status-only is always inadequate for the endpoint.                     |
| API002    | WEAK    | WARNING  | Every direct assertion checks only `response.body` or `response.data` with an existence matcher.               | That body/data existence is always inadequate for the endpoint.             |
| E2E001    | FAKE    | CRITICAL | Playwright callback has no recognized `expect` call.                                                           | That an action-only journey cannot be useful for setup or exploration.      |
| E2E002    | WEAK    | WARNING  | Every recognized Playwright assertion uses `toHaveURL`.                                                        | That URL-only can never be an adequate journey outcome.                     |
| E2E003    | WEAK    | WARNING  | Every direct assertion uses zero-argument `toBeVisible`.                                                       | That visibility is never the intended journey outcome.                      |
| E2E004    | WEAK    | WARNING  | `page.waitForTimeout` receives a numeric literal.                                                              | That every fixed wait is avoidable in an external-system workflow.          |
| PARSER001 | INVALID | WARNING  | TypeScript reports a source parser diagnostic for a selected test file.                                        | That the test would fail or be invalid at framework runtime.                |

## False-positive controls

- Rules operate only on extracted direct callbacks and never inspect execution results.
- `API001` and `E2E002` require the limited matcher to be the sole recognized assertion target.
- `E2E004` fires only for a literal numeric delay; variables are not flagged.
- `UT004`, `API002`, and `E2E003` require every direct assertion to be the narrow zero-argument matcher pattern; modifiers, bare expects, and mixed assertions suppress the hint.
- `PARSER001` reports source syntax only; it does not execute, resolve, or type-check the test at runtime.
- Unflagged tests are deliberately `UNASSESSED`.

## Advisory policy boundary

## CI-neutral decision boundary

`ata decision` projects only validated static summary facts into a version `1` advisory decision. It rejects semantic/mutation attachments and unknown fields; policy/baseline IDs are context only. A valid decision returns `0`, but it is not a CI gate, waiver, release decision, or proof that unflagged tests are `STRONG`.

The v0.9 GitHub Actions reference workflow selects changed supported test files from a PR base SHA or manual `base-ref`, projects only allowed fields into `ata decision`, and preserves the static audit exit code. Its Job Summary is advisory; it creates no PR comments.

An optional `--policy` file is an input to this source-only audit. Its advisory `disabledRuleIds` affect only policy presentation and disabled/active selection counts. They never remove a finding or change a rule classification, severity, confidence, static summary, FTR, Trust Score, or exit code; policy is not a CI gate or release decision. Invalid policy input exits `2`.

## Adding a rule

Write a minimal failing test, verify it fails for the missing behavior, then add the smallest AST predicate. Give the rule a stable namespace ID, an explicit evidence boundary in the message/remediation, and both positive and representative negative test cases. Update this catalog and the Chinese translation in the same change.
