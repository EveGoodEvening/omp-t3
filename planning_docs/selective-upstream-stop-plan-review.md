# W16 — Independent P3 Stop plan review

## Verdict: FIX — one concrete acceptance gap; no replan

The frozen transaction/barrier/owned-provider-failure design is suitable for implementation. **R1 below must be included in its gate predicate and acceptance evidence.** It is a correctness fix inside that design, not a request to reopen D06. No global buffering, protocol redesign, retry, queue database, or additional orchestration is recommended.

This is a static plan review, not an implementation review or runtime compatibility certificate. Read the ledger's P3/AC3/D03/D05/D06, independent plan AC3 and §3, completed W03 spike and W13 runtime evidence, and the relevant local source. No browser, runtime, test, model, delegate, subprocess, or server was launched. Only this new review document was written; no implementation, ledger, README, AGENTS, or commit changed. No language server was available for the attempted command-bridge symbol query; source inspection used reads instead.

Authority: the supplied concrete contract and ledger D06 supersede older proposal wording about fresh aborts after clear, unrestricted state-response passthrough, optional fallback, and unresolved architecture choices. W13 is source-derived T3 evidence plus a simplified tool model, not a live consumer proof; W03's three abstract scenarios do not prove the acceptance matrix below. W14's unfinished artifact was not assumed to exist or treated as completed evidence.

## R1 — Fix: failed settle probes can finalize before the Stop notice

**Evidence:** W13's “Actual T3 Stop flow,” fourth bullet, records that a failed pre-activity `get_state` settle probe finalizes immediately; failed post-activity probes can exhaust retries and terminate the connection. The ledger P3 and plan §3.3 concentrate on **idle** state results. The successful-idle predicate alone is insufficient.

**Counterexample:** T3 has issued a pre-activity probe; clear starts the Stop barrier; OMP returns an error for that probe before returning the atomic withdrawal. If errors pass as “not idle,” T3 clears `activeTurn`. The later clear result or loss/failure notify cannot create the promised active-turn notice, even though every `agent_settled` was retained.

**Required fix, within the frozen architecture:** identify state replies capable of finalizing by the consumer contract, including failed replies, not just successful idle data. Apply the same finite response cap/deadline to them. Since the shim cannot distinguish an ordinary `get_state` request from a T3 settle probe by command alone, a failed `get_state` reply during the barrier must conservatively be treated as potentially finalizing. Successful definitely nonfinalizing state replies still pass promptly. Do not hold failures for other RPC commands. Do not convert a failed probe to successful/busy data.

Classify success **after** the existing pending-count translation. Follow T3's permissive idle semantics: missing `isStreaming`/`isCompacting` does not prove activity, and missing pending count can mean idle. Do not require literal `false` or a literal zero if the consumer does not. Ambiguous/malformed success must not bypass the gate merely because its shape fails a stricter shim predicate; preserve its actual consumer outcome without fabricating state.

**Required evidence:** a T3-like consumer with an already-issued pre-activity failed probe, plus a post-activity retry-exhaustion case, receives the notice while active before any gated finalization. Exercise each with the failure arriving before and after atomic success, including clear response and probe in one input chunk. An unrelated failed RPC and a genuinely busy state reply remain prompt. This closes a concrete notice-before-settle hole; it does not authorize holding all downlink traffic.

## Frozen contract accepted for implementation

