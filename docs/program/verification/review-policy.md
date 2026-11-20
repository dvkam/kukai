# Review verification evidence

Apply this procedure to PoC and baseline verification work. Keep the evidence category and review status explicit.

## State the claim before modeling

1. Assign a stable property ID and preserve its source obligation or subclause.
2. Write its normative statement, preconditions, state transitions, covered paths, attacker powers, and trust assumptions.
3. Classify each formula as safety, liveness, or an external assumption. Split mixed formulas. Unresolved classification blocks acceptance.
4. Record the gate, tool/version, expected evidence, model file, implementation reference, known limits, and reviewer. Missing references remain explicitly unfilled.
5. Freeze the model-specific list before writing the model. Record refinements as a reviewed change with old/new formulas, reasons, counterexamples, and affected gates. Never delete a difficult property silently.

## Interpret results

Use these result categories.

| Result | Meaning |
| --- | --- |
| Unrun | No tool result exists. |
| Bounded check passed | No counterexample was found within the recorded finite bounds. No general proof is claimed. |
| Proved under stated assumptions | A proof artifact establishes the specified property in the exact model and proof scope. Record every trusted component. |
| Counterexample within assumptions | The guarantee fails. Change the design or guarantee and reopen the relevant gate. Never waive it. |
| Incomplete, unverified | Timeout, unsupported expression, or incomplete proof. A mandatory safety gate remains blocked. |
| Accepted exception, unverified | The owner accepted an eligible incomplete liveness/performance result with a risk, closing date, and follow-up. This is never called verified. |
| Expected residual demonstrated | An attacker breaks a named assumption and produces the predeclared residual. This does not prove the guarantee with that assumption removed. |
| Recorded-trace conformance passed | The supplied executions conform to the specified transition mapping. Unrecorded executions remain unproved. |

Keep the baseline requirement lifecycle separate from these result categories: Proposed, Specified, Reviewed, Verified, Implemented, Conformance-tested, Audited. A successful compilation changes neither lifecycle nor proof status.

## Check assumptions and mutations

Run the ordinary attacker within the stated assumptions first. Then break each listed assumption separately. Record combinations relevant to named residuals, including a malicious web release plus a compromised signer. Reject an unexpected counterexample even when it occurs outside the original assumptions. Do not add assumptions merely to dismiss a failure.

Every claimed proof needs a deliberate mutation that violates its property and is caught by the relevant checker. Examples include bypassing an authorization guard, replaying another request's approval, resetting the dispute timer, accepting a stale share generation, or allowing an agent to add authority. Record the mutation, expected failed property, actual counterexample, and restored model revision. An undetected mutation blocks acceptance until the formula or observation model is fixed.

The initial TLC exploration bounds are three devices, two identity providers, two concurrent sessions, four signing requests, and one recovery in flight. Record every additional finite domain, time bound, and fairness condition. These bounds are exploration settings, not an unbounded proof. Any Apalache inductive argument must state and discharge its actual obligations. Do not label an ordinary bounded Apalache result unbounded.

If tools disagree about the same property under the same assumptions, retain both results and reconcile the models before passing the gate. A timeout is incomplete evidence, not a contradictory proof result.

## Validate implementation traces

Define an event schema before recording traces. Each event needs a component ID, local logical clock, request/session identity, chain/account context where applicable, event type, and nonsecret state references. A logical clock gives local order; it does not by itself define a total order across processes.

Maintain a mapping from each event type to a model action, including its guard, state updates, and treatment of concurrent events. Map all events recorded by the conformance and adversarial suites. An unmapped event, impossible transition, or unexplained gap fails that trace's validation. Protect private data and never log shares, recovery factors, tokens, nonces, or presignatures.

Report recorded-trace results separately from state-space exploration and proof results. Include the implementation commit, model revision, mapper revision, tool versions, trace digest, coverage limits, and trusted abstractions.

## Freeze and accept

Preserve `initial-obligations-v0.1.json` as the source snapshot. Add a new version and a change record for refinements. A content digest identifies the snapshot; it is not a security approval or a mechanism that prevents an authorized repository edit.

`dvkam` is the current human PoC reviewer. Agent reviews can find defects and check evidence, but cannot fill the baseline's independent security-review role. Keep P0-06 and the relevant production gates open until their acceptance conditions are met. Record the final reviewer and outcome explicitly.
