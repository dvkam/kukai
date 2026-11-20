# Experiment evidence template

Copy this template into the ticket's evidence directory. Replace every placeholder and label each case Passed, Failed, Unrun, or Deferred. A failed experiment can answer a research question without passing admission.

## Question and scope

Record the ticket, owner, hypothesis, candidate design, and technical prerequisites. Identify the scope as PoC or baseline gate evidence. List the exact signing, recovery, and exit paths under test, with their trust assumptions.

## Inputs

Record these inputs before running the experiment.

- Pin every repository, crate, dependency lockfile, compiler, verifier, solver, feature flag, and protocol version.
- Name the OS, CPU architecture, browser, device model, and runtime. Record measurement conditions separately from functional tests.
- Identify test-only fixtures, deterministic vectors, and entropy sources. Do not publish secret shares, session credentials, or recovery factors.
- Define expected positive and negative outcomes before seeing the results. Include abort, retry, concurrency, stale backup, invalid quorum, and attacker cases relevant to the hypothesis.

## Commands and results

Retain exact setup and execution commands, exit codes, logs, and output digests. Record the chain verifier's result separately from cryptographic self-verification. State whether project-operated services were blocked during an exit drill and how the block was enforced.

Record each outcome in a table with the case, expected result, actual result, status, and evidence path. Distinguish a compile check, a runtime test, a bounded model check, and a proof. Do not infer an unrun platform result from another platform.

## Review and decision

Record the implementation author, PoC reviewer, final adversarial findings, reproduced failures, and fixes. Identify any required specialist or independent review that remains missing. State the assumptions, residual risks, properties still unverified, and affected decisions to reopen.

A decision needs the owner's acceptance under the charter. A baseline gate additionally needs its required evidence and reviewer conditions. Preserve unresolved evidence rather than describing a PoC as production-ready.
