# AI Test Auditor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic TypeScript CLI MVP that flags high-confidence ineffective tests with bilingual documentation and an installable audit Skill.

**Architecture:** Scan test source, parse AST, extract test callbacks, evaluate deterministic rules, aggregate findings, then render text or JSON.

**Tech Stack:** Node.js 20, TypeScript compiler API, Commander, Vitest, ESLint, Prettier, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-02-ai-test-auditor-design.md`

## Global Constraints

- Support JavaScript/TypeScript Jest, Vitest, and Playwright source only.
- Do not execute tests, call an LLM, or label unflagged source STRONG.
- Keep the README English-first and provide Chinese switching.
- Validate with test, lint, typecheck, format check, build, and diff check.

### Task 1: Tooling and contracts [x]

Create package tooling plus immutable audit types for findings, tests, results, classifications, and severities; verify Vitest and `tsc --noEmit`.

### Task 2: Scanner and extractor [x]

Discover recognized test files and use the TypeScript compiler API to extract test name, framework, source, body, and callback start line from Jest/Vitest/Playwright callbacks; test all conventions.

### Task 3: Rules [x]

Add tested deterministic implementations for UT001, UT002, UT003, UT008, UT011, API001, E2E001, E2E002, and E2E004. Every finding has stable ID, source line, message, severity, confidence, and remediation.

### Task 4: CLI [x]

Aggregate findings into classifications, FTR, and score; provide text and JSON reporters; implement `ata review` and exit codes; exercise the built CLI against fixtures.

### Task 5: Product assets [x]

Write bilingual public docs, requirements, architecture, rule catalog, roadmap, development/process records, AGENTS/CONTRIBUTING guidance, a bilingual standalone Skill with metadata/evals/examples, benchmark fixtures, and CI; run all validations.
