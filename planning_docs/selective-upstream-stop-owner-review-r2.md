# W08 REVIEW-LOOP round 2 — owner, failure and isolation

## Verdict: FIX — 2 High Fix, 0 Replan, 0 Discard

Independent original-scope review of W07 plus W22, not merely the corrective diff. Authority: ledger P3/AC3/D06–D17, initial required matrix, approved Stop plan review r2 and pinned consumer oracle. Read both complete round-one reviews, `selective-upstream-stop-fix-r1.md` and the corrected implementation receipt. D06 stays frozen; neither finding below requests another architecture or expands accepted risks.

Reviewed full current `src/queue.js`, `src/proxy.js` (including `createProviderOwner`, `spawnAndProxy`, signals and ordinary close), `src/settlement.js`, doctor lifecycle, complete queue/owner fixtures, doctor isolation, embedding migrations and Stop README/receipts. Compared tracked scope against `bd3344c`; new queue/owner files were read directly. Detailed consumer acceptance remains the other reviewer's responsibility; early-follower and string-ID correlation cross-seams were inspected here.

Only this new review file was written. No implementation, tests, existing docs, ledger, AGENTS, commits or subagents changed. No installed OMP/T3, provider service, gh, browser, credentials or ambient user-state inspection/execution. No broad gate or reported failure was rerun.

## OR1-R2 — High / Fix: ordinary transport errors retire readers but leave the process owner uninformed

**Locations:** `src/proxy.js:44–48,336–343,404–413,433–445`; `test/queue.test.js:813–823`.

The Interface/readable handlers now catch Node errors before an unhandled Interface throw. With an active Stop they synchronously call the idempotent fatal owner. That part of OR1 is corrected.

Outside Stop, however, `transportFailure()` only diagnoses and calls `stop()`. `stop()` closes readlines and stops the doctor; it does not signal the child, destroy its stdin, end the provider nonzero, or notify any process owner. `spawnAndProxy` only exits later on child `close`; its new `exit` hook also requires a Stop transaction. An ordinary broken client/child transport therefore leaves an owned main process running behind a permanently retired pipeline. New requests are dropped rather than handled, and the owner never learns why.

**Observed, previously unobserved synthetic case:** spawned an ordinary Node main child with a consuming stdin and persistent interval, attached the real pipeline and `createProviderOwner`, then emitted one actual client-readable error before any Stop. After the error handler and one event-loop turn:

```json
{"case":"ordinary-readable-owner","ownerFailed":false,"childExitCode":null,"childSignalCode":null,"childStdinDestroyed":false,"finish":null}
```

Stderr diagnosed `client input error: ordinary synthetic readable`. This is not a no-op error handler, but it is an owner/orphan failure: transport retirement does not terminate execution. The probe explicitly SIGKILLed and awaited its synthetic child only **after** recording this observation. That cleanup is not evidence of production cleanup.

The new ordinary-error regression asserts no child admission and **zero** fatal owner calls. It cannot establish the requested no-orphan ordinary error behavior; it currently pins the incomplete retirement.

**Required correction:** give ordinary unrecoverable transport failures an explicit process-owning shutdown path, not reader retirement alone. Preserve immediate kill-before-EOF where termination is required; do not replace this with stdin EOF or resurrect input admission. Keep the Stop-specific correlated errors distinct if needed. Prove ordinary errors with an actual synthetic owned child and nonzero provider completion/no orphan, rather than only an empty request list. No global process-group signaling.

## OR2-R2 — High / Fix: release ownership ends at write admission, before asynchronous output failure

**Locations:** `src/proxy.js:49–64,92,332–333`; `src/queue.js:229–247`; `test/queue.test.js:749–781`; `test/stop-owner.test.js:75–87`.

W22 correctly retains `transaction` across synchronous release writes and checks fatal state after each. Real `write() === false`, a throwing write, and already-closed output no longer reproduce round one's synchronous escape.

But a successful `Writable.write()` return means admission, not completed output. A retained state write can return `true` and later invoke its actual `_write` callback with an error. `release()` meanwhile admits the terminal, calls `onTerminal()` and clears `transaction`. The later real output `error` then takes the ordinary reader-retirement branch instead of the Stop owner. A clean terminal can be recorded without ever reaching the underlying writable.

**Observed, previously unobserved synthetic case:** actual Node Writable with a 1 MiB high-water mark; its retained `held` state frame's `_write` callback was retained while `write()` returned true. Active clear held a failed state followed by a terminal, restored successfully, then received its follower. Only afterward the retained callback completed with `Error('asynchronous retained-state write failure')`.

