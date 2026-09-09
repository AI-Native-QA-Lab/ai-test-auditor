# v1.0 Documentation Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate v1.0 documentation into bilingual project documentation, bilingual project context, and concise Chinese historical references without losing active contracts or v2.0 planning constraints.

**Architecture:** `docs/roadmap.md` and `docs/zh/roadmap.md` remain the only detailed source of future plans. `README*`, `docs/context*`, and `AGENTS.md` summarize or link that source; `docs/history/` is Chinese-only and records completed-version decisions and reusable engineering practice. Pending v2.0 design remains at `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md`.

**Tech Stack:** Markdown, TypeScript/Vitest documentation contract, Prettier, ripgrep, npm scripts.

**Design:** `docs/superpowers/specs/2026-09-09-v1-documentation-consolidation-design.md`

---

### Task 1: Add a failing documentation contract for the new information architecture

**Files:**

- Modify: `src/docs-contract.ts`
- Modify: `tests/docs-contract.test.ts`

- [ ] **Step 1: Add required paths and markers before creating the files.**

  Add public-document checks for `docs/context.md`, `docs/zh/context.md`, `docs/history/product-evolution.md`, `docs/history/architecture-decisions.md`, and `docs/history/implementation-notes.md`. Require the paired Context files to contain the v1.0 baseline, `source-only`, `Roadmap`, `FAKE`, `WEAK`, `UNASSESSED`, `Trust Score`, `FTR`, and the retained v2.0 design path. Require the Chinese history files to contain their titles and `v1.0`.

  Replace the current `docs/process/implementation-record*` pair in `documentPairs` with a single Chinese `PublicDocument` entry for `docs/history/implementation-notes.md`; it must require `材料决策`、`验证命令`、`已知限制` and must not be treated as a bilingual public document.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: FAIL, naming each missing Context/history file or marker.

- [ ] **Step 3: Extend the test name to describe the new contract.**

  Update the test description to state that it validates bilingual public documents plus Chinese historical references:

  ```ts
  it('keeps bilingual public documents, v1 context, and Chinese history markers aligned', async () => {
    await expect(validateBilingualPublicMarkers()).resolves.toEqual([]);
  });
  ```

- [ ] **Step 4: Do not implement document content yet.**

  Keep the contract failing until Tasks 2 and 3 create every required document and marker. This proves the migration checks the new information architecture rather than the deleted process-record paths.

### Task 2: Create the Chinese historical references and bilingual project Context

**Files:**

- Create: `docs/history/product-evolution.md`
- Create: `docs/history/architecture-decisions.md`
- Create: `docs/history/implementation-notes.md`
- Create: `docs/context.md`
- Create: `docs/zh/context.md`

- [ ] **Step 1: Write the migration inventory at the top of `docs/history/implementation-notes.md`.**

  Include this exact table before the reusable practices section:

  ```markdown
  | Old material                             | New canonical location                                           |
  | ---------------------------------------- | ---------------------------------------------------------------- |
  | Completed v0.1–v1.0 specs and plans      | This `docs/history/` set plus current project documents          |
  | `docs/process/implementation-record*.md` | `docs/history/implementation-notes.md`                           |
  | Pending optional AI assist design        | `docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md` |
  ```

- [ ] **Step 2: Create `product-evolution.md`.**

  Summarize v0.1–v1.0 by capability groups instead of one entry per implementation event: deterministic static analysis foundation; expanded Unit/API/E2E and changed-file selection; advisory evidence/policy/baseline/decision integration; and the v1.0 explicit FAKE-only gate. End with a clear current-baseline statement and link to `../zh/roadmap.md` for unimplemented work.

- [ ] **Step 3: Create `architecture-decisions.md`.**

  Document the rationale and lasting constraints for source-only inspection, deterministic `FAKE`, contextual `WEAK`, `UNASSESSED` rather than `STRONG`, advisory evidence versus policy gate, explicit input paths, `0`/`1`/`2` semantics, and no credential/network/reviewed-source execution. Link current behavior to `../zh/architecture.md` and `../zh/rules.md` rather than duplicating rule text.

- [ ] **Step 4: Complete `implementation-notes.md`.**

  Add reusable practice sections for observed RED/GREEN, full local verification, expected benchmark exit `1`, least-privilege reference workflows, exact staging, review repair, and known limits. Record this consolidation’s scope and final validation in a dated entry, without branch names, commit IDs, or raw command-output logs.

