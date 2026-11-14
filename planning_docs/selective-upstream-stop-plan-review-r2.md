# P3 PLAN-REVIEW round 2

## Verdict: PASS — R1 closed in the amended contract

Scope: static review of ledger P3/D06–D09, initial review R1 and accepted risks, W13's recorded T3 consumer semantics, and the independent safety proposal's EOF/termination evidence. No current implementation review, runtime compatibility claim, or acceptance-test pass is implied. No runtime, tests, browser, subprocess, subagent, or waiting was used. Only this new review file was written.

Authority: the supplied amended contract and ledger D09 govern the constants; D07 governs teardown. They supersede the initial review's atomic-write timer origin and TERM escalation recommendation. D06 architecture remains frozen. D08 concerns the separate catalog slice.

## R1 disposition

**Closed at plan level.** P3/D09 now require the same bounded gate for every potentially finalizing `get_state` response, classified **after existing pending-count projection**:

- Failed state replies are included: pre-activity failure can finalize immediately; post-activity failure can exhaust retries and terminate the connection.
- Successful idle, missing-field, ambiguous, and malformed results cannot escape through a stricter shim-only shape predicate. Consumer semantics, not literal `false`/zero requirements or mere field presence, determine whether a reply is definitely busy. W13 records T3's activity checks as “not true” and permits missing pending counts to mean idle. Acceptance must use the actual T3 predicate/error path for malformed values, not infer JavaScript truthiness rules from that summary.
- Definitely busy state replies and unrelated failed RPCs pass promptly. This is not a global response barrier.
- Preserve the projected response's actual outcome, payload and request identity. Never turn failed/ambiguous state into fabricated successful busy state or add a Stop-specific pending-count sentinel.

This closes the concrete failed-probe hole without changing architecture. The following evidence remains mandatory before an implementation checkpoint can pass.

## Exact required acceptance evidence

Use real proxy/settlement components with synthetic transport and a T3-like consumer implementing ordered chunk parsing, RPC waiters, asynchronous awaited-clear continuation, active-turn/generation guards, notice permit, independent probes, and pre-/post-activity failure behavior. Wire ordering or a callback-count mock alone is insufficient.

| Case | Required observation |
| --- | --- |
| Failed pre-activity probe | Issue probe before Stop. Deliver its failure before atomic success, then in a separate case after success but before follower. Notice is observed with the original turn active before probe-driven finalization. |
| Failed post-activity probe | Arrange the consumer at its final permitted retry; deliver the failing response on each side of atomic success. Retry exhaustion cannot terminate the connection before the active-turn notice. Preserve consumer retry semantics after release; do not retry the Stop operation. |
| Same-chunk scheduling | Deliver clear success, normalized terminal and finalizing probe in one chunk, parsed before the clear continuation runs; repeat with probe before clear success and with split chunks. The normal awaited follower releases ordered output only after the clear notice. Repeat the failed-probe cases, not only successful idle probes. |
| Permissive state semantics | Cover explicit idle; absent activity fields; absent pending count; malformed/null activity and pending values; malformed/missing success data. Compare against the actual T3 predicate/error path after existing projection. Any potentially finalizing outcome is held without fabrication. Include a raw count that becomes busy through projection to catch classification before projection. |
| Prompt passthrough | During restoring and completed-clear fencing, genuinely busy projected states, unrelated failed RPCs, streaming/tool/approval traffic and child-cancel replies pass in the same dispatch without waiting for restore/follower. Gated replies retain original IDs, failure detail and order. |
| Lone abort | Available text/loss notify is observed while active before any terminal or finalizing probe; no fabricated clear response. Include same-chunk failed probes. |

Retain the initial review's other acceptance rows: all terminal producers, exact internal ID/command ownership, queue text/loss fidelity, one sweep/follower, mutation-attempt invalidation, no stale callbacks, no-Stop behavior, and failure after partial withdrawal. R1 adds coverage; it does not replace those obligations.

## Selected finite bounds and failure proof

Use deterministic clocks and observe actual client/child frames:

- **Restore: 1,000 ms from accepting Stop**, including cancellation writes and OMP's accepted cancellation queue ahead of atomic execution. Block cancellation before the atomic write; failure still begins at the original deadline. Continuous traffic, duplicate terminals and late replies never reset it.
- **Completed-clear follower/finalization fence: 500 ms after emitting clear success.** Test success near the restore deadline, exact expiry, missing follower and late follower. Success transitions to this bounded fence, not another restore attempt. Expiry releases ordered old output, diagnoses incomplete handshake and retires the latch; it does not prove notice consumption. New mutation invalidates association; unresolved mutation is rejected before tracker/disarm/child writes.
- **Storage:** one transaction, one follower, one normalized terminal of at most 16 KiB; at most 16 deferred state frames totaling at most 1 MiB; retained restore frame at most 1 MiB. Test exact limits and one-over count/UTF-8 byte limits, including multibyte text and serialized newlines. Failed/malformed state replies consume the same budget. Coalesce duplicate terminals; do not retain raw duplicate payloads or create an unbounded output side queue. Overflow is explicit failure, never eviction, truncation or empty success.
- **Teardown:** latch fatal, reject new work and request immediate **owned-OMP SIGKILL before stdin/pipe closure**. The safety proposal records installed OMP draining accepted work on EOF; EOF-first or TERM grace is therefore not an equivalent policy. D07 explicitly overrides initial-review TERM escalation. No inherited/global process-group signal, fallback abort, automatic retry, replay or restart.
- **Failure observation:** return honest errors with original request commands/ID presence/types to outstanding Stop requests and an active-turn notice where writable; do not answer an already-successful clear twice or release held clean settlement. End the provider transport nonzero within **250 ms of failure detection** for bounded output/exit observation. That grace is not permission to defer SIGKILL. Observe actual process exit, not `child.killed` or pipe `close` alone; report termination unconfirmed if exit is not observed.

The owner fixture must queue a synthetic execution marker behind a blocked operation, model EOF draining, and tolerate/ignore TERM. On unsupported, post-withdraw generic failure, malformed result, timeout, overflow and transport failure: immediate owned kill precedes EOF, the queued marker never runs after termination, no unrelated process is signaled, output cannot hold the transport open beyond the grace, and late success cannot reverse failure. Test a non-reading output and inherited-open pipe handles as well as ordinary writable output. These are future acceptance requirements, not executions performed in this review.

## Preserved accepted risks

Unchanged from D06 and initial review §Accepted risks: no shared gesture ID (independent abort can consume the single same-generation latch); unrecoverable OMP text/image loss; T3's notice display truncation/empty-text omission; finite fence expiry is not consumer acknowledgement under stalls; external lifecycle provenance cannot be invented. Preserve transaction ownership across unsolicited `agent_start` and the tested new-mutation boundary. No promise of arbitrary plugin/remote delegate containment follows from killing the owned OMP child.

No remaining concrete plan Fix in this bounded amendment. Fabricated state/restoration, an escaping failed probe, unsafe EOF-first shutdown, missed caps/deadlines, stale lifecycle output, or missing required evidence remains **Fix** at implementation review, not an accepted risk or a new architecture round.
