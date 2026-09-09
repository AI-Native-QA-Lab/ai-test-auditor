# v0.9 GitHub Reference Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v0.9.0 as a tested GitHub Actions reference workflow that preserves static audit failure semantics while publishing a separate advisory decision.

**Architecture:** Keep the repository-validation workflow unchanged. Add a reference-only workflow and a small workflow-local Node script that projects raw review JSON onto the strict decision-envelope allowlist. The script owns envelope projection and is exercised with fixtures; the workflow owns GitHub triggers, least-privilege permissions, job-summary rendering, and re-emitting the original audit exit code.

**Tech Stack:** GitHub Actions YAML, Node.js 20 ESM, TypeScript/Vitest, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-09-v0-9-github-reference-workflow-design.md`

## Global Constraints

- Leave `.github/workflows/ci.yml` unchanged.
- Run only on `pull_request` and `workflow_dispatch`, with `permissions: contents: read`; manual runs require `base-ref`, while PR runs use the PR base SHA.
- Never create PR comments/annotations, use GitHub APIs/tokens, execute reviewed source, add a gate/waiver, or change `review`/`decision` semantics.
- Invoke `ata decision` only from an allowlisted v1 projection of an audit that exited `0` or `1`; preserve `review` exit `0`, `1`, or `2`.
- Keep public documentation English-first and synchronized with Chinese counterparts and Skill assets.
- Do not claim delivery or change roadmap state until the full documented validation gate passes.
- Do not commit, push, tag, or create a PR without explicit user authorization.

---

### Task 1: Test and implement strict workflow-local envelope projection

**Files:**

- Create: `.github/scripts/create-decision-envelope.mjs`
- Create: `tests/github-reference-workflow.test.ts`

**Interfaces:**

- Consumes: a file path containing `ata review --format json` output.
- Produces: stdout JSON exactly shaped as `DecisionEnvelope`: `{ version: '1', audit: { tests, findings, summary, policy?, baseline? } }`; exits nonzero on unreadable/malformed input.
- Used by: the reference workflow's decision step.

- [ ] **Step 1: Write failing fixtures and focused tests.**

In `tests/github-reference-workflow.test.ts`, create a temporary raw audit JSON fixture with valid `tests`, `findings`, `summary`, parser `diagnostics`, changed-file `selection`, advisory-policy evaluation, and baseline comparison. Run the script with `node .github/scripts/create-decision-envelope.mjs <fixture>` and assert the parsed result exactly equals:

```ts
{
  version: '1',
  audit: {
    tests: fixture.tests,
    findings: fixture.findings,
    summary: fixture.summary,
    policy: { version: '1', id: fixture.policy.id, mode: 'advisory' },
    baseline: { version: '1', id: fixture.baseline.id },
  },
}
```

Also assert that `diagnostics`, `selection`, `semantic`, and `mutation` are absent, and that passing the output to `parseDecisionEnvelope` succeeds. Add malformed JSON and missing-required-audit-field cases that assert a nonzero script exit and no partial stdout.

- [ ] **Step 2: Run the focused test to verify RED.**

Run: `npx vitest run tests/github-reference-workflow.test.ts`

Expected: FAIL because `.github/scripts/create-decision-envelope.mjs` does not exist.

- [ ] **Step 3: Implement the smallest projection script.**

Create an ESM script that reads exactly one positional input path, parses JSON, validates the presence of `tests`, `findings`, and `summary`, and prints only this object:

```js
const envelope = {
  version: '1',
  audit: {
    tests: audit.tests,
    findings: audit.findings,
    summary: audit.summary,
    ...(audit.policy
      ? { policy: { version: '1', id: audit.policy.id, mode: 'advisory' } }
      : {}),
    ...(audit.baseline
      ? { baseline: { version: '1', id: audit.baseline.id } }
      : {}),
  },
};
```

Write errors to stderr and return a nonzero exit without stdout. Do not import repository production modules or inspect any unallowlisted raw-audit field.

- [ ] **Step 4: Run the focused test to verify GREEN.**

Run: `npx vitest run tests/github-reference-workflow.test.ts`

Expected: PASS; the strict decision parser accepts the projection and rejects malformed script input.

### Task 2: Add and test the GitHub reference workflow

**Files:**

- Create: `.github/workflows/audit-reference.yml`
- Modify: `tests/github-reference-workflow.test.ts`

**Interfaces:**

- Consumes: the built local CLI and `.github/scripts/create-decision-envelope.mjs`.
- Produces: GitHub job-summary sections for static audit and advisory decision; job result equal to the original static-audit status.
- Preserves: existing `.github/workflows/ci.yml` behavior.

- [ ] **Step 1: Extend the test with failing workflow-contract assertions.**

Read `.github/workflows/audit-reference.yml` as text and assert it has `pull_request:` and `workflow_dispatch:` with a required `base-ref` input, top-level `permissions` with only `contents: read`, checkout `fetch-depth: 0`, Node 20 setup, `npm ci`, `npm run build`, PR-base-SHA/manual-input `BASE_REF` assignment, and quoted `node dist/cli.js review . --changed-since "$BASE_REF" --format json`. Assert it also calls the projection script and `node dist/cli.js decision`, captures audit status with `set +e`, skips projection and decision for status `2`, appends both named JSON sections to `$GITHUB_STEP_SUMMARY`, and finally exits with the captured audit status. Assert it has no `pull_request_target`, `github-token`, `GITHUB_TOKEN`, `gh `, `curl`, `actions/github-script`, `checks: write`, or `pull-requests: write`.

- [ ] **Step 2: Run focused tests to verify RED.**

Run: `npx vitest run tests/github-reference-workflow.test.ts`

Expected: FAIL because the reference workflow is absent.

- [ ] **Step 3: Write the reference workflow.**

Create `.github/workflows/audit-reference.yml` with a distinct workflow name, only the required triggers, a required `workflow_dispatch.inputs.base-ref`, `contents: read`, `actions/checkout@v4` with `fetch-depth: 0`, and `actions/setup-node@v4` with Node 20 and npm cache, then `npm ci` and `npm run build`. Set `BASE_REF` from `github.event.pull_request.base.sha` for PRs and from the manual input otherwise. Its audit shell step must use quoted `--changed-since "$BASE_REF"`, redirect JSON to a workspace file, and retain exit status. For audit statuses `0` and `1`, run the projection script, invoke `ata decision`, append fenced `audit.json` and `decision.json` sections to `$GITHUB_STEP_SUMMARY`, then `exit "$audit_exit"`. For status `2`, exit `2` before projection/decision; other unexpected statuses must fail with a bounded diagnostic.

- [ ] **Step 4: Run focused tests to verify GREEN.**

Run: `npx vitest run tests/github-reference-workflow.test.ts`

Expected: PASS; workflow structure proves least privilege, advisory-only output, valid projection, and original exit-code preservation.

### Task 3: Add bilingual public-contract coverage and documentation

**Files:**

- Modify: `src/docs-contract.ts`
- Modify: `tests/docs-contract.test.ts`
- Modify: `README.md`
- Modify: `README_ZH.md`
- Modify: `docs/requirements.md`
- Modify: `docs/zh/requirements.md`
- Modify: `docs/architecture.md`
- Modify: `docs/zh/architecture.md`
- Modify: `docs/development.md`
- Modify: `docs/zh/development.md`
- Modify: `docs/rules.md`
- Modify: `docs/zh/rules.md`
- Modify: `test-quality-audit/SKILL.md`
- Modify: `test-quality-audit/SKILL_ZH.md`
- Modify: `test-quality-audit/prompts/test-quality-audit.md`
- Modify: `test-quality-audit/prompts/test-quality-audit-zh.md`
- Modify: `test-quality-audit/references/rule-boundary.md`
- Modify: `test-quality-audit/examples/basic-audit.md`
- Modify: `test-quality-audit/examples/basic-audit-zh.md`
- Modify: `test-quality-audit/evals/cases.md`

**Interfaces:**

- Consumes: the workflow and its documented v1 envelope projection contract.
- Produces: synchronized English/Chinese statements that reference workflow use without calling it a gate or a source of `STRONG` evidence.

- [ ] **Step 1: Add failing bilingual document-contract markers.**

Extend `src/docs-contract.ts` with a v0.9 marker set for both language trees requiring: `0.9.0`, GitHub Actions reference workflow, `pull_request`, `workflow_dispatch`, required `base-ref`, `--changed-since`, `contents: read`, `ata decision`, advisory-only output, original static-audit exit code, no PR comments, and source-only/no-`STRONG` boundaries. Add `tests/docs-contract.test.ts` expectations only if the existing single contract test needs a clearer v0.9-specific assertion.

- [ ] **Step 2: Run documentation contract RED.**

Run: `npx vitest run tests/docs-contract.test.ts`

Expected: FAIL listing the missing v0.9 English/Chinese markers.

- [ ] **Step 3: Synchronize public prose and Skill materials.**

Document the new workflow path, required manual `base-ref` and PR-base-SHA selection, local artifact flow, strict projection allowlist, decision-validity condition, Job Summary output, exit `0`/`1`/`2` behavior, minimum permissions, and no-comment/no-token/no-execution boundary. Keep the command examples executable against a source checkout, state that a `FAKE` in selected changed tests still fails due to `review`, and state that `ata decision` never supplies a pass/fail or release decision. Add a bilingual Skill/eval example that forbids treating the workflow summary as execution evidence or a waiver.

- [ ] **Step 4: Run documentation contract GREEN.**

Run: `npx vitest run tests/docs-contract.test.ts`

Expected: PASS with all paired markers present and existing policy/baseline/decision markers retained.

### Task 4: Version, delivery evidence, and full verification

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `docs/roadmap.md`
- Modify: `docs/zh/roadmap.md`
- Modify: `docs/process/implementation-record.md`
- Modify: `docs/process/implementation-record_zh.md`

**Interfaces:**

- Produces: consistent `0.9.0` package/CLI version, delivered-roadmap entry only after verification, and bilingual observed RED/GREEN evidence.

- [ ] **Step 1: Change the version test first.**

Change the CLI-version expectation in `tests/cli.test.ts` from `0.8.0` to `0.9.0`.

- [ ] **Step 2: Run the version test to verify RED.**

Run: `npx vitest run tests/cli.test.ts`

Expected: FAIL because the package and CLI still identify as `0.8.0`.

- [ ] **Step 3: Synchronize version metadata and record evidence.**

Update `package.json`, the root package entry in `package-lock.json`, and `src/cli.ts` to `0.9.0`. After every required validation command passes, change both roadmap `0.9` rows from planned to delivered and add matching process-record entries containing the actually observed focused RED/GREEN commands, workflow-test result, full validation results, source-only/advisory boundary, and any unavailable external GitHub-hosted validation.

- [ ] **Step 4: Run focused regression checks.**

Run: `npx vitest run tests/cli.test.ts tests/github-reference-workflow.test.ts tests/docs-contract.test.ts`

Expected: PASS with version `0.9.0`, strict workflow projection, and synchronized public markers.

- [ ] **Step 5: Run the complete documented validation gate.**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
git status --short
```

Expected: all checks pass except the benchmark command, which must exit `1` with its deterministic findings; `git diff --check` passes; the final status identifies only task changes plus preserved pre-existing untracked files.

## Plan Self-Review

- **Spec coverage:** Task 1 implements the strict projection required by the review fix; Task 2 implements the separate least-privilege workflow and preserved exit semantics; Task 3 covers bilingual docs and Skill assets; Task 4 gates the version and delivery claim on full verification.
- **Placeholder scan:** Every task has concrete commands, exact files, and specified interfaces.
- **Type consistency:** The projection emits the exact `DecisionEnvelope` keys accepted by `parseDecisionEnvelope`; policy and baseline are converted from audit-result attachments to their decision-context shapes.