- [ ] **Step 5: Create English and Chinese Context files with matching structure.**

  Use these headings in both files:

  ```markdown
  ## Purpose and v1.0 baseline

  ## Current capability map

  ## Non-negotiable analysis boundaries

  ## Commands and contract entry points

  ## Documentation map

  ## Future iteration entry point

  ## Verification and maintenance
  ```

  Context must state that Roadmap is the single detailed source for future work and link the retained optional-AI design as pending, not delivered.

- [ ] **Step 6: Verify GREEN for the new documentation contract.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS after all new paths and required markers exist.

### Task 3: Rewrite the bilingual user-facing entry points and consolidate the Roadmap

**Files:**

- Modify: `README.md`
- Modify: `README_ZH.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/zh/roadmap.md`
- Modify: `docs/README.md`
- Modify: `docs/zh/README.md`
- Modify: `docs/development.md`
- Modify: `docs/zh/development.md`

- [ ] **Step 1: Rewrite each root README into current, task-oriented usage.**

  Preserve only current commands and constraints. Use matching sections for purpose/limits, installation, first review, common optional inputs (`--changed-since`, `--mutation-report`, `--policy`, `--baseline`, `ata decision`, `ata gate`), exit codes, rule catalog link, next direction, document navigation, development, and license. Remove version-numbered tutorial headings such as `v0.4 mutation evidence` and `v0.6.0 advisory policy`.

- [ ] **Step 2: Add the README next-direction boundary.**

  English must contain: `v1.0 is the current stable baseline` and link `./docs/roadmap.md`. Chinese must contain: `v1.0 是当前稳定基线` and link `./docs/zh/roadmap.md`. Both must state that v2.0 is not delivered and must not list implementation steps.

- [ ] **Step 3: Make Roadmap the concise detailed plan source.**

  Retain a delivered v0.1–v1.0 summary table and replace the old per-version contract sections with one “Current baseline” section. Keep a v2.0 section with: separate design approval, source-only static semantics preserved, explicit and optional adapters, no default credentials/network/source execution, and no dates/providers/thresholds/coverage commitments. Link the retained optional-AI design.

- [ ] **Step 4: Replace process-record navigation and instructions.**

  In `docs/README.md`, `docs/zh/README.md`, `docs/development.md`, and `docs/zh/development.md`, replace `docs/process/implementation-record*` with `docs/history/implementation-notes.md`. Mark it Chinese-only; English documentation should link it as `Chinese implementation notes`, not claim an English counterpart.

- [ ] **Step 5: Add Context and History to document indexes and root README navigation.**

  Link both Context files as bilingual project documentation. Link the Chinese History index from both language entry points, clearly label it as Chinese historical/development reference, and do not add English history translations.

- [ ] **Step 6: Run the focused document contract.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS, including all bilingual entry points and the Chinese-only process-reference marker.

### Task 4: Make AGENTS the executable v1.0 and future-iteration rulebook

**Files:**

- Modify: `AGENTS.md`
- Modify: `src/docs-contract.ts`

- [ ] **Step 1: Replace the stale version statement.**

  Change the purpose description to state that v1.0 is the current stable baseline. Keep the deterministic static analyzer wording and do not describe the tool as a runner, LLM reviewer, mutation-testing tool, or proof that unflagged tests are strong.

- [ ] **Step 2: Add a `Future iteration rules` section.**

  Add executable rules requiring a maintainer/AI to read `docs/roadmap.md`, `docs/context.md`, the affected rule, and test before v2.0+ work; require an approved independent design before implementation; keep Roadmap as the only detailed future plan; and require public bilingual documentation plus Chinese history/process updates when applicable.

- [ ] **Step 3: Preserve static and gate invariants verbatim enough to be testable.**

  State that future adapters cannot mutate static findings/classifications, `FAKE`/`WEAK`/`UNASSESSED`, FTR, Trust Score, existing command exit semantics, or the explicit FAKE-only gate input. They must not silently execute reviewed source, read credentials, or call networks.

- [ ] **Step 4: Redirect process evidence.**

  Replace the current bilingual implementation-record requirement with the Chinese `docs/history/implementation-notes.md` requirement. It must require material decisions, validation commands, scope changes, and known limits.

- [ ] **Step 5: Require the new AGENTS and Roadmap markers in `src/docs-contract.ts`.**

  Add a `PublicDocument` contract for `AGENTS.md` containing `v1.0`, `docs/roadmap.md`, `docs/context.md`, `FAKE`, `WEAK`, `UNASSESSED`, `FTR`, `Trust Score`, and `docs/history/implementation-notes.md`.

