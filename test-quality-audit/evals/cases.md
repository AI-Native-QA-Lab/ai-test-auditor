# Skill evaluation cases

These cases are calibration inputs, not claims about a live application.

| Case              | Input pattern                                                     | Expected bounded response                                     |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `tautology`       | `expect(true).toBe(true)`                                         | One `UT002` `FAKE`; no statement about test execution.        |
| `status-only`     | API test only checks `response.status`                            | One `API001` `WEAK` plus a request for endpoint behavior.     |
| `no-finding`      | `expect(total).toBe(30)`                                          | `UNASSESSED` boundary; never `STRONG`.                        |
| `unknown-context` | `expect(response.body).toEqual(expected)` without product context | No invented expected behavior; list missing contract context. |
| `fixed-wait`      | `page.waitForTimeout(500)` and visible assertion                  | One `E2E004` `WEAK`, noting possible external-system context. |