```json
{"case":"release-async-output-error","before":{"transaction":false,"settled":1,"ownerCalls":0,"queuedOutputBytes":143},"after":{"fatal":false,"transaction":false,"settled":1,"ownerCalls":0,"seenTypes":["agent_start","clear","follower","held"]}}
```

`seenTypes` records actual `_write` entry, not a count-only output mock: the terminal never entered `_write`, but `doctor.noteSettled()` had already run once. Stderr diagnosed `client output error: asynchronous retained-state write failure`. No owner handoff occurred. The clear/follower each appeared once; no duplicate-answer allegation is needed.

This is an asynchronous failure **of the retained release write**, not an unrelated error after completed delivery. It crosses the same full-flush lifetime OR2 requires. Fixing OR1 alone could make the later failure kill the process, but would not undo the premature clean-settlement bookkeeping.

**Required correction:** preserve Stop failure ownership through completion/failure of its admitted release output, including asynchronous Writable errors/closure; make terminal bookkeeping conditional on actual successful terminal output completion. A blocked or failed release must not record a clean terminal. Keep storage and observation bounded, no global output/replay queue or unbounded drain wait, and preserve the existing acceptance/follower timing contract and honest already-answered identities. Add this real callback-error case plus an actual-owner process case; do not weaken it into an overridden synchronous `write()` throw or callback count.

## Round-one disposition and original-scope accounting

| Obligation | Round-two evidence and disposition |
| --- | --- |
| OR1 Node Interface + readable errors | Both Interfaces and both readable inputs have explicit handlers. Actual PassThrough pending-Stop tests and real-main client/readable-error modes cover the original unhandled-error defect. Ordinary process ownership remains **Fix OR1-R2**. |
| OR2 pending output failure and full release | Pending error/close, synchronous false/throw, destroyed output and retained release admission now fail the owner. Flush checks prevent synchronous continuation/bookkeeping. Async release completion remains **Fix OR2-R2**; full-flush acceptance is not green. |
| OR3 bounded child/client admission | Static closure of the reported unbounded-write paths: proposed UTF-8 line plus `writableLength` checked against 1 MiB while Stop owns writes; false writes immediately fail. Atomic/cancellation/allowed reads share `writeChild`. Fatal input is paused/closed after synchronous owner handoff; queued line handlers and downstream/doctor output are fatal-guarded. Only the finite original Stop requests/notice are attempted, subject to output cap. No replay queue or unbounded new error queue found. Real non-reading atomic/cancel/read cases and over-budget tests distinguish actual buffered pressure from timer origin. Async completion ownership is separately OR2-R2. |
| OR4 / PR3 fixture isolation | **Closed statically.** The new real-doctor regression is inside `withTempStateHome`; all seven doctor constructions use that scratch lifetime and issue-disabled controlled/fake versions. Async helper returns `result.finally(cleanup)`. E2E/approval/usage/parity now inject inert doctors; queue/owner/catalog/check-shell embeddings also inject doctors. No default production doctor construction found in these embeddings. Outer scratch gates remain defense in depth, not the isolation mechanism. Historical W07 inherited-environment uncertainty remains explicitly disclosed, not erased. |
| OR5 real process/failure proof | Substantially corrected: 17 active-Stop real-main modes; actual SIGKILL/exit before finish and cleanup; kill before stdin destruction; indefinite holder alive and `close` pending at finish, including timeout; actual false writes for nonreaders/saturated output; four provider subprocess nonzero-exit cases; unrelated sibling survival; unconfirmed-exit diagnosis does not confuse `close` with `exit`. This covers the enumerated W22 modes, **not** the newly observed ordinary-owner/async-release paths. Required additions belong to OR1-R2/OR2-R2; no separate third finding or blanket matrix PASS. |
| PR1 early-follower cross-seam | Available text notify is emitted before clear/follower responses and retained finalizing frames; the existing Consumer test observes text while active, not only wire order. No claim that early follower acknowledges clear consumption. Later awaited abort may be a fresh gesture under the accepted ambiguity. |
| PR2 state-ID cross-seam | Exact string state-request destination is registered before forwarding and checked before catalog/command adapters. Shared ordinary projection runs first; original command, ID and outcome remain intact. Wrong/missing/recognized-adapter command tests cover pre/post success and activity. Private atomic command validation remains strict. Set capped at 16 IDs / aggregate 16 KiB UTF-8, retired on response/fatal/dispose; no unbounded correlation map. Ordinary limit rejection and possible capacity retention until response/disposal are honestly documented. |
| PR4 consumer proof | Actual separate parses/continuation opportunities, same-ID active-object replacement/absence at permit acquisition, permissive matched outcomes, completed-fence traffic and post-success disposal were added. Detailed equivalence judgment remains with the consumer reviewer. No consumer result overrides these owner findings. |

### Complete initial-matrix coverage boundary

