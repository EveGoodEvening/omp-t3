# W21 — Independent joint-checkpoint PLAN-REVIEW

## Verdict: PASS — checkpoint boundary only

D16 legitimately combines the next P3/P4 green checkpoint. It does not authorize a red commit, waive the observed failure, approve P3 implementation, or reopen either architecture. No blocking Fix/Replan finding.

Reviewed only ledger D16, P3/P4/P5, AC and current work statuses; the approved routing plan review; and the Stop implementation receipt as evidence context. No implementation/source inspection, runtime, tests, delegates or commits. Only this document was written.

## Basis

- The parent result is authoritative: 324 tests, 323 pass, one failure at `test/launcher.test.js:150–154`; `process.kill(probe, 0)` did not throw ESRCH. The chained diagnostic did not run. Neither focused P3 successes nor this review establish a green tree.
- P4 already requires removing the entire fixed-list/probe/prune/retry/fallback mechanism. Its approved review §2.8 and §3.C independently require one final session, delayed readiness, natural child exit/status, bounded spawn failure and observed signal cleanup before harness cleanup. This replacement predates the failed gate; it is not an invented exemption.
- Keeping all W07 work subject to concrete W08 fixes preserves accountability. Serial W09 changes the already-approved mechanism rather than weakening its consumer contract. No AC/work item is dropped, no implementation revert is proposed, and the D06 P3 freeze continues through joint green.
- Repairing a mechanism that the next approved slice removes is not necessary to preserve the contract, provided removal and stronger replacement proof land together. Deleting only its failing test, suppressing its error, changing timing to force green, or leaving the old algorithm reachable would violate this approval.

## Required execution boundary and outstanding proof

1. Receive both independent W08 reviews and resolve concrete P3 findings before serial W09 implementation. A running review or worker receipt is not implementation PASS. Keep W07/W08 open until their actual obligations converge; no shared-file implementation overlap.
2. Remove the obsolete probe algorithm and its mechanism tests together with working P4. Demonstrate exactly one final child, readiness beyond the old cutoff, natural exit/status, signal-driven observed exit and no orphan/replacement before fixture cleanup. Preserve unrelated-process survival and all existing P3 owner/protocol obligations; one child alone is not cleanup proof.
3. Obtain independent W10 routing review and original-scope union review over the retained P3 work, W08 fixes and P4 migration. Earlier plan PASS and pre-P4 reviews cannot certify the combined implementation. Preserve P5/final W11/W12 review and gate obligations; no previously green catalog/menu/model/cap/opt-out contract becomes exempt.
4. Run full `npm test` under outer scratch HOME/XDG isolation and actual isolated `npm run check` on the combined final tree after the last behavioral change. Both must pass before committing P3+P4. Treat any new failure as concrete work, not a timing waiver. Prior worker diagnostic success does not substitute for the missing parent combined diagnostic.
5. On adopting D16, reconcile the ledger's introductory authorization sentence (currently still requiring a P3-only green checkpoint before W09) and superseded D11/D14/I18 ordering references through explicit D16 accounting. Preserve historical entries; record W21 as plan approval only. G1 remains unresolved as an implementation/gate failure until actual migration evidence and green gates close it.

These are completion constraints of the existing proposal, not a new architecture or an assertion that missing evidence already exists. No consumer contract reduction is approved.