- One active Stop transaction; explicit request-presence booleans separate from ID values. Preserve absent ID versus explicit null, numeric `0`, string IDs, and the original command in responses. Reject overlap explicitly rather than invent a shim queue or merge distinct clears.
- Reserve a random per-pipeline private ID namespace; reject conflicting client IDs before forwarding. Accept a restore result only for the exact private ID **and** `type: response`/atomic command. An owned-ID wrong-command reply must never complete success or leak as a client reply; treat it as a malformed internal result and fail closed. Consume later owned-namespace replies without changing newer state.
- Arm the barrier before entering settlement's abort transition. Invoke native-child card closure/cancellation once, before writing the atomic command. A clear follower does not repeat either operation. Continue provenance-based cancellation of late children through the existing bridge.
- On success, preserve every available text in steering/follow-up order, including duplicates, whitespace, and empty strings. Validate both arrays and every entry; do not filter malformed members into a successful empty queue. No unsolicited clear response for a lone abort.
- Emit OMP loss diagnostics through `extension_ui_request`/`notify` while active, not stderr or response metadata alone. A lone-abort client ignores returned queue data in old T3: emit a text notice with the available withdrawn texts as well as its correlated response, with explicit loss/display limitations. An empty successful queue is distinct from a failed/unknown withdrawal.
- Completed clear retains one follower latch only while its mutation generation is unchanged. Missing follower expires; no permanent barrier. New prompt after completed restore flushes old deferred output and retires the latch **before** forwarding. A subsequent abort is a new atomic Stop.
- Every new mutating request invalidates follower association, including a rejected mutation while restoring. Reject unresolved mutation before settlement reset, subagent disarm, command side effects, or child forwarding. A rejected request is not accepted input and is never replayed automatically.
- Unsupported, malformed, generic, timed-out, or transport-failed atomic operations produce honest correlated failures and an active-turn notify, then fail-close only this shim-owned provider through an injected owner callback. Never infer no withdrawal from generic failure; no atomic retry, plain-abort fallback, fake queue success, or optimistic terminal success.
- Dispose/exit/write failure retires transaction ownership and timers; late callbacks are inert. Normal non-Stop completion remains unchanged.

## Concrete implementation seams and bounds

These are recommendations for W07, not source edits or a second architecture.

### Output and lifecycle

`src/proxy.js:39-44,56-60,98-101,197-203,209-241` currently has multiple direct client writers. The upstream idle-abort result is synchronous (`src/settlement.js:95-112`); merely gating the child stream misses it. `doctor.onSynth` writes directly. Settlement can return a response plus terminal in one string (`src/settlement.js:220-222,253-255`); treating that whole string as one deferred terminal unnecessarily blocks the response. Command-only, fallback prompt-result, translated session-settled, and raw terminal passthrough paths all need the same final writer.

Use a single Stop-aware emission seam and explicit terminal records/ordered frame batches. Preserve nonterminal prefix frames and tool-card output; do not rerun trackers over deferred raw frames. Intercept private atomic replies before doctor/settlement/command/subagent processing. Keep cancellation child writes immediate and once-only; notifications are nonterminal.

Run `doctor.noteSettled()` and `holdOpen.clear()` on actual terminal emission, not when a terminal is first synthesized and retained. Retire/cancel any watchdog that could synthesize an old turn's terminal after a new prompt or disposal. `doctor.stop()` currently only clears its timer (`src/doctor.js:250-253`); callback lifetime guards are also needed for queued callbacks. Stop notices must not depend on `doctor.report()`'s issue-ledger rate limit (`src/doctor.js:194-205`), or the second Stop failure/loss can become invisible. Verification must disable issue creation and use synthetic data.

`src/subagent.js:538-594` already makes card closure idempotent and sweeps unattributed live children; preserve it. `registerObserved` at 640-659 retains provenance-scoped late cancellation. Do not broaden that window to cancel new-turn children, and do not accidentally disarm it on rejected input.

### Suggested named limits

| Bound | Recommendation | Required behavior |
| --- | --- | --- |
| Atomic response deadline | 1,000 ms from atomic write | Honest timeout, notice/error, owned-provider failure; never restart deadline on unrelated traffic. |
| Completed-clear follower deadline | 500 ms from writing clear success | Release ordered old output, invalidate latch, diagnose incomplete handshake. No acknowledgement/consumption claim on expiry. |
| Transactions / followers | One / one | Explicit correlated busy rejection for overlap; no waiters list. |
| Deferred state replies | At most 16, aggregate 1 MiB serialized UTF-8 including newlines | Overflow is explicit Stop failure and teardown, not eviction or fake state. Include R1 replies. |
| Deferred terminal | One normalized terminal, at most 16 KiB | Coalesce duplicate signals for that generation; do not retain a large raw `agent_end` payload as the terminal. |
| Retained restore/result frame | 1 MiB serialized UTF-8 including newline | Oversized/malformed result fails honestly; never silently truncate recovered text or report empty success. |
| Owner shutdown escalation | SIGTERM, then SIGKILL after 250 ms if still live | Bound teardown; close transport and release owned references/timers. |

