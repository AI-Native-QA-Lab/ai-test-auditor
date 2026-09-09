# v1.0 Opt-in Policy Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v1.0.0 as a strictly validated, source-only, explicit `ata gate` command that blocks only deterministic `FAKE` findings.

**Architecture:** Keep `review` as the full static-audit producer and `decision` as an always-advisory projection. Add a separate gate-policy parser and gate evaluator: the evaluator consumes the existing strict `DecisionEnvelope`, rejects a snapshot containing `INVALID`, and otherwise maps only the validated static summary into a compact pass/block result. A separate least-privilege GitHub Actions example captures the non-zero `review` result before projecting its output and returning the gate result.

**Tech Stack:** TypeScript 5, Node.js 20+, Vitest, Commander, GitHub Actions YAML, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-09-v1-opt-in-policy-gate-design.md`

## Global Constraints

- The only valid `blockOn` value is the one-item array `["FAKE"]`; `WEAK`, `INVALID`, `STRONG`, and `UNASSESSED` must never become blockers.
- `INVALID` in an otherwise structurally valid static snapshot is a gate-input error: no JSON output and exit `2`.
- Do not change `ata review` static results/exit codes or `ata decision` advisory results/valid-input exit code.
- Never execute reviewed source, read credentials, call GitHub APIs, run model/mutation commands, or use semantic/mutation data as gate input.
- Keep English public prose primary and synchronize every mapped Chinese public document and Skill asset.
- Do not change roadmap state to delivered until every documented validation command has completed successfully.
- Do not commit, push, tag, or create a PR without explicit user authorization.

---

### Task 1: Strict gate policy contract

**Files:**

- Create: `src/core/gate-policy.ts`
- Modify: `src/core/types.ts`
- Create: `tests/core/gate-policy.test.ts`

**Interfaces:**

- Produces `GatePolicy = { version: '1'; id: string; mode: 'gate'; blockOn: readonly ['FAKE'] }`.
- Produces `GatePolicyError`, `parseGatePolicy(value: unknown): GatePolicy`, and `loadGatePolicy(path: string): Promise<GatePolicy>`.
- Consumed by `createGateResult` in Task 2 and the `ata gate` command in Task 3.

- [ ] **Step 1: Write failing policy-parser tests.**

  Create `tests/core/gate-policy.test.ts`. Assert that `parseGatePolicy` returns the exact policy for:

  ```ts
  {
    version: '1',
    id: 'repository-static-fake-gate',
    mode: 'gate',
    blockOn: ['FAKE'],
  }
  ```

  Add `it.each` cases for missing `id`, whitespace `id`, `version: '2'`, `mode: 'advisory'`, `blockOn: []`, `['WEAK']`, `['FAKE', 'WEAK']`, `['FAKE', 'FAKE']`, `['INVALID']`, and an unknown top-level field. Each must throw `GatePolicyError`. Add malformed and absent temporary files that make `loadGatePolicy` reject with `GatePolicyError`.

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `npx vitest run tests/core/gate-policy.test.ts`

  Expected: FAIL because `src/core/gate-policy.ts` does not exist.

- [ ] **Step 3: Implement the minimal parser and loader.**

  Add the `GatePolicy` type to `src/core/types.ts`. In `src/core/gate-policy.ts`, use `readFile(path, 'utf8')` and `JSON.parse`, accepting only an object whose own keys are exactly `version`, `id`, `mode`, and `blockOn`; require a trimmed non-empty ID and exactly one `FAKE` item. Normalize every file/read/parse failure to `GatePolicyError('Gate policy cannot be read: <path>')`; keep structural validation errors bounded and deterministic. Do not import or alter `policy.ts`.

- [ ] **Step 4: Run the focused test to verify GREEN.**

  Run: `npx vitest run tests/core/gate-policy.test.ts`

  Expected: PASS; only the exact v1 `FAKE` policy is accepted.

### Task 2: Gate evaluator and compact result contract

**Files:**

- Create: `src/core/gate.ts`
- Modify: `src/core/types.ts`
- Create: `tests/core/gate.test.ts`

**Interfaces:**

- Consumes `GatePolicy` and the existing `DecisionEnvelope` parsed by `parseDecisionEnvelope`.
- Produces `GateResult = { version: '1'; mode: 'gate'; status: 'passed' | 'blocked'; reasonCodes: readonly ['NO_STATIC_FAKE_FINDINGS'] | readonly ['STATIC_FAKE_FINDINGS']; staticSummary: Pick<AuditSummary, 'fake' | 'weak' | 'invalid'>; policyId: string }`.
- Exposes `GateError` and `createGateResult(policy: GatePolicy, envelope: DecisionEnvelope): GateResult`.

- [ ] **Step 1: Write failing evaluator tests.**

  Create `tests/core/gate.test.ts` using a strict decision envelope fixture with one `UT002` `FAKE` finding and a matching summary. Assert:

  ```ts
  expect(createGateResult(policy, parseDecisionEnvelope(fakeEnvelope))).toEqual(
    {
      version: '1',
      mode: 'gate',
      status: 'blocked',
      reasonCodes: ['STATIC_FAKE_FINDINGS'],
      staticSummary: { fake: 1, weak: 0, invalid: 0 },
      policyId: 'repository-static-fake-gate',
    },
  );
  ```

  Add a valid `WEAK`-only snapshot and an unflagged snapshot; both must return `passed` with `NO_STATIC_FAKE_FINDINGS`, retaining their actual `weak` count. Add a parser-diagnostic (`PARSER001`/`INVALID`) snapshot and assert `GateError`. Serialize each successful result and assert it contains none of `source`, `body`, `filePath`, `findings`, `fakeTestRatio`, or `trustScore`. Include an advisory policy/baseline context in a fixture and assert they do not appear in the gate result.

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `npx vitest run tests/core/gate.test.ts`

  Expected: FAIL because `src/core/gate.ts` does not exist.

- [ ] **Step 3: Implement the smallest evaluator.**

  Define the `GateResult`, `GateStatus`, and `GateReasonCode` types in `src/core/types.ts`. In `src/core/gate.ts`, first reject `envelope.audit.summary.invalid > 0` with `GateError('Static audit snapshot contains INVALID findings.')`. For a positive `summary.fake`, emit the exact `blocked` object and the sole code `STATIC_FAKE_FINDINGS`; otherwise emit the exact `passed` object and `NO_STATIC_FAKE_FINDINGS`. Copy only `fake`, `weak`, and `invalid` from the validated summary and only `policy.id` from the gate policy.

- [ ] **Step 4: Run the focused test to verify GREEN.**

  Run: `npx vitest run tests/core/gate.test.ts tests/core/decision.test.ts`

  Expected: PASS; gate validation accepts only a strict static envelope and leaves advisory decision behavior unchanged.

### Task 3: Independent CLI command and exit semantics

**Files:**

- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

**Interfaces:**

- Consumes `ata gate <policy> <audit>` positional paths.
- Outputs a formatted `GateResult` JSON only for `passed`/`blocked` snapshots.
- Returns `0` for passed, `1` for blocked, and `2` for malformed policy/snapshot or an `INVALID` snapshot.

- [ ] **Step 1: Add failing CLI tests.**

  Extend `tests/cli.test.ts` with temporary JSON files holding the Task 1 policy and Task 2 fake, weak-only, and invalid envelopes. Assert `invoke(['gate', policyPath, envelopePath])` returns `1` and JSON `{ mode: 'gate', status: 'blocked', reasonCodes: ['STATIC_FAKE_FINDINGS'] }` for fake; `0` and `{ status: 'passed' }` for weak-only; and `2`, empty stdout, and an `Error:` stderr prefix for invalid policy, invalid envelope, and parser-invalid snapshots. Keep existing `review` and `decision` tests as explicit regression assertions.

- [ ] **Step 2: Run focused tests to verify RED.**

  Run: `npx vitest run tests/cli.test.ts`

  Expected: FAIL because Commander reports `gate` as an unknown command.

- [ ] **Step 3: Register the command with bounded errors.**

  Import `loadGatePolicy`, `GatePolicyError`, `createGateResult`, `GateError`, `loadDecisionEnvelope`, and `DecisionError` in `src/cli.ts`. Add:

  ```ts
  program
    .command('gate')
    .description(
      'Apply an explicit FAKE-only policy gate to a static audit snapshot',
    )
    .argument('<policy>', 'versioned gate policy JSON')
    .argument('<audit>', 'versioned static-audit envelope JSON')
    .action(async (policyPath: string, auditPath: string) => {
      const result = createGateResult(
        await loadGatePolicy(policyPath),
        await loadDecisionEnvelope(auditPath),
      );
      io.stdout(`${JSON.stringify(result, null, 2)}\n`);
      resultCode = result.status === 'blocked' ? 1 : 0;
    });
  ```

  Map `GatePolicyError` and `GateError` to the existing bounded `Error: ...` stderr path with return code `2`. Do not alter review/decision actions or their catch behavior.

- [ ] **Step 4: Run the focused test to verify GREEN.**

  Run: `npx vitest run tests/cli.test.ts tests/core/gate-policy.test.ts tests/core/gate.test.ts`

  Expected: PASS with the three specified gate exit states and unchanged legacy command behavior.

### Task 4: Opt-in GitHub Actions reference workflow

**Files:**

- Create: `.github/ata-gate-policy.json`
- Create: `.github/workflows/audit-gate-reference.yml`
- Modify: `tests/github-reference-workflow.test.ts`

**Interfaces:**

- Reuses `.github/scripts/create-decision-envelope.mjs` as the strict raw-audit projection.
- Consumes the checked-in gate policy and a `review --changed-since` JSON artifact.
- Produces an opt-in workflow whose final exit code is the gate result after audit statuses `0`/`1`; it stops at `2` without invoking gate.

- [ ] **Step 1: Add failing workflow and policy assertions.**

  In `tests/github-reference-workflow.test.ts`, add paths for the new workflow and gate policy. Assert the policy parses with `parseGatePolicy` and equals the exact Task 1 object. Assert the workflow contains `pull_request:`, `workflow_dispatch:`, required `base-ref`, `permissions:\n  contents: read`, `fetch-depth: 0`, Node 20, `npm ci`, `npm run build`, the quoted changed-since review command, `set +e`, `audit_exit=$?`, the explicit `audit_exit` `0`/`1` allowlist, an early `exit 2`, the existing projection script, `node dist/cli.js gate .github/ata-gate-policy.json`, and a final `exit "$gate_exit"`. Assert it does not contain `pull_request_target`, `GITHUB_TOKEN`, `github-token`, `actions/github-script`, `gh `, `curl`, `checks: write`, `pull-requests: write`, or `ata decision`.

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `npx vitest run tests/github-reference-workflow.test.ts`

  Expected: FAIL because the gate policy and workflow do not exist.

- [ ] **Step 3: Add the explicit workflow and policy.**

  Create `.github/ata-gate-policy.json` with the exact policy from Task 1. Create `audit-gate-reference.yml`, separate from `ci.yml` and `audit-reference.yml`. Set `BASE_REF` from the PR base SHA or manual `base-ref`; use full checkout and locally built CLI. Capture `review` output and exit code with `set +e`/`set -e`; exit `2` immediately for audit `2`, reject any non-`0`/`1` status, then run the existing projection script. Capture `ata gate .github/ata-gate-policy.json decision-envelope.json` with `set +e`, save `gate_exit`, restore `set -e`, print the raw audit and compact gate result as fenced JSON to `$GITHUB_STEP_SUMMARY`, verify `gate_exit` is `0`, `1`, or `2`, and `exit "$gate_exit"`.

- [ ] **Step 4: Run the focused test to verify GREEN.**

  Run: `npx vitest run tests/github-reference-workflow.test.ts`

  Expected: PASS; the reference proves explicit opt-in, least privilege, strict projection, audit handling, and gate exit forwarding.

### Task 5: Bilingual public contracts and Skill assets

**Files:**

- Modify: `src/docs-contract.ts`
- Modify: `tests/docs-contract.test.ts`
- Modify: `README.md`
- Modify: `README_ZH.md`
- Modify: `docs/requirements.md`
- Modify: `docs/zh/requirements.md`
- Modify: `docs/architecture.md`
- Modify: `docs/zh/architecture.md`
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

- Documents `ata gate <policy> <audit>`, strict `["FAKE"]`, `0`/`1`/`2`, explicit opt-in, no static-meaning mutation, and no `STRONG` inference.
- Keeps v0.6 advisory policy and v0.8 decision contracts explicitly distinct from the new gate policy.

- [ ] **Step 1: Add failing bilingual documentation-contract requirements.**

  Extend `src/docs-contract.ts` with paired v1.0 markers for `ata gate`, `mode: "gate"`, `blockOn`, `FAKE`, `WEAK`, `INVALID`, explicit opt-in, gate exit codes, source-only/non-execution limits, and no `STRONG` claim. Add isolated gate reference workflow terms (`audit-gate-reference.yml`, `contents: read`, `base-ref`, no PR comments, and captured review `0`/`1` behavior). Require explicit text that `--policy` remains advisory and `ata decision` remains non-gate. Update `tests/docs-contract.test.ts` only if a new direct assertion is required.

- [ ] **Step 2: Run the documentation contract to verify RED.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: FAIL, identifying the absent v1.0 English/Chinese contract markers.

- [ ] **Step 3: Synchronize user-facing materials.**

  Update all listed English and Chinese pairs with one executable source-checkout example that projects a `review --format json` artifact then runs `ata gate`. Describe exact policy JSON, output shape, exit semantics, and that `FAKE` alone blocks. State that `WEAK` and `UNASSESSED` do not block or prove quality; an invalid snapshot stops with `2`; gate ignores advisory policy/baseline/semantic/mutation content except strict permitted snapshot context. Add a `fake-only-gate` eval case and a matched Skill/prompt/example boundary. Update architecture with the new separate components and workflow, requirements with the CLI contract, and rules with the distinction from the advisory policy boundary. Keep both roadmap rows marked Planned during this task.

- [ ] **Step 4: Run the documentation contract to verify GREEN.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS; every required English/Chinese v1.0 marker is present without weakening earlier policy or decision language.

### Task 6: Version, implementation evidence, and full verification

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

- Produces matching `1.0.0` package metadata and CLI version output.
- Records only the RED/GREEN commands actually observed in this execution and the final verification outcome.

- [ ] **Step 1: Change the version assertion first.**

  Change the existing `ata --version` assertion in `tests/cli.test.ts` from `0.9.0` to `1.0.0`.

- [ ] **Step 2: Run the version test to verify RED.**

  Run: `npx vitest run tests/cli.test.ts`

  Expected: FAIL because package metadata and `createProgram().version(...)` still identify as `0.9.0`.

- [ ] **Step 3: Synchronize version metadata.**

  Update the root package version in both `package.json` and `package-lock.json`, and `src/cli.ts` to `1.0.0`. Do not change roadmap delivery status or add implementation evidence yet.

- [ ] **Step 4: Run focused regression checks.**

  Run: `npx vitest run tests/core/gate-policy.test.ts tests/core/gate.test.ts tests/cli.test.ts tests/github-reference-workflow.test.ts tests/docs-contract.test.ts`

  Expected: PASS with strict gate parsing, all gate CLI statuses, workflow structure, public markers, and version `1.0.0`.

- [ ] **Step 5: Run the first complete project gate while roadmap status remains Planned.**

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

  Expected: all checks pass except `node dist/cli.js review benchmarks --format json`, which must return the expected `1` due to deterministic `FAKE` findings; `git diff --check` passes; status reports task files while preserving pre-existing untracked files. Capture these outputs as the factual basis for the delivery record.

- [ ] **Step 6: Record delivery state from observed evidence.**

  Only after Step 5 succeeds, update `docs/roadmap.md` and `docs/zh/roadmap.md` from Planned to Delivered for v1.0. Add dated, matching English/Chinese implementation-record entries listing the actually observed focused RED/GREEN commands and first full-gate outputs, the expected benchmark exit `1`, retained source-only limits, and that no commit/push/tag/release occurred. Do not claim any GitHub-hosted validation that was not performed.

- [ ] **Step 7: Re-run the complete project gate against the final worktree.**

  Re-run the exact commands from Step 5 after the roadmap and implementation records are updated.

  Expected: the same passing results and expected benchmark exit `1`; this second run verifies the final documentation, metadata, source, tests, and workflow together.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 implement strict policy, static-only evaluator, and explicit exit contract; Task 4 fixes the reviewed CI non-zero flow; Task 5 preserves bilingual public and Skill boundaries; Task 6 records delivery only after evidence and revalidates the final worktree.
- **Placeholder scan:** Every task names exact files, exports, inputs, expected outcomes, and commands; no deferred behaviors remain.
- **Type consistency:** Gate evaluation receives `GatePolicy` and the existing `DecisionEnvelope`, emits `GateResult`, and the CLI maps only `GateResult.status` to `0`/`1`; parse and static-invalid errors map to `2` without partial JSON.
