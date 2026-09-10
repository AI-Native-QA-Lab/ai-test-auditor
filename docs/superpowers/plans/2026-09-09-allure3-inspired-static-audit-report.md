# Allure 3 Inspired Static Audit Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the standalone HTML static-audit report into an Allure 3 Awesome-inspired audit workbench without changing audit semantics or adding runtime dependencies.

**Architecture:** Keep `renderHtml(result, locale)` as the only presentation entry point. Derive all navigation counts from `result.findings`, render responsive inline HTML/CSS/JavaScript, and filter already-rendered finding cards only. No Allure package, plugin, network request, or runtime data is introduced.

**Tech Stack:** TypeScript, Vitest, inline semantic HTML/CSS/JavaScript, Prettier, ESLint.

---

## File structure

- Modify: `src/reporters.ts` — presentation aggregation, localization, markup, responsive styles, and filter interactions.
- Modify: `tests/reporters.test.ts` — report-contract regression tests.
- Modify: `docs/history/implementation-notes.md` — Chinese decision and validation record.

### Task 1: Add sidebar aggregation and navigation controls

**Files:**

- Modify: `tests/reporters.test.ts`
- Modify: `src/reporters.ts`

- [ ] **Step 1: Write a failing reporter test**

```ts
it('renders localized rule and file navigation counts', () => {
  const output = renderHtml(
    {
      ...result,
      findings: [
        {
          ...result.findings[0]!,
          ruleId: 'E2E001',
          filePath: '/repo/a.e2e.ts',
        },
        {
          ...result.findings[0]!,
          ruleId: 'E2E004',
          filePath: '/repo/a.e2e.ts',
        },
      ],
    },
    'zh-CN',
  );
  expect(output).toContain('按规则浏览');
  expect(output).toContain('E2E001 <b>1</b>');
  expect(output).toContain('a.e2e.ts <b>2</b>');
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/reporters.test.ts`

Expected: FAIL because navigation counts do not exist.

- [ ] **Step 3: Implement the smallest aggregation**

```ts
function countBy(
  values: readonly string[],
): ReadonlyArray<readonly [string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}
const ruleCounts = countBy(result.findings.map((finding) => finding.ruleId));
const fileCounts = countBy(result.findings.map((finding) => finding.filePath));
```

Render escaped buttons with `data-filter-kind` and `data-filter-value`. Do not change `AuditResult` or JSON output.

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run tests/reporters.test.ts`

Expected: PASS.

### Task 2: Add responsive workbench layout and shared filter state

**Files:**

- Modify: `tests/reporters.test.ts`
- Modify: `src/reporters.ts`

- [ ] **Step 1: Write a failing layout test**

```ts
it('renders an offline responsive audit workbench', () => {
  const output = renderHtml(result, 'en');
  expect(output).toContain('class="report-layout"');
  expect(output).toContain('class="report-navigation"');
  expect(output).toContain('@media (max-width: 720px)');
  expect(output).not.toMatch(/https?:\/\//);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/reporters.test.ts`

Expected: FAIL because the report is single-column.

- [ ] **Step 3: Implement layout and navigation-to-filter wiring**

```html
<div class="report-layout">
  <aside class="report-navigation" aria-label="${t.navigation}">
    ${navigation}
  </aside>
  <section class="report-content">${summary}${filters}${groupedCards}</section>
</div>
```

```js
document.querySelectorAll('[data-filter-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    const selector = button.dataset.filterKind === 'rule' ? '#rule' : '#file';
    q(selector).value = button.dataset.filterValue || '';
    f();
  });
});
```

Use CSS grid on desktop and a stacked layout at 720px. Existing filter controls remain the sole filter state.

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run tests/reporters.test.ts`

Expected: PASS.

### Task 3: Group findings, disclose remediation, and preserve boundaries

**Files:**

- Modify: `tests/reporters.test.ts`
- Modify: `src/reporters.ts`
- Modify: `docs/history/implementation-notes.md`

- [ ] **Step 1: Write failing grouped-card and boundary tests**

```ts
it('groups findings by file and uses native remediation disclosure', () => {
  const output = renderHtml(
    {
      ...result,
      findings: [
        { ...result.findings[0]!, line: 4 },
        { ...result.findings[0]!, line: 9 },
      ],
    },
    'zh-CN',
  );
  expect(output).toContain('<section class="finding-group"');
  expect(output).toContain('/repo/example.test.ts <b>2</b>');
  expect(output).toContain('<details>');
  expect(output).toContain('<summary>修复建议</summary>');
  expect(output).not.toContain(result.tests[0]!.source);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/reporters.test.ts`

Expected: FAIL because findings are flat and remediation is always shown.

- [ ] **Step 3: Implement grouping and disclosure**

```html
<section class="finding-group">
  <h2>…escaped file path… <b>…count…</b></h2>
  <article class="finding" data-classification="…" data-rule="…" data-file="…">
    <details>
      <summary>${t.remediation}</summary>
      <p>…escaped remediation…</p>
    </details>
  </article>
</section>
```

Keep finding data attributes unchanged. Update the filter function to hide a file group only when all of its finding cards are hidden.

- [ ] **Step 4: Add the Chinese implementation record**

Append a dated history entry stating the workbench borrows presentation structure only: it does not import Allure, execute tests, add runtime results, make network requests, disclose test source, or change findings, FTR, Trust Score, or exit codes.

- [ ] **Step 5: Verify focused quality**

Run: `npx vitest run tests/reporters.test.ts && npx eslint src/reporters.ts tests/reporters.test.ts && npx prettier --check src/reporters.ts tests/reporters.test.ts docs/history/implementation-notes.md`

Expected: exit `0`.

### Task 4: Delivery verification

**Files:**

- Modify: `src/reporters.ts`
- Modify: `tests/reporters.test.ts`
- Modify: `docs/history/implementation-notes.md`

- [ ] **Step 1: Run full project checks separately**

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
node dist/cli.js review benchmarks --format json
git diff --check
```

Expected: tests, typecheck, build, and diff check exit `0`; benchmark audit exits `1` because fixtures intentionally contain `FAKE`. Report existing unrelated worktree/backup failures without modifying them.

- [ ] **Step 2: Inspect final scope without a Git write**

```bash
git status --short
git diff -- src/reporters.ts tests/reporters.test.ts docs/history/implementation-notes.md
```

Expected: only planned tracked files are task modifications. Do not commit, push, tag, or create a PR without explicit user authorization.
