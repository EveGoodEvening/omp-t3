# W08 REVIEW-LOOP round 1 — process, failure and isolation

## Verdict: Fix

Independent review of W07's uncommitted Stop implementation against `eac8480` / `bd3344c`. Authority: ledger P3/AC3, D06–D09/D14/D15, Stop plan review round two, safety-design EOF evidence, and the W07 implementation receipt. D06 architecture remains frozen; the findings below are concrete implementation or required-proof defects inside that architecture.

Reviewed `src/queue.js`, `src/proxy.js`, the settlement changes/output-record seam, doctor lifecycle changes, owner/queue fixtures, doctor isolation, embedding-fixture migrations and Stop documentation. The other reviewer owns detailed consumer-oracle equivalence. No implementation, test, README, AGENTS or ledger edits; no commits or subagents. Only this review file was created.

## Fixes

### OR1 — P1: readable transport errors escape before the fatal owner is called

**Locations:** `src/proxy.js:110–121,292–303`.

Both readline interfaces lack an `error` handler. Node readline forwards an input stream error by emitting `error` on its interface. The `childOut.on('error', ...)` handler added later does not protect against an unhandled interface error: readline's earlier input listener throws first. `clientIn` has neither an input error handler nor an interface error handler.

Isolated component counterexamples, each after accepting `clear_queue`, produced:

```json
{"scenario":"childOut error","thrown":"synthetic transport","ownerCalls":0,"fatal":false}
{"scenario":"clientIn error","thrown":"synthetic transport","ownerCalls":0,"fatal":false}
```

These used actual Node `PassThrough` streams and `createProxyPipeline`; the surrounding probe caught the synchronous exception only to observe it. Without that catch, the unhandled error terminates the provider rather than requesting owned-main SIGKILL first. **[INFERENCE]** Provider death then closes its owned input pipe while the main child may remain alive, exposing precisely the accepted-work EOF drain documented in the safety evidence. Outstanding Stop errors/notice are also bypassed.

**Required correction:** wire readable/readline failures to the same idempotent fatal Stop handoff, without an intermediate unhandled interface error or EOF-first exit. Keep ordinary non-Stop error behavior explicit. Add isolated regressions for both inputs, including real synthetic-owner ordering/exit evidence; do not merely add an `uncaughtException` suppressor or a no-op error handler.

### OR2 — P1: output failure is ignored during finalization release, and closed output is silently skipped

**Locations:** `src/proxy.js:44–49`; `src/queue.js:215–227`.

`release()` clears `this.transaction` before flushing retained state/terminal records. `rawEmit()` detects a thrown write or `write() === false` only when that transaction still exists. Consequently, backpressure during the very flush owned by Stop is treated as ordinary successful output, the remaining records continue into the blocked writable, and `onTerminal()` records settlement. Separately, `clientOut.destroyed` returns immediately without failing even an unresolved transaction; output `close` is not observed.

Counterexamples:

```json
{"scenario":"destroyed client output","ownerCalls":0,"fatal":false,"transaction":true}
{"scenario":"backpressure during release","bufferedBytes":2130,"needDrain":true,"ownerCalls":0,"fatal":false,"settledBookkeeping":true}
```

The release case used a real `Writable` with a 1,024-byte high-water mark, a deferred failed `get_state` response with a 2,048-character error, an early follower, and a valid atomic success. Its write callback deliberately stopped acknowledging the state frame. No mock replaced `StopController.release` or `rawEmit`.

**Required correction:** retain failure ownership through the complete bounded flush, stop that flush on failure, and do not bookkeep or enqueue a held clean terminal after transport failure. Treat an already closed/destroyed output or output closure during Stop as immediate transport failure. Preserve honest already-answered clear/follower semantics; do not manufacture a second answer. Cover both a thrown/failed write during release and real writable backpressure, not just failure while `transaction` is populated.

### OR3 — P1: stream write admission remains unbounded, including after fatal Stop

**Locations:** `src/proxy.js:44–59,124–131`; `src/queue.js:82–86,229–241`.

`writeChild()` ignores the return value of `childIn.write()`. During unresolved Stop, the immediate-read/control whitelist can therefore append unlimited writes to a non-reading main child's writable queue. There is no pause, rejection or byte cap on that queue. The acceptance timer exists, but is not a storage bound.

After fatal failure, the client readline continues accepting requests. Every parsed request produces another error through `StopController.upstream()`. `rawEmit()` no longer checks backpressure because fatal teardown cleared the transaction. A blocked client can thus accumulate an unbounded error-output queue before the exit timer runs.

