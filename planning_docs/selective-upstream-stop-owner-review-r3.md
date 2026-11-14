# W08 REVIEW-LOOP round 3 — owner, failure and isolation

## Verdict: PASS — zero Fix, zero Replan

Independent original-scope owner review of W07/W22 plus W23 against authorization `bd3344c` / catalog checkpoint `eac8480`. OR1-R2 and OR2-R2 are closed; OR1–OR5 and the protocol cross-seam obligations remain accounted for below. No Discard, new accepted risk, architecture replacement or required-proof waiver. No further same-root defect was found to trigger D19's Replan rule; D06's freeze was not used to excuse a bug.

Authority read: ledger P3/AC3/D06–D19, initial required acceptance matrix, approved Stop plan review r2, complete original owner/protocol reviews, complete owner/protocol round-two reviews, W22 receipt, corrected W23 `selective-upstream-stop-fix-r2.md`, current W07 accounting and README contract. Inspected the complete current Stop controller and proxy pipeline/process-owner/spawn seams, relevant settlement and doctor lifecycle bodies, complete queue and owner proof cases, doctor isolation and embedding changes. Inspected tracked source/embedding changes against `bd3344c`; new controller/fixtures were read directly, not assumed present in a tracked diff.

Only this new review artifact was written. No implementation/test/README/AGENTS/ledger changes, commits or subagents. No installed OMP/T3, real provider service, gh, browser, credentials or ambient user-state inspection/execution. No broad gate or reported failure was rerun.

## OR1-R2 — closed: ordinary transport failure reaches the process owner

`src/proxy.js:45–56` now distinguishes ordinary transport failure from an active Stop without confusing reader disposal with process termination. Ordinary failure latches `transportFailed`, invokes mandatory `onFatalStop` synchronously, then pauses client input and disposes the pipeline. Both readline Interfaces and both readable inputs are handled; client-output error/close and child-stdin error/write exceptions use the same path. Duplicate Interface/input error delivery is inert after the first handoff. Queued input/downstream callbacks and late doctor output cannot resume admission after retirement. Ordinary failure does not invent a clear/abort response.

Active Stop instead uses `StopController.fail`, retaining original correlated failure semantics. The production process `error` branch also calls the owner before pipeline disposal (`proxy.js:456–459`). Mandatory owner validation happens before doctor/readline construction or work admission.

`createProviderOwner` (`proxy.js:368–383`) still requests SIGKILL only on its direct child immediately and idempotently, observes actual `exit`, and schedules nonzero finish at the existing 250 ms observation timer. Stdin/stdout destruction follows the kill request; neither output callbacks nor descendant-held `close` gate finish. Missing exit remains explicitly “termination unconfirmed.” No EOF-first shutdown, TERM grace, global/group signal, retry, replay or restart was introduced.

### Actual-owner proof inspected, not rerun

`test/stop-owner.test.js:51–181` contains all **23 actual-main modes**: the original 17 active-Stop failure modes, retained-release asynchronous error/never-ack, and ordinary client-readable/child-readable/client-output/child-stdin errors. Ordinary cases use a persistent real synthetic child, not a pipeline-only callback assertion. All modes assert detection < SIGKILL < actual SIGKILL exit < finish(1), kill before stdin destruction, exactly one kill, no modeled EOF-drained queued marker, and a live indefinite pipe holder with child `close` still pending at finish. Assertions precede cleanup; cleanup cannot supply the claimed exit.

`stop-owner.test.js:200–285` contains **nine provider subprocess cases**: unsupported, timeout, output pressure, release pressure, asynchronous retained-write error, never-ack, and three ordinary transport errors. They leave external provider stdout unread, observe exit code 1, kill-before-EOF markers and observed-main-exit diagnosis, verify holder liveness through finish and unrelated sibling survival. Callback modes use an actual custom Writable; native stdout saturation is separately covered by pressure modes. These are synthetic provider processes using real repository components, not installed OMP/T3 execution.

The additional unconfirmed-exit case (`183–198`) distinguishes `close` from `exit` and keeps the fixed grace/nonzero finish honest. The receipt's 23 + 9 + 1 = **33 cases** matches the source.

## OR2-R2 — closed: admission no longer retires delivery ownership