Use injected clock/deadline scheduling for deterministic tests, with the production constants selected explicitly. These deadlines leave nominal margin under T3's 2,000 ms clear timeout; they are not hard real-time guarantees under event-loop starvation or blocked pipes. Retained bytes must include restore data and terminal/state storage, not just the state-frame list. Avoid retaining both raw and normalized copies unnecessarily. Backpressure/error paths must retire/fail rather than create an unbounded side buffer.

### Process ownership

The final RPC process is spawned in `src/proxy.js:290-303`; `bin/omp-t3:176-189` delegates final launch there. The final child is not detached. Existing signal forwarding only calls `child.kill`; `pipeline.stop()` only closes readlines and doctor timer. Neither closing readers nor ending stdin is proof OMP stopped executing queued work.

Inject an idempotent provider-failure callback from `spawnAndProxy`, with a production implementation that first prevents new input/child writes, attempts the notice and correlated errors while writable, terminates the owned OMP child, escalates if necessary, and ends this provider transport/shim with failure. Check child liveness/exit, not `child.killed` alone (a signal being sent is not an exit). Do not negative-PID signal the existing non-detached child: that is not an owned process group. Do not signal T3, restart T3, or make the adapter library send process-global signals. An owned group would require deliberate spawn ownership and proof; it is not implied by the current launcher.

The launcher acceptance fixture must prove the **main** OMP child exits even if it ignores graceful termination and stdin EOF, and that no queued-work marker runs afterward. Native subagent cancellation remains the bridge's existing separate obligation. No claim about arbitrary untracked plugin-daemon containment follows from this seam.

## Required observable acceptance matrix

All rows are implementation-checkpoint requirements, not tests run by W16. Use real proxy/settlement/subagent components with synthetic streams and a realistic T3-like consumer: request waiters, ordered line parsing, async clear continuation, active-turn guard, notice permit, independent state probes, and interrupted finalization. A synchronous mock that appends “notice” before “settle” without these semantics is insufficient.