Bounded probes deliberately stopped at 32 requests:

```json
{"scenario":"nonreading OMP stdin","bufferedBytes":2098674,"needDrain":true,"ownerCalls":0}
{"fatal":true,"ownerCalls":1,"bufferedOutput":2101243,"needDrain":true}
```

The first used a real `Writable({highWaterMark:64})` whose first `_write` never completed, then 32 whitelisted `get_messages` requests with 65,536-character payloads. The second used the same kind of non-reading client output, failed the atomic operation, then sent 32 prompts with large string IDs. Both are synchronous finite admission demonstrations, not assertions about OS scheduling or an elapsed production grace period. The synthetic owner in these probes recorded the handoff; it was not a process-termination proof.

**Required correction:** bound write admission while Stop owns failure handling, including native cancellation/atomic writes and permitted read/control traffic; do not build a replay queue. Stop consuming/responding without bound after fatal teardown while still attempting the finite outstanding Stop errors/notice. Retain the acceptance-origin 1,000 ms deadline. Add actual non-reading-input and saturated-output regressions. The existing synchronous cancellation-clock test proves timer origin, not a bound on Node's buffered write queue.

### OR4 — P2: the new watchdog regression is not independently state-hermetic

**Locations:** `test/doctor.test.js:154–173`; `src/doctor.js:18–28,48–54`; embedding fixtures using the default doctor, including `test/e2e.test.js:24` and `test/approval.test.js:12`.

The new retired-watchdog test constructs `ContractDoctor` outside `withTempStateHome`. Construction immediately calls `loadState()` against inherited `XDG_STATE_HOME` / HOME. `issuesEnabled:false` and the controlled `ompVersion` prevent issue filing/version execution in that test, but do not prevent this read. The earlier asynchronous helper correction is sound; it simply does not wrap this new test.

The changed embedding fixtures still commonly instantiate the default production doctor, which reads inherited state and defaults issue creation on. The reported final outer scratch environment protects state during that particular command, but does not make the tests themselves safe to run individually. An outer HOME/XDG boundary also does not disable production `gh` execution if a real doctor report is reached.

**Required correction:** wrap the new real-doctor regression in the scratch-state lifetime helper; ensure embedding tests use an inert doctor or an explicitly issue-disabled, controlled-version real doctor with scratch state. Retain the outer isolated parent gate as defense in depth. No real `gh`, installed OMP version command, credentials or user state should be needed for any fixture path.

This finding is static. This reviewer did not read inherited state, invoke `gh`, or run installed OMP, and does not allege that those executions occurred in the reported final run. W07's early inherited-environment caveat remains an honest limitation, not repaired evidence.

### OR5 — P2: required process/failure evidence is incomplete; the receipt overstates matrix closure

**Locations:** `test/stop-owner.test.js:13–94,114–159`; `test/queue.test.js:319–327,392–405`; implementation receipt matrix rows 16/18/20.

The seven real-main cases are useful, but they do not cover every transport failure class required by the accepted plan. Every real-main scenario starts idle; no `agent_start` is supplied. `write` manually emits an error on child stdin after the atomic request was accepted; it does not exercise a thrown write, a non-reading input queue, or readable transport errors. `overflow` is restore-frame overflow, not state/terminal or saturated-stream output failure. There are no actual-owner cases for client input EOF/error, child output error, client output error/closure/backpressure, or the release-time failure in OR2. The standalone provider-exit cases cover only unsupported and timeout.

The non-reading `Writable` and unread subprocess stdout establish that the finish path does not wait for callbacks/drain under their small output load. They do **not** force `write() === false` and therefore do not test the claimed backpressure failure path. The test asserts a scheduled delay of 250 ms and broad test timeouts; it does not independently measure detection-to-provider-exit or assert that descendant-held pipe closure remains pending at finish. In the 1,000 ms timeout scenario the descendant's fixed 750 ms lifetime can expire before failure even begins.

The synthetic marker is an unconditional stdin-`end` callback, not a modeled accepted serial queue behind a blocked operation. That is valid evidence of the modeled EOF hazard and must be described at that strength. It is not execution of OMP's queue implementation. The installed-source evidence separately supplies that premise.