- [ ] **Step 6: Verify GREEN.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS only when AGENTS, Context, Roadmap, and history describe the same baseline and future-work entry point.

### Task 5: Delete superseded historical material only after all replacements are live

**Files:**

- Delete: `docs/process/implementation-record.md`
- Delete: `docs/process/implementation-record_zh.md`
- Delete: `docs/superpowers/plans/2026-09-02-ai-test-auditor-mvp.md`
- Delete: `docs/superpowers/plans/2026-09-04-v0-2-extraction-and-diagnostics.md`
- Delete: `docs/superpowers/plans/2026-09-04-v0-3-semantic-review.md`
- Delete: `docs/superpowers/plans/2026-09-05-v0-4-mutation-evidence.md`
- Delete: `docs/superpowers/plans/2026-09-06-v0-5-rules-and-selection.md`
- Delete: `docs/superpowers/plans/2026-09-09-v0-9-github-reference-workflow.md`
- Delete: `docs/superpowers/plans/2026-09-09-v1-opt-in-policy-gate.md`
- Delete: `docs/superpowers/specs/2026-09-02-ai-test-auditor-design.md`
- Delete: `docs/superpowers/specs/2026-09-05-v0-4-mutation-evidence-design.md`
- Delete: `docs/superpowers/specs/2026-09-06-v0-5-rules-and-selection-design.md`
- Delete: `docs/superpowers/specs/2026-09-09-v0-9-github-reference-workflow-design.md`
- Delete: `docs/superpowers/specs/2026-09-09-v1-opt-in-policy-gate-design.md`

- [ ] **Step 1: Run a pre-delete reference inventory.**

  Run:

  ```bash
  rg -n 'docs/process/implementation-record|docs/superpowers/(plans|specs)/2026-09-(02|04|05|06|09)-(ai-test-auditor|v0-2|v0-3|v0-4|v0-5|v0-9|v1)' \
    README.md README_ZH.md AGENTS.md docs --glob '!superpowers/**' \
    src tests test-quality-audit .github
  ```

  Expected: no live README, docs index, AGENTS, TypeScript, test, Skill, or workflow reference to a file scheduled for deletion. The command intentionally excludes the current `docs/superpowers/` design and plan, which preserve the migration inventory. The retained `2026-09-08-optional-ai-assist-design.md` must not appear in the deletion list.

- [ ] **Step 2: Delete only the listed completed-version files.**

  Use explicit paths, never `git clean`, broad globs, reset, or an unscoped recursive deletion. Preserve the current consolidation design and plan until the documentation delivery is accepted.

- [ ] **Step 3: Verify the deletion boundary.**

  Run:

  ```bash
  test -f docs/superpowers/specs/2026-09-08-optional-ai-assist-design.md
  test -f docs/superpowers/specs/2026-09-09-v1-documentation-consolidation-design.md
  test -f docs/superpowers/plans/2026-09-09-v1-documentation-consolidation.md
  test ! -e docs/process/implementation-record.md
  test ! -e docs/process/implementation-record_zh.md
  ```

  Expected: retained future design and current consolidation records exist; the two replaced process records do not.

### Task 6: Complete validation and prepare the scoped documentation commit

**Files:**

- Verify: all changed documentation, `AGENTS.md`, `src/docs-contract.ts`, `tests/docs-contract.test.ts`

- [ ] **Step 1: Run reference and bilingual checks.**

  Run:

  ```bash
  rg -n 'implementation-record|2026-09-09-v1-opt-in-policy-gate|2026-09-09-v0-9-github-reference-workflow' README.md README_ZH.md docs AGENTS.md src tests test-quality-audit
  ```

  Expected: only intentionally retained current consolidation plan/design references remain; no deleted process or completed-version plan/spec link remains. Manually open each bilingual pair and compare their heading order.

- [ ] **Step 2: Run the full documented validation gate.**

  Run:

  ```bash
  npm test
  npm run lint
  npm run typecheck
  npm run format:check
  npm run build
  node dist/cli.js review benchmarks --format json
  git diff --check
  ```

  Expected: all commands pass except the benchmark review, which exits `1` and reports deterministic FAKE findings as before.

- [ ] **Step 3: Inspect the exact staged scope before committing.**

  Run:

  ```bash
  git diff --cached --name-only
  git diff --cached --stat
  git diff --cached --check
  ```

  Expected: only the documentation-consolidation files listed by this plan are staged; no unrelated workspace files are included.

- [ ] **Step 4: Commit only with explicit user authorization.**

  Suggested message:

  ```text
  docs: consolidate v1 project documentation
  ```