| Case | Observable acceptance |
| --- | --- |
| Active clear then sequential abort | Exactly one child atomic request; cancel/card closure precede it/settle; clear result is consumed and queue notice exists while the original turn is active; original abort acknowledged once; one aborted terminal. |
| Early abort during restoring | Attach one follower, preserve both identities, no second sweep or atomic write; result/notice precede terminal. Second distinct clear or additional abort gets explicit busy failure without growing storage. |
| Idle/paused clear and lone abort | Synchronous idle settle cannot escape; native cancellation still occurs before atomic write; successful queue data precedes settlement. |
| Lone abort with text/loss | Original abort response contains available texts; active-turn text notify makes them observable to a consumer ignoring abort data; loss flags visible before settle. No fabricated clear response. |
| Queue fidelity | Both arrays, mixed supported string/text-object inputs, duplicates, empty text, whitespace, non-ASCII and ordering preserved. Empty success has no invented messages. |
| Same-chunk clear + terminal + probe | Deliberately parse candidate lines in one chunk before the clear continuation runs. Terminal and finalizing probe cannot remove active turn before notice; follower releases barrier. Test chunk splits too. |
| Probe before/after result | Already-issued idle successful probe and R1 failed probe retained before and after atomic success; missing-field idle semantics included; post-activity failure exhaustion cannot race notice. |
| Prompt traffic while waiting | Streaming text, tool results/updates, approvals, model/command RPCs, subagent reconciliation/cancel replies, unrelated RPC failures and definitely nonfinalizing state replies arrive promptly. |
| Every terminal producer | Upstream idle settle, active abort end pair, `session_settled`, raw terminal, prompt-result fallback, command-only response+terminal and doctor synthesis use the gate; nonterminal prefix remains prompt; duplicates coalesce. |
| Native children | Existing, unattributed, and late provenance-linked children cancelled; cards close before settle; follower does not sweep twice; a new accepted prompt's children remain legitimate. |
| Clear without abort | Finite follower expiry releases storage/output, diagnoses incomplete handshake and retires token. Later abort writes a fresh atomic request. No perpetual hold or waiter. |
| Completed restore then new mutation | Old output flushed before forwarding prompt/session/model/queue mutation; follower invalidated. Later abort cannot use old restore. Include successful clear with no terminal yet and late old terminal/watchdog. |
| Unresolved restore then mutation | Explicit original-ID not-accepted response; no child write, settlement reset or cancellation-window disarm; no replay. Old restore cannot attach a later abort across attempted mutation. |
| Identity and private ownership | Strings, absent ID, explicit null and numeric zero preserved, including paired requests with different ID forms. Wrong command with correct private ID never succeeds. Numeric/string lookalikes do not match; reserved client collision rejected. |
| Unsupported / malformed / generic failure | Clear+abort and lone-abort clients get correlated failures and notify, no successful empty lists, no plain abort/retry. Simulate generic failure after withdrawal as well as unsupported before handler entry. |
| Missing response / EOF / transport write error | Controlled deadline or closure resolves outstanding obligations, fails only owned provider and admits no new work. No optimistic success on retained idle/terminal output. |
| Late atomic replies | After success/timeout/failure/disposal or into a newer generation, private replies are consumed/inert; never forwarded, settled, or matched to a newer transaction. |
| Caps and sustained traffic | Exercise state-frame count, UTF-8 bytes, oversized terminal/result and one-over-cap cases. Overflow fails explicitly; sustained unrelated traffic is not retained and cannot extend deadlines. |
| Dispose and stale callbacks | Close during restoring and awaiting follower; timers/watchdog/async callbacks cannot write, settle or forward child commands afterward. Writable requests fail where possible; EOF is not mislabeled as restore success. |
| Production owner teardown | Synthetic main child ignores TERM/EOF, then dies by bounded escalation; shim/provider closes with failure, no orphan main child or queued execution marker. No T3/global signal; callback invoked once. |
| Normal behavior | No-Stop completion, pending-work aliases, wake cycles, compaction, command output, approvals, catalog/usage passthrough and new-prompt cancellation disarm retain existing contracts. |

Failure/overflow evidence must observe actual client/child frames and owned-process exit, not only callback counts or private-map sizes. No real `gh`, model, child delegate or user settings. Existing test suites are not evidence for new ordering until adapted to supply atomic responses. Package/final-union gates remain the orchestrator's later responsibility; none were run here.

## Accepted risks during D06 freeze

1. **No shared Stop ID.** A genuinely independent same-generation abort can consume the single completed-clear follower latch. An early matching follower is likewise not distinguishable by gesture identity. This is accepted protocol ambiguity, not authorization to retain stale tokens across mutation or claim arbitrary exactly-once gestures.
2. **Already lost OMP data.** Truncated withdrawn text and dropped images cannot be reconstructed. Return available text and visibly disclose received loss flags; no second queue, fake recovery, or attachment store.
3. **T3 display limit.** T3 v0.1.9's clear notice truncates at 2,000 characters and omits empty strings from its body. Wire fidelity is stronger than display fidelity; do not promise composer restoration or complete visual recovery. Lone-abort notices must disclose any additional deliberate display limit.
4. **Finite acknowledgement fence.** Follower expiry is a liveness escape, not proof that a stalled consumer consumed/rendered the clear. Notice presentation after expiry and under unbounded scheduler stalls cannot be guaranteed. Same-chunk proof is still required for the normal acknowledged sequence and lone-abort notify path; wire order alone is not proof.
5. **Generation provenance.** Unsolicited OMP `agent_start` during abort unwind is not a user mutation. The fixed design must retain transaction ownership across it; arbitrary external lifecycle provenance cannot be invented. Do not use it to bypass the tested no-stale-output boundary.

These are accepted design limitations, not additional replans or unfinished implementation allowances. R1, missing lifecycle wiring, fabricated restoration, unsafe teardown, unbounded storage, or failed acceptance evidence remain **Fix**, not accepted risk.
