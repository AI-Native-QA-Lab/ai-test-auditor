<div align="right"><strong>English</strong> · <a href="./zh/rules.md">简体中文</a></div>

# Rule Catalog

## Reading a finding

All v0.1 findings are syntactic, local, and high-confidence for the narrow pattern named by their ID. A message explains the observed pattern; it does not prove the whole test or application is defective. Use the remediation as a review starting point.

| ID     | Class | Severity | Deterministic trigger                                                                                          | Does not prove                                                              |
| ------ | ----- | -------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| UT001  | FAKE  | CRITICAL | Unit/Jest/Vitest callback contains no `expect(...)` call.                                                      | That an assertion-free test can never have value through another mechanism. |
| UT002  | FAKE  | CRITICAL | An `expect` matcher compares identical primitive literals.                                                     | That every constant assertion is unhelpful in its broader suite.            |
| UT003  | FAKE  | CRITICAL | The actual and expected expressions have identical TypeScript-AST structural text, preserving literal content. | That semantically equivalent but differently written expressions are safe.  |
| UT008  | FAKE  | CRITICAL | A `catch` block is empty or only logs to `console`.                                                            | That every catch with additional work handles errors correctly.             |
| UT011  | FAKE  | CRITICAL | Both sides of a matcher call the same callee with structurally identical arguments.                            | That all two-call comparisons are ineffective in every context.             |
| API001 | WEAK  | WARNING  | Every recognized assertion targets `response.status` or `response.statusCode`.                                 | That status-only is always inadequate for the endpoint.                     |
| E2E001 | FAKE  | CRITICAL | Playwright callback has no recognized `expect` call.                                                           | That an action-only journey cannot be useful for setup or exploration.      |
| E2E002 | WEAK  | WARNING  | Every recognized Playwright assertion uses `toHaveURL`.                                                        | That URL-only can never be an adequate journey outcome.                     |
| E2E004 | WEAK  | WARNING  | `page.waitForTimeout` receives a numeric literal.                                                              | That every fixed wait is avoidable in an external-system workflow.          |

## False-positive controls

- Rules operate only on extracted direct callbacks and never inspect execution results.
- `API001` and `E2E002` require the limited matcher to be the sole recognized assertion target.
- `E2E004` fires only for a literal numeric delay; variables are not flagged.
- Unflagged tests are deliberately `UNASSESSED`.

## Adding a rule

Write a minimal failing test, verify it fails for the missing behavior, then add the smallest AST predicate. Give the rule a stable namespace ID, an explicit evidence boundary in the message/remediation, and both positive and representative negative test cases. Update this catalog and the Chinese translation in the same change.