`src/queue.js:54–65,252–284` captures transaction ownership for each admitted output callback. `release()` seals the original ordered admissions but retains the transaction while callbacks remain outstanding. Completion requires the sealed release, zero pending callbacks and the same live transaction. Errors fail before decrement/clean completion; stream error/close and synchronous closed/throw/false/admission-overflow paths still reach fatal ownership. No second output queue, adapter replay or drain wait was added.

The terminal cannot be recorded clean merely because `write()` returned true or `_write` began. For retained release, `onTerminal` runs only after all admitted output completes successfully; this also covers retained records after the terminal's position. A failed earlier state whose queued terminal never reaches `_write` cannot settle. Ordinary terminal output also uses its successful completion callback (`queue.js:235–239`).

New prompts remain forwardable after ordered old admission. They increment generation; old delivery retains failure ownership, but its successful cleanup cannot stop the new doctor's lifetime, clear its hold-open state or note it settled. Another Stop during pending delivery is an explicit overlap, not a new follower/hidden waiter. Disposal fails pending delivery once, and late callbacks are inert. A newly accepted Stop after successful retirement cannot be touched by saved old deadlines. Terminal bookkeeping and hold-open clearing share the same guarded `onTerminal` call in `proxy.js:101`.

### Timing and bounds

- Restore remains 1,000 ms from acceptance, armed before native cancellation/atomic writes.
- Restoration transitions to the existing 500 ms fence. Release does not renew it. Pending callbacks at expiry fail closed; missing-follower expiry releases and allows only a zero-delay observation turn for scheduled completions, not another grace/retry period.
- Fatal ownership still requests immediate kill and uses the existing 250 ms observation timer.
- One transaction/follower/normalized terminal; source terminal <=16 KiB; <=16 retained states totaling <=1 MiB; restore <=1 MiB; queued-plus-proposed Stop write <=1 MiB. Serialized frame accounting includes UTF-8 and LF.
- State destinations remain exact string IDs, <=16 entries / 16 KiB UTF-8, retired on response/failure/disposal. No response-history map, callback-record array, unbounded error queue or replay buffer was added. Completion bookkeeping is a count plus fixed captured release closure; Node's admitted queue remains byte-bounded during ownership.

### Real completion proof inspected

`test/queue.test.js:848–917` uses actual Writables with a 1 MiB high-water mark and a retained real `_write` callback, explicitly observing no `writableNeedDrain`. Seven cases cover callback error, destruction, never-ack at 499/500 ms, separate successful state/terminal callbacks, accepted-new-prompt failure/success, and disposal. Before state acknowledgement, the terminal has never entered `_write`, settlement is zero and release ownership is present. Terminal `_write` entry alone is insufficient. Failure cases preserve single clear/follower answers. Successful old completion does not settle a newer prompt; the saved old deadline cannot affect the next Stop.

Actual-main and provider callback cases additionally verify kill/exit/nonzero process completion, no settlement and no terminal `_write` marker. The corrected provider fixture establishes active state before Stop, so idle synthesis no longer places an unrelated terminal before the retained state. The receipt discloses the failed fixture attempt and correction rather than treating that attempt as pass evidence.

## Retained original obligations

