# v0.9 GitHub Reference Workflow Design

## Decision

v0.9.0 adds a reference GitHub Actions workflow that demonstrates how a maintainer can run the existing deterministic audit and the v0.8 advisory decision adapter during pull-request review. The workflow preserves the current static `review` exit semantics: no `FAKE` findings exit `0`, one or more `FAKE` findings exit `1`, and invalid input or selected-source syntax exits `2`.

The reference is an example, not a CI gate product surface. `ata decision` remains advisory and exits `0` for valid envelopes; its recommendation never changes the workflow's final result. The workflow must not create PR comments or annotations, invoke GitHub APIs, load credentials, or execute reviewed source.

## Scope

- Add a separately named reference workflow under `.github/workflows/`; retain the repository's existing `ci.yml` unchanged.
- Trigger the reference on `pull_request` and explicit `workflow_dispatch` only. A manual run must provide a required `base-ref` input; a pull-request run uses `github.event.pull_request.base.sha` as the same local base reference.
- Use `permissions: contents: read`, Node 20, `npm ci`, and the locally built CLI.
- Check out full Git history, then capture `ata review . --changed-since "$BASE_REF" --format json` output as a local audit artifact without losing its exit code. This selects changed supported test files only; it does not infer production-code-to-test relevance.
- For audit exit codes `0` and `1`, project the audit result into a strict version `1` decision envelope, then run `ata decision` against it.
- Render the raw static-audit JSON and advisory-decision JSON in GitHub Actions job summary output.
- Re-emit the original static-audit exit code after rendering the summary.
- Add an end-to-end fixture test that proves the workflow sequence preserves exit codes and creates a valid decision only from a valid static snapshot.
- Synchronize package and CLI version metadata to `0.9.0`, English and Chinese public documentation, Skill assets, roadmap status, and bilingual process evidence after full validation passes.

## Workflow Contract

```text
pull_request / workflow_dispatch
        |
        v
checkout (read-only, full history) -> npm ci -> npm run build
        |
        v
ata review . --changed-since "$BASE_REF" --format json
        |
        +-- exit 2 --> fail with the original error; no decision output
        |
        +-- exit 0 or 1 --> project a strict v1 decision envelope
                                  |
                                  v
                           ata decision <envelope>
                                  |
                                  v
                    write audit + advisory decision to job summary
                                  |
                                  v
                  exit original review status (0 or 1)
```

`BASE_REF` is populated from the PR base SHA or the required manual input and passed as a quoted shell variable. The workflow needs `fetch-depth: 0` so that the local Git reference is available. This avoids a permanent failure from intentionally fake repository fixtures while preserving existing static failure behavior for newly selected supported test files.

The envelope projection is deliberately workflow-local. It does not alter the saved audit JSON, call a service, or add GitHub-specific fields to the stable v1 decision schema. It must create a new object with only `tests`, `findings`, and `summary` from the audit result. It may add `policy` only as `{ version: "1", id: audit.policy.id, mode: "advisory" }` and `baseline` only as `{ version: "1", id: audit.baseline.id }`. It must omit `diagnostics`, `selection`, `semantic`, `mutation`, and all other audit-result fields, because the decision envelope rejects unknown fields and has distinct policy/baseline context shapes.

## Failure Semantics

| Condition                                    | Decision generated | Workflow result | Meaning                                                                                 |
| -------------------------------------------- | ------------------ | --------------- | --------------------------------------------------------------------------------------- |
| No `FAKE` findings                           | Yes                | Success (`0`)   | The static audit did not report a `FAKE`; it does not prove tests are `STRONG`.         |
| One or more `FAKE` findings                  | Yes                | Failure (`1`)   | Existing static-audit behavior is preserved. The advisory decision is descriptive only. |
| Invalid command/input/selected source        | No                 | Failure (`2`)   | The audit result is invalid, so the workflow must not manufacture a decision.           |
| Invalid generated envelope or decision error | No usable decision | Failure         | The example is internally broken; this does not reinterpret static findings.            |

## Test Strategy

The workflow contract receives automated structural tests that inspect the checked-in YAML and fixture-driven sequence tests using controlled audit snapshots. Tests cover least-privilege permissions, allowed triggers, required manual `base-ref`, full-history checkout, PR-base-SHA selection, quoted `--changed-since` use, no GitHub token/API or PR-comment actions, audit-command capture, exact v1 envelope projection, decision invocation only after valid static audit statuses, summary rendering, and re-emission of audit exit `0`, `1`, and `2`. Fixture coverage includes a parser diagnostic, changed-file selection metadata, advisory policy, and baseline comparison so the tests prove those audit-only fields are omitted or mapped rather than passed through as invalid envelope fields.

Public-contract tests require matching English and Chinese markers for `0.9.0`, GitHub reference workflow, `pull_request`, `workflow_dispatch`, required `base-ref`, `--changed-since`, `contents: read`, advisory decision, original audit exit-code preservation, no PR comments, and source-only boundaries.

## Non-goals

- No GitHub API client, PR comment, check-run annotation, or credential access.
- No default blocking policy, waiver mechanism, release approval, or change to `ata review` or `ata decision` semantics.
- No execution/import of reviewed tests, runtime test results, coverage, mutation execution, LLM invocation, or `STRONG` classification.
- No modification of the existing repository-validation CI workflow.
