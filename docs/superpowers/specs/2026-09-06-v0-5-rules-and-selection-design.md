# v0.5 Rules and Changed-File Selection

## Scope

Implements the two v0.5 roadmap outcomes on the v0.4 foundation. No reviewed source is executed. Default full scans and existing exit semantics remain available. No commit, push, or PR is requested.

## Rule contract

Add three HIGH-confidence syntactic WEAK/WARNING hints, one per category:

- UT004: all direct recognized assertions use zero-argument `toBeDefined` or `toBeTruthy`.
- API002: all direct recognized assertions use those existence matchers on `response.body` or `response.data`.
- E2E003: all direct recognized assertions use zero-argument `toBeVisible`.

Require at least one assertion, and require every direct `expect(...)` call to belong to a recognized assertion. A modifier chain (`not`, `resolves`, `rejects`) or bare expect suppresses the new sole-assertion rules. Mixed value/content assertions suppress them. These are review hints: existence/visibility can be the intended contract. No alias, helper, runtime, or business-oracle inference is claimed. Existing rules are unchanged.

## Selection contract

`ata review [path] --changed-since <ref>` resolves one local Git commit, compares its tree with the current tracked working-tree contents, and adds non-ignored untracked files. It intersects the resulting paths with supported test files under the input path and config include/exclude filters. It selects entire current files, not changed lines, historical blobs, or tests related to changed production code. Deleted files are omitted; rename destinations are selected. Net changes relative to the base count, including staged/unstaged changes. There is no merge-base or fetch operation.

Use Git through argument arrays with no shell; resolve refs with `--end-of-options`, then pass the verified commit ID to diff. Disable external diff/textconv and use NUL-delimited paths. Invalid refs, non-Git paths, Git failures/timeouts and unborn HEAD produce a controlled input error/exit 2. An explicit valid commit ref works even in a repository whose HEAD is unborn.

Optional result `selection` records mode, requested baseRef, resolved baseCommit, and sorted absolute selected files, including files with no extracted tests. Text reports identify selected-file count and explicitly report an empty selection. No selection means no finding, not quality endorsement. Semantic/mutation artifacts remain separate advisory evidence and are not filtered or remapped by selection.

## Acceptance evidence

Real temporary Git repositories cover commits, staged and unstaged changes, untracked/ignored/deleted/renamed files, paths containing whitespace/newlines, subdirectory/file scope, config intersection, invalid refs and CLI exit codes. Rule fixtures cover positives, negative controls, source locations, classifications, mixed assertions and modifiers. Bilingual public docs and Skill assets explain the same boundaries. Full AGENTS.md checks and built CLI smoke runs are required.
