# GitHub README Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bilingual README pair a standard GitHub project entry point for both CLI users and contributors without changing v1.0 behavior claims.

**Architecture:** `README.md` remains the English primary entry and `README_ZH.md` its structurally matching Chinese counterpart. README contains onboarding and navigation; rules, schemas, architecture, roadmap, context, and history remain linked, specialized documents.

**Tech Stack:** Markdown, TypeScript/Vitest documentation contract, Prettier.

**Design:** `docs/superpowers/specs/2026-09-09-github-readme-optimization-design.md`

---

### Task 1: Add a failing README-entry contract

**Files:**

- Modify: `src/docs-contract.ts`
- Modify: `tests/docs-contract.test.ts`

- [ ] **Step 1: Add README markers before changing README content.**

  Extend the `README.md` / `README_ZH.md` document-pair markers with these English/Chinese pairs:

  ```ts
  ['Why AI Test Auditor?', '为什么使用 AI Test Auditor？'][
    ('Quick start', '快速开始')
  ][('Common workflows', '常用工作流')][('Contributing', '参与贡献')][
    ('v1.0 is the current stable baseline', 'v1.0 是当前稳定基线')
  ];
  ```

  Require `CONTRIBUTING.md` and `CONTRIBUTING_ZH.md` links in their matching README. Keep the existing command, policy, decision, gate, exit-code, and source-only boundary markers.

- [ ] **Step 2: Verify RED.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: FAIL because the current README pair lacks the new standard GitHub-entry headings or contribution markers.

### Task 2: Rewrite the English README as a GitHub project entry point

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add the header and project framing.**

  Keep the language switcher and CI badge. Follow the title with a short deterministic source-only value proposition and a `## Why AI Test Auditor?` section that explains false confidence without claiming runtime proof.

- [ ] **Step 2: Add task-oriented onboarding.**

  Use `## Quick start` with Node 20+, `npm install`, `npm run build`, and `node dist/cli.js review ./tests --format json`. Explain that installed `ata review` is equivalent, and that source checkout examples use `node dist/cli.js`.

- [ ] **Step 3: Keep common workflows compact.**

  Use `## Common workflows` with one command each for `--changed-since`, `--mutation-report`, `--policy`, `--baseline`, `ata decision`, and `ata gate`. Link detailed contracts instead of embedding JSON schemas.

- [ ] **Step 4: Add results, boundaries, and navigation.**

  State `FAKE`, `WEAK`, `UNASSESSED`, FTR, Trust Score, and `0`/`1`/`2`; retain explicit statements that `WEAK does not block`, a passing gate does not prove `STRONG`, and source is never executed. Add bilingual documentation links and a Chinese-only history label.

- [ ] **Step 5: Add standard project closeout sections.**

  Add `## Next`, `## Contributing`, and `## License`. Next must only say `v1.0 is the current stable baseline`, v2.0 is not delivered, and link Roadmap. Contributing must link `CONTRIBUTING.md` and list the documented local validation command set.

### Task 3: Mirror the structure and facts in Chinese

**Files:**

- Modify: `README_ZH.md`

- [ ] **Step 1: Match English heading order.**

  Use Chinese equivalents of Why, capability boundary, 快速开始, 常用工作流, results/exit codes, documentation, 下一步, 参与贡献, and 许可证.

- [ ] **Step 2: Translate facts, not wording mechanically.**

  Preserve every command, classification, exit code, link target, and v2.0 non-delivery statement. Use `WEAK 不阻断`, `UNASSESSED` 不等于 `STRONG`, and `v1.0 是当前稳定基线`.

- [ ] **Step 3: Verify GREEN.**

  Run: `npx vitest run tests/docs-contract.test.ts`

  Expected: PASS after both README files expose the standard entry structure and all stable v1.0 markers.

### Task 4: Validate rendering, links, and project gates

**Files:**

- Verify: `README.md`, `README_ZH.md`, `src/docs-contract.ts`, `tests/docs-contract.test.ts`

- [ ] **Step 1: Inspect all local Markdown links.**

  Run: `rg -o '\]\(\.?/?[^)#]+\.md\)' README.md README_ZH.md | sort -u`

  Expected: every local target exists and Chinese history links remain labeled as Chinese-only.

- [ ] **Step 2: Run the documented validation gate.**

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

  Expected: all commands pass except benchmark review, which exits `1` with deterministic FAKE findings.

- [ ] **Step 3: Commit only with explicit user authorization.**

  Suggested message:

  ```text
  docs: optimize GitHub project README
  ```
