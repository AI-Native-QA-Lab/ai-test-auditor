# HTML Report and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline interactive HTML audit reports, explicit `en`/`zh-CN` human-readable localization, and optional output-file writing without changing JSON or audit semantics.

**Architecture:** Keep `AuditResult` and JSON unchanged. Add a presentation-only locale catalog and `renderHtml`; CLI validates locale/output options, renders after auditing, and atomically writes only when `--output` is supplied. HTML embeds escaped report data plus dependency-free filtering controls.

**Tech Stack:** TypeScript, Commander, Vitest, Node.js fs/promises, inline HTML/CSS/JavaScript, Prettier.

**Design:** `docs/superpowers/specs/2026-09-09-html-report-and-localization-design.md`

---

### Task 1: Establish failing reporter contracts

**Files:**

- Modify: `tests/reporters.test.ts`
- Modify: `src/reporters.ts`
- Create: `src/report-locales.ts`

- [ ] **Step 1: Add failing HTML reporter tests.**

  Import `renderHtml` and assert an English report has `<!doctype html>`, `AI Test Auditor`, `FAKE`, `WEAK`, `UNASSESSED`, FTR, Trust Score, rule ID, escaped message/remediation, `data-classification`, a rule filter, a file search, reset control, and the no-STRONG boundary. Assert `renderHtml(result, 'zh-CN')` has Chinese labels. Use a finding whose message and path contain `<script>` and assert neither raw string appears in the HTML.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/reporters.test.ts`

  Expected: FAIL because `renderHtml` and the locale module do not exist.

- [ ] **Step 3: Add minimal locale and HTML renderer.**

  Define `ReportLocale = 'en' | 'zh-CN'` and a catalog for labels, classification explanations, fixed boundaries, and empty state. Implement `renderHtml(result, locale)` as a complete dependency-free document; escape every audit-derived HTML and JSON-script value. Serialize only summary, tests count, and finding display fields; omit `TestCase.source` and `TestCase.body`.

- [ ] **Step 4: Verify GREEN.**

  Run: `npx vitest run tests/reporters.test.ts`

  Expected: PASS with existing text/json regression tests and the new HTML/escaping tests.

### Task 2: Localize text output while preserving JSON

**Files:**

- Modify: `src/reporters.ts`
- Modify: `tests/reporters.test.ts`

- [ ] **Step 1: Add failing locale invariance tests.**

  Assert `renderText(result, 'zh-CN')` contains Chinese summary/boundary labels; assert `renderJson(result)` equals `renderJson(result, 'zh-CN')` if the renderer accepts a locale argument, or remains byte-for-byte unchanged when locale is handled only by CLI.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/reporters.test.ts`

  Expected: FAIL because text output is still English-only.

- [ ] **Step 3: Implement presentation-only localized text.**

  Change `renderText` to accept an optional `ReportLocale` defaulting to `en`; map static labels and rule messages/remediation through the catalog without changing finding fields. Keep `renderJson` unchanged and do not localize JSON.

- [ ] **Step 4: Verify GREEN.**

  Run: `npx vitest run tests/reporters.test.ts`

  Expected: PASS; JSON remains stable and human-readable text changes only when locale is `zh-CN`.

### Task 3: Add CLI format, locale, and atomic output handling

**Files:**

- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- Modify: `src/reporters.ts`

- [ ] **Step 1: Add failing CLI tests.**

  Add cases that assert `review --format html` writes HTML to captured stdout, `--locale zh-CN --format text` writes Chinese text, `--locale zh-CN --format json` preserves existing JSON, unknown locale returns `2`, unknown format returns `2`, and `--output <temp-file>` writes the rendered report while stdout stays empty. Add a failing-output-path case returning `2` without creating a partial target.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/cli.test.ts`

  Expected: FAIL because the new options and format are absent.

- [ ] **Step 3: Implement minimal CLI behavior.**

  Extend `OutputFormat` to include `html`; add Commander options `--locale <locale>` with default `en` and `--output <path>`. Validate locale before auditing. Render text with locale, HTML with locale, and JSON unchanged. For output files, create a sibling temporary file with `writeFile`, then `rename`; on write error remove only the temporary path and return `2` with a bounded stderr error. Preserve audit result exit code after successful rendering/writing.

- [ ] **Step 4: Verify GREEN.**

  Run: `npx vitest run tests/cli.test.ts`

  Expected: PASS with original review, decision, and gate contracts unchanged.

### Task 4: Document the new human-readable report workflows

**Files:**

- Modify: `README.md`
- Modify: `README_ZH.md`
- Modify: `docs/requirements.md`
- Modify: `docs/zh/requirements.md`
- Modify: `docs/architecture.md`
- Modify: `docs/zh/architecture.md`
- Modify: `docs/rules.md`
- Modify: `docs/zh/rules.md`
- Modify: `docs/context.md`
- Modify: `docs/zh/context.md`
- Modify: `test-quality-audit/SKILL.md`
- Modify: `test-quality-audit/SKILL_ZH.md`
- Modify: `test-quality-audit/prompts/test-quality-audit.md`
- Modify: `test-quality-audit/prompts/test-quality-audit-zh.md`
- Modify: `test-quality-audit/evals/cases.md`
- Modify: `src/docs-contract.ts`

- [ ] **Step 1: Add failing bilingual marker requirements.**

  Require `--format html`, `--output`, `--locale zh-CN`, default `en`, JSON stability, offline/single-file report, filtering, and source non-disclosure in each appropriate public pair and Skill asset.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: FAIL with missing v1 HTML/localization markers.

- [ ] **Step 3: Update bilingual documentation.**

  Add the README command examples required by the design. Document only implemented facts: localized text/HTML, stable JSON, `--output` behavior, no network, no embedded source, and browser-side filtering. Keep Roadmap unchanged because this is a v1.0 usability enhancement, not a future-plan change.

- [ ] **Step 4: Update the Chinese implementation notes.**

  Record the design boundary, observed RED/GREEN commands, validation, and known limitation that reports do not prove runtime behavior.

- [ ] **Step 5: Verify GREEN.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS with English and Chinese public contracts synchronized.

### Task 5: Complete end-to-end validation

**Files:**

- Verify: all changed source, tests, and documentation

- [ ] **Step 1: Exercise reports against benchmark source.**

  Run:

  ```bash
  node dist/cli.js review benchmarks --format html --output /tmp/ata-report.html
  node dist/cli.js review benchmarks --format html --locale zh-CN --output /tmp/ata-report-zh.html
  node dist/cli.js review benchmarks --format json --locale zh-CN > /tmp/ata-report.json
  ```

  Expected: each audit exits `1`; both HTML files are standalone and contain no benchmark source body; localized JSON remains parseable and schema-identical to default JSON.

- [ ] **Step 2: Run the complete project gate.**

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

  Expected: all commands pass except the expected benchmark review exit `1`.

- [ ] **Step 3: Commit only with explicit user authorization.**

  Suggested message:

  ```text
  feat: add localized HTML audit reports
  ```