Numbers follow the initial required matrix / corrected W07 receipt, not newly invented acceptance rows.

| Rows | Original behavior reviewed | Result / limit |
| --- | --- | --- |
| 1–5 | Active/idle/paused Stop, early follower/overlap, lone-abort notify/loss, text fidelity | Source validates both arrays and every item, preserves available order/duplicates/empties/IDs, one sweep/atomic/follower. Early-follower correction inspected; malformed result remains fatal. Existing consumer/process evidence is synthetic. |
| 6–8 | Same/split parsing, independent probes, unrelated traffic | Selective state/terminal fence follows ordinary projection; failed and permissive idle outcomes held, finite nonzero/literal activity busy outcomes pass. Request correlation precedes adapters. Split/Consumer corrections inspected; other reviewer owns detailed protocol PASS. |
| 9–10 | Every terminal producer and native-child cancellation/provenance | Tracker batch seam separates prompt/agent-end prefixes from terminal suffix; all writers enter Stop output. Admission precedes tracker/disarm/child writes. Existing e2e migrations preserve native cancellation assertions and atomic response behavior. Actual-emission bookkeeping still fails async release: OR2-R2. |
| 11–13 | Missing follower, completed mutation, unresolved mutation | 1,000 ms armed before cancellation; 500 ms completed-clear fence unchanged. Mutation attempt invalidates association; unresolved mutation rejected before side effects; completed mutation releases before forwarding. Exact deterministic boundary and synchronous cancellation-delay cases remain. No timing waiver. |
| 14–15 | Public/private identity and unsupported/malformed/partial failure | Public ID presence/types preserved; per-pipeline random namespace and exact private command/type/ID; old replies consumed. Generic failure does not claim no withdrawal; no retry/plain abort/empty success. Partial fixture records withdrawal. |
| 16 | Timeout/EOF/transport | Pending synchronous/stream failures now have real-owner cases. **Incomplete** for ordinary ownership and asynchronous retained-output completion; findings above. |
| 17–19 | Late replies, caps/traffic, disposal/stale callbacks | Captured transaction and doctor-announcement identities guard queued old timers, including success/new-prompt and completed-fence disposal. Fatal/disposed output inert; exact/one-over retained UTF-8/LF limits, count/aggregate caps and sustained traffic cases remain. Async release lifetime is not covered by those timer guards. |
| 20 | Production process owner | Direct-child SIGKILL immediately, actual `exit` independently observed, fixed 250 ms requested observation then nonzero finish, no waiting on `close` or output callbacks. No inherited/global group kill, TERM grace, reconnect/restart/replay. Pending Stop close/exit ownership inspected. Normal signals still forward to direct child; ordinary transport retirement remains OR1-R2. |
| 21 | No-Stop preservation | Ordinary completion/signal/close source inspected; embedding/catalog/approval/usage checks retained. No broad preservation PASS claimed: ordinary-error path is concretely broken, and D16's known launcher failure remains parent-owned until actual P4 migration plus full isolated gates. |

The owner fixture is honestly a language-level accepted-serial-work EOF hazard model, **not OMP queue execution**. The approved safety document's installed-source record supplies the separate OMP EOF-drain premise; this review did not inspect or run installed OMP. The holder and actual child-exit assertions are materially stronger than round one. The requested 250 ms timer plus observed >=200 ms/<1,500 ms scheduler-qualified elapsed checks are not a hard-real-time <=250 ms measurement; W22 now states that limitation explicitly. Native-Promise Consumer scheduling is adversarial evidence, not Effect/live-T3/rendering equivalence.

## Verification and delivery accounting

- W22 reports final **270 component + 22 owner passes in separate gates**; these were read, not independently rerun or relabeled full-suite proof.
- Parent full gate's **323/324 legacy-probe interrupt failure** is accepted ground truth. No reconfirmation or broad suite was run. D16's actual P4 algorithm removal/replacement cleanup contract and parent joint green gates remain required, not waived.
- This review ran one finite inline Node command containing exactly two new synthetic lifetime probes quoted above. Scratch HOME/XDG paths surrounded execution and were removed afterward; every pipeline injected an inert doctor. Actual child used `process.execPath`, empty environment and owned cleanup; no shell/provider/OMP/gh execution inside it. The second probe used real Node streams only. Command exited 0. No throwaway source file was created.
- No heavy-gate-eligible runtime or fan-out launched. LSP reported no configured servers.

**Acceptance remains blocked on OR1-R2 and OR2-R2.** OR3/OR4 corrections and the expanded OR5 evidence are retained; no code is discarded, no new risk is accepted, and no further architecture round is requested. Receipts/README full-flush and ordinary-retirement claims need correction with the fixes and corresponding actual-owner evidence. Only this review artifact changed.