| Obligation / original matrix rows | Independent disposition |
| --- | --- |
| OR1 readable errors; rows 16/20 | Interface and readable failures are both caught. Active and ordinary paths now reach actual process ownership; original unhandled-error and ordinary-orphan findings closed. |
| OR2 complete release; rows 9/16/19 | Synchronous admission failures and asynchronous completion/error/close/never-ack remain failure-owned. Successful terminal delivery and all retained writes precede settlement cleanup; closed. |
| OR3 caps/fatal admission; rows 17–18 | Cancellation, atomic and allowed reads share bounded child admission; client output is similarly bounded through release/fatal diagnostics. Real nonreading atomic/cancel/read fixtures and pressure cases remain. Fatal follow-on requests add no response stream; closed. |
| OR4 / PR3 isolation | Every real-doctor construction in `doctor.test.js` stays inside scratch-state lifetime, with controlled/fake version and issues disabled. Promise cleanup retains scratch through completion. Embeddings inject inert doctors. Outer HOME/XDG isolation is defense in depth, not the only protection; closed. |
| OR5 actual process proof; rows 15–16/18/20 | All 23 actual-main + nine provider + unconfirmed cases inspected, including ordinary and real asynchronous callback paths missing in round two. Actual exit/order, holder liveness/pending close, saturation, nonzero completion and sibling assertions precede cleanup; closed. |
| Stop admission/fidelity; rows 1–5/14–15 | One atomic/sweep/follower; explicit overlap; absent/null/numeric/string identities preserved; strict private type/command/ID ownership; complete restored-item validation, text order/duplicates/empties and loss notify; no fallback or fabricated recovery. |
| PR1 early follower; rows 2/6–8 | Active-turn text notify precedes clear/follower/finalizing release. Consumer observes recovered text before active-turn finalization. Early follower is not claimed as consumption acknowledgement; retained. |
| PR2 request destination; rows 6–8/18 | Exact string-ID routing precedes catalog/command adapters, ordinary projection precedes classification, external command/ID/outcome preserved. Wrong/missing/recognized-adapter labels cannot bypass the selective fence; bounded association retained. |
| PR4 consumer proof; rows 6–8/19 | Same-batch and actual split parses, permissive matched outcomes, pre/post-activity failure paths, notice-permit object replacement/absence, completed-fence disposal and unrelated traffic remain. No consumer predicate was weakened for the callback cutover. |
| All terminal/native seams; rows 9–10 | Explicit output records separate prefixes from terminal suffixes. Idle, agent-end, translated/raw settled, fallback/local and doctor producers share the writer. Native sweep/provenance cancellation remains before atomic admission; rejected prompt does not disarm it. |
| Mutation/timers/disposal; rows 11–13/17/19 | Attempted mutations invalidate follower association; unresolved mutations reject before side effects; completed mutations admit ordered old output first. Captured transaction/doctor identities, generation guards, disposal and stale private replies remain safe. |
| No-Stop preservation; row 21 | Ordinary output/settlement, pending-count projection, compaction, native children, signal forwarding and normal child-close source inspected. Embedding migrations inject owners/doctors rather than weakening unrelated assertions. Ordinary transport errors now explicitly terminate instead of orphaning. Full union preservation remains parent-owned. |

The Consumer remains native-Promise adversarial scheduling, not Effect/live-T3/rendering equivalence. The EOF marker remains a language-level accepted-work hazard model, not OMP queue execution. Requested 250 ms scheduling plus observed >=200 ms/<1,500 ms fixture bounds are qualified scheduler evidence, not a hard-real-time promise. Accepted gesture ambiguity, irrecoverable upstream loss, display limits, expiry not acknowledgement and non-universal external provenance/containment are unchanged and do not waive defects.

## New independent runtime evidence

Ran one finite inline Node command under fresh outer scratch HOME/XDG directories, removed on exit. Reused only the pre-test synthetic fixture definition; all pipelines injected inert doctors. No suite invocation or throwaway source file. Two previously unobserved terminal-first release scenarios used actual Node Writables:

1. Retained terminal completed successfully before a later retained state callback errored. Ownership remained live, settlement stayed zero, one owner failure occurred, and clear/follower were not answered twice.
2. The same terminal-first/later-held ordering, with an overlapping Stop rejected while delivery remained pending, then an accepted new prompt and successful old callbacks. The new prompt was forwarded; old completion did not settle it; delivery retired; the overlap retained its explicit failure identity; a saved old deadline could not affect a newly accepted Stop.

Observed exit 0:

```json
{"case":"terminal-first-later-retained-error","result":"PASS"}
{"case":"terminal-first-later-retained-success-new-prompt","result":"PASS"}
```

These supplement the inspected state-first callback cases; they are not new process-owner or full-suite executions. No heavy workload or fan-out was launched.

## Checkpoint accounting

W23 reports **277 component passes** and final **33/33 owner passes**, zero skips/cancellations. Those are attributed implementation evidence, not this reviewer's runtime results. This review independently inspected their fixtures and ran only the two new synthetic scenarios above.

D16's reported legacy launcher **323/324** failure remains ground truth, not reconfirmed, patched, hidden, waived or counted green. Actual P4 migration, its independent review and the parent's isolated full project/diagnostic/joint gates remain required before a green commit. This PASS closes the original-scope owner/failure review after W23; it does not self-certify the separate protocol round-three verdict or final union acceptance.
