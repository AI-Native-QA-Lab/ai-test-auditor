<div align="right"><strong>English</strong> · <a href="./zh/context.md">简体中文</a></div>

# Project Context

## Purpose and v1.1.1 baseline

AI Test Auditor is a deterministic, source-only static analyzer for ineffective JavaScript and TypeScript tests. v1.1.1 is the current stable release: the explicit gate blocks only deterministic `FAKE` findings and never treats an unflagged test as strong.

## Current capability map

The CLI supports source review, changed-file selection, advisory policy, baseline comparison, advisory decision projection, and a strict `FAKE`-only gate. Rule semantics are in [Rules](./rules.md); public behavior is in [Requirements](./requirements.md).

The v1.2 static catalog contains 10 Unit, 10 API, 10 E2E, and 1 Parser rule. `ata benchmark` validates versioned source fixtures only; it does not execute them. `--locale` localizes human-readable text and HTML while JSON remains schema-compatible.

## Non-negotiable analysis boundaries

The project does not import, execute, or evaluate reviewed source. `FAKE` is deterministic evidence, `WEAK` is non-blocking context, and `UNASSESSED` is not `STRONG`. FTR and Trust Score are prioritization aids, not runtime-quality or release claims.

## Commands and contract entry points

Use `ata review`, `ata decision`, and `ata gate` with explicit local paths. Valid static review/gate outcomes use exit codes `0`, `1`, and `2`; see the [README](../README.md) and [Architecture](./architecture.md) for command contracts.

## Documentation map

Public documents are bilingual: [Roadmap](./roadmap.md), [Development](./development.md), [Context](./context.md), and the root README. Chinese [History](./history/product-evolution.md) preserves completed-version decisions and implementation experience.

## Future iteration entry point

[Roadmap](./roadmap.md) is the single detailed source for future work; the GitHub Project is its execution view, not a second roadmap. v1.2 continues unfinished static-platform work and enhances the existing auditor. v1.5+ work, including the retained [optional AI assist design](./superpowers/specs/2026-09-08-optional-ai-assist-design.md), requires separate approval before implementation.

## Verification and maintenance

Read `AGENTS.md`, the affected rule, and its test before changing behavior. Keep public documentation bilingual, record process evidence in the Chinese history notes, and run the documented local validation gate before delivery.
