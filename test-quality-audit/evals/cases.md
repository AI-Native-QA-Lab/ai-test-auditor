# Skill evaluation cases

These cases are calibration inputs, not claims about a live application.

| Case               | Input pattern                                                     | Expected bounded response                                                                                                                               |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tautology`        | `expect(true).toBe(true)`                                         | One `UT002` `FAKE`; no statement about test execution.                                                                                                  |
| `status-only`      | API test only checks `response.status`                            | One `API001` `WEAK` plus a request for endpoint behavior.                                                                                               |
| `no-finding`       | `expect(total).toBe(30)`                                          | `UNASSESSED` boundary; never `STRONG`.                                                                                                                  |
| `unknown-context`  | `expect(response.body).toEqual(expected)` without product context | No invented expected behavior; list missing contract context.                                                                                           |
| `fixed-wait`       | `page.waitForTimeout(500)` and visible assertion                  | One `E2E004` `WEAK`, noting possible external-system context.                                                                                           |
| `defined-only`     | Unit test only uses `toBeDefined()` / `toBeTruthy()`              | One `UT004` `WEAK`; request an observable value or effect.                                                                                              |
| `body-exists`      | API test only checks `response.body` existence                    | One `API002` `WEAK`; request endpoint content or effects.                                                                                               |
| `visible-only`     | E2E test only uses `toBeVisible()`                                | One `E2E003` `WEAK`; request a completed journey outcome.                                                                                               |
| `advisory-policy`  | Policy disables `UT002` with `mode: "advisory"`                   | State that source-only findings/classifications and exit semantics remain unchanged; report selection counts only, with no CI gate or release decision. |
| `baseline-history` | Baseline contains the identity for a current `UT002` finding      | Report it only as historical identity evidence; do not call it accepted, waived, resolved, or strong, and retain the static exit semantics.             |