**Required correction:** add the missing failure-path regressions, exercising real stream behavior and actual owned-main exit where process ordering is claimed. Ensure at least an active pending Stop is represented, a pipe holder really survives through observation/finish, and saturated output/non-reading input are reached rather than merely named. Record detection, kill request, actual exit, input closure and provider finish ordering; deterministic 250 ms scheduling plus appropriately qualified elapsed observation is sufficient, not an impossible hard-real-time promise. Update the receipt's acceptance accounting to distinguish covered cases from gaps. Do not mark all transport failures accepted because they nominally share `fail()`; OR1 and OR2 demonstrate why that inference is unsound.

## Accepted observations and exact limitations

| Surface | Accepted static evidence | Existing fixture strength / remaining limit |
| --- | --- | --- |
| Unsupported, malformed restore, generic post-withdraw failure | `internal()` routes to one fatal latch; no empty success/plain abort/retry. Generic failure does not claim no withdrawal. | Seven-mode owner fixture includes each; partial mode writes `.withdrawn` before failure. Not rerun here. |
| Restore timeout | Timer armed before abort sweep; acceptance identity checked; no traffic reset. | Deterministic origin test consumes 1,000 ms inside cancellation dispatch. Does not cover real buffered input admission (OR3). |
| Failure ordering and exit ownership | `fail()` calls owner before notice/errors; owner immediately requests direct-child SIGKILL, then schedules bounded finish. No TERM grace, inherited/global pgid, replay, reconnect or restart was found. | Real-main tests assert actual `exit` with SIGKILL before cleanup, not `child.killed`. Their `finally` cleanup cannot satisfy assertions executed before it. Missing transport branches remain OR5. |
| EOF | Child stdout readline close and client input readline close route pending Stop to failure. | Existing EOF owner mode ends synthetic stdout; no real client-EOF case. Readable errors are broken separately (OR1). |
| Unconfirmed kill | Owner tracks `exit`, not `close`; diagnosis says `termination unconfirmed` if absent. | Fake owner returns false from kill and emits only close; deterministic expiry confirms truthful diagnosis/nonzero finish. No real permission-denied kill was attempted or claimed. |
| Retained pipes / non-reader | Owner never waits for `close` or output callbacks before its finish callback. | Useful small-output and process-exit evidence; not saturated backpressure, and timeout pipe-holder lifetime is insufficient (OR5). |
| Outstanding identity / held settlement | Failure preserves request command and ID presence/type, skips already-answered requests, and drops transaction-held terminal/state rather than releasing them. | Queue cases exercise independent identities and failures. Release-time transport failure escapes this policy (OR2). |
| Caps | Admission checks exist for normalized-terminal source, deferred state count/UTF-8 bytes and restore frame; duplicates coalesce. | Queue exact/one-over fixtures cover these retained records. They are not bounds on input/output writable queues or readline's raw framing buffers. OR3 remains a Fix. |
| Timer retirement / disposal | Restore/follower callbacks check captured transaction identity; doctor watchdog checks captured announcement identity; `stop()` clears pending identity. Disposal fails a pending transaction before setting disposed. | Queue stale-callback tests and the real-doctor regression are relevant; the latter needs OR4 isolation. Direct post-fatal pipeline output is inert. |
| Native-child cancellation | Sweep runs inside the armed transaction before atomic write; rejected mutation returns before tracker/disarm/child admission. | Existing e2e provenance tests are relevant. Not proof of arbitrary external/remote delegate containment. |
| Ordinary lifecycle / SIGINT / catalog / roles | Existing normal signal forwarding and normal close handling remain outside fatal-owner branch. Catalog, role-policy and routing implementation files are not modified by this slice. | Static preservation only in this review. No normal-signal runtime proof or full-suite result was generated here; parent owns the ongoing union gates. No consumer-equivalence PASS is implied. |

D06 accepted limitations remain accepted: no shared gesture ID, one eligible follower ambiguity, irreversible upstream text/image loss, T3 display truncation/empty-text omission, finite fence not being acknowledgement, arbitrary external lifecycle provenance/containment. None explains away OR1–OR5.

## Review execution

Static reads and scoped diff inspection first. Two finite inline Node probes used only repository components and synthetic streams, under newly created scratch HOME/XDG directories removed afterward. Exact observations are quoted above. No paid/runtime provider, installed OMP, browser, Electron, emulator, heavy workload, credential/state-file inspection, real settings change, broad test suite or duplicate isolated check was performed. No result from the parent's ongoing full suite is claimed.

**Acceptance remains blocked on OR1–OR5.** This is not a new architecture proposal or an external-risk waiver.
