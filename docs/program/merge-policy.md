# Merge policy

Owner instruction, 20 November 2026: every future PR needs green GitHub CI and at least one completed pstack interrogate round before merging. This applies to documentation and PoC work as well as application changes.

## Required checks

The CI workflow runs on every pull request and every push to `production`, without path filters. It contains these checks.

| Job | Checks |
| --- | --- |
| Wallet lint, typecheck, and tests | Existing Angular lint, application and test TypeScript checks, the complete headless Karma test suite, and a regression check that focused tests cannot hide failures. |
| PoC lint, typecheck, tests, and records | Ruff, Pyright, Python regression tests, and program-record integrity checks. |
| Pinned crypto native and WASM builds | All four checksum-pinned library compilation checks, using retained dependency locks. |

The inherited application uses Node 24.22.1 for this CI run, matching the locally exercised runtime. This is measured compatibility, not a claim that Angular 17 officially supports Node 24. It does not initialize the proposed new web stack.

Local results do not substitute for GitHub CI. A missing, skipped, cancelled, failing, or still-running required check blocks the merge. GitHub permission or Actions-enablement failures also block the merge. No production-gate claim follows from passing CI.

## Review and merge procedure

Use this sequence for each PR.

1. Run relevant local checks and fix failures without disabling them or narrowing test discovery to hide failures.
2. Run the Matt Pocock standards and specification review, followed by at least one pstack interrogate round. Keep the scope and reviewed commit explicit.
3. Reproduce each interrogate finding. Fix confirmed defects and recheck the changed behavior. Record any review limitations, including unavailable reviewer models.
4. Push the final implementation and wait for every required CI job on that head to succeed. Recheck PR review comments and unresolved findings.
5. Record the reviewed commit, CI run, and interrogate outcome in the PR. Merge only that commit, using `--match-head-commit` or equivalent protection against a changed head.

A subsequent implementation change needs relevant checks and review on the new head. A previous run's green status is not sufficient. A PR comment claiming review is not an independent security audit.

## Repository protection

This workflow and procedure provide checks and an agent merge rule. They do not configure GitHub branch protection. The current token could not inspect Actions permissions through the settings API. Repository-level required-check enforcement must be reported separately if it is configured later.

The three research PRs #33, #34, and #35 predate this instruction. Each had an interrogate round and local checks, but the repository had no GitHub CI workflow. They are not described as having passed CI.
