# Atomic Stop safety: independent narrow design

## Status and boundary

**Proposal, not implementation or runtime verification.** Baseline supplied: `aafbe12`. Inputs: [integration ledger](selective-upstream-integration-ledger.md), [completed spike](selective-upstream-integration-spike.md), local proxy/settlement/cancellation code, and installed OMP source identified by the spike as **18.20.0**. No runtime, test, browser, or delegate was started for this design.

Scope: failure policy and bounded lifecycle for translating T3 `clear_queue` and `abort` into `abort_and_restore_queue`. Actual T3 sequencing/error consumption belongs to the separate runtime investigation. No changes to role/model/thinking inheritance, opt-in restrictions, delegation opt-out, explicit tools, native-task cap, storage, retries, or presentation.

**Choose fail closed:** unsupported, failed, malformed, disconnected, or timed-out atomic Stop ends this provider connection with an explicit error and force-terminates its owned OMP process. Never automatically send plain `abort`, repeat the atomic command, reopen the provider, or replay input.

## Decision criteria

1. **No unsafe continuation:** the shim must not cause discarded queued input to execute through fallback, replay, a second withdrawal attempt, or admission of new input into an unresolved Stop.
2. **Honest result:** success requires a matching, valid atomic success. Unsupported means this command was not handled; other failures can follow withdrawal. Neither failure means an empty queue. Lost text/images must be distinguished from an empty result.
3. **Ordering:** deliver available clear text under the original request ID before any T3 settlement. Interrupt child cards and issue existing child cancellations before the atomic write. Do not infer remote cancellation completion from a write.
4. **Liveness:** one finite Stop deadline, bounded retained state, no dependence on a following `abort`. Errors and transport closure must unblock the client, not leave an apparently healthy session running indefinitely.
5. **Isolation:** no global downstream buffering; unrelated emitted responses continue through existing adapters. No stale Stop association or late internal response may complete a newer request.
6. **Small change:** use current response/error and notice channels, `SettlementTracker`, `SubagentBridge`, and process ownership. No new T3 command, persistence layer, retry mechanism, or general scheduler.

### What the safety guarantee can mean

The atomic linearization point is OMP's withdrawal, not the instant a button is pressed or the shim reads a line. Work already admitted to a model/tool cannot be undone. On an unsupported runtime, or a timeout before the handler starts, there is no confirmed withdrawal point. Killing the provider stops further execution by that process; it cannot prove that no queued input ran before termination or recover missing data.

Thus the enforceable local contract is **no shim-induced replay/continuation, no further input on a failed connection, and prompt termination rather than unsafe fallback**. A literal guarantee that no discarded input ever executes, including before an unsupported runtime answers, is impossible with these APIs. Record that limitation rather than labeling fail-closed termination “atomic withdrawal succeeded.”

## Evidence that determines the design

Installed paths below are relative to `/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/`.

| Evidence | Consequence |
| --- | --- |
| `src/modes/rpc/rpc-mode.ts:2088–2104`: plain abort awaits `session.abort`; atomic abort first calls `session.clearQueue({forInterrupt:true})`, then awaits abort. Dispatcher errors become ordinary failed responses at `637–643`. | A failed atomic response can follow withdrawal. Do not retry either abort variant or return invented empty arrays. |
| `src/session/agent-session.ts:11160–11220`: interrupt clear includes user input dequeued but not recorded; non-user visible messages have distinct preservation rules. `12185–12289` extracts interrupt-marked messages and calls the stranded-message drain in `finally`; `1616–1647` explains its continuation behavior. | Plain abort is not an atomic clear substitute. `get_state` plus individual removals is also not equivalent. |
| `src/modes/rpc/rpc-mode.ts:737–778`; `rpc-types.ts:366–374`: fitting removes images first, then newest entries, retaining a steering-then-follow-up oldest-first prefix. Flags are `imagesDropped` and `truncated`. | Preserve returned text/order and expose loss. The shim cannot recover omitted text or infer the omitted count. |
| `src/settlement.js:95–113,205–223`: `onAbort` runs synchronously; idle abort immediately produces settlement, active abort normally settles on `agent_end`. Other settlement routes are local-command response, `prompt_result` fallback, and translated `session_settled` (`235–321`). | Arm the terminal barrier before the local abort transition, not after writing the atomic request. Cover every terminal route. |
| `src/proxy.js:39,56–70,193–205`: doctor synthesis writes directly; abort sweep emits cards and writes child cancels; normal settlement clears hold-open state. `src/doctor.js:109–142` has a separate 15-second synthesized-settlement watchdog. | Doctor output must use the same terminal gate. Do not record a held/dropped terminal as delivered, or let the watchdog settle a failed Stop. |
| `src/subagent.js:538–593,613–660`: sweep closes open task cards and cancels known live children; late cancellation is provenance-scoped and terminal state is sticky. `src/proxy.js:102–114` disarms on a forwarded plain prompt. | Preserve these semantics once per accepted atomic operation. Rejected input must not reset the tracker or disarm cancellation. |
| Installed `rpc-mode.ts:433–440,602–643,2494–2505`: atomic abort, `cancel_subagent`, and `get_state` use the serial command tail; cancellation itself is awaited. | A preceding child cancellation can delay withdrawal. A read submitted behind atomic abort may wait inside OMP even though the shim forwards it immediately. The Stop deadline includes both delays. |
| `src/proxy.js:245–249,290–336`: pipeline `stop()` only closes readers/doctor; process ownership is in `spawnAndProxy`. Signals target the direct child; exit handling waits for `close` and mirrors its signal. | Closing the pipeline or pipe is not execution termination. Add a narrow fatal-Stop handoff to the process owner; do not reuse normal close handling unchanged. |
| Installed `rpc-mode.ts:2960–2979`: stdin EOF drains accepted serial/background work before disposal. | EOF alone is not fail closed and can hang on the same operation. Force termination must precede closing OMP's input; do not offer a graceful-drain interval. |
| `src/notices.js:7–17`: existing notify channel is documented against T3 0.1.2 and drops notices outside an active turn. | A notice alone is insufficient. Use failed request responses and nonzero provider termination as the authoritative failure, with a pre-terminal notice while a turn exists. Current T3 behavior still requires independent evidence. |

The upstream plain-abort fallback and stale/global-buffering findings are taken from the supplied spike, not independently fetched or executed here.

## Alternatives

| Alternative | Behavior | Safety / cost |
| --- | --- | --- |
| **A. Clearly marked compatibility fallback** | Only on an exact unsupported-command response: fail `clear_queue`, emit “non-atomic Stop; queued input may still run,” then send plain `abort`. Never claim returned texts. Do not use this path for generic failure or timeout. | Better chance of retaining the connection, but plain abort can drain queued input the user discarded. Labeling the risk does not prevent it. **Fails criterion 1; reject even as the default for old OMP.** A new opt-in would change the accepted product contract and is not proposed. |
| **B. Explicit error plus fail-closed termination** | On every non-success, latch failure, stop admission, request immediate forced termination of owned OMP, emit failed responses/notice, and end the provider transport nonzero within a fixed bound. | Prevents the shim from choosing the unsafe continuation. Loses the live provider session and possibly unreturned input; force-kill can skip cleanup. **Choose.** This is smaller and more truthful than inferring queue state or retrying. |
| **C. Error plus live quarantined session** | Reject future mutations but retain the process and serve reads. | The process can still drain queued input or autonomously wake. Closing only stdin additionally runs OMP's accepted-work drain. Not fail closed; reject. |

No fallback path is added, including for a positively identified unsupported command.

## Proposed operation contract

### Fixed bounds and state

Use a local, single-flight Stop controller inside the existing proxy seam, not a general RPC scheduler.

- **Stop deadline: 5,000 ms** from accepting the first `clear_queue` or lone `abort`, armed before the cancellation sweep. It covers waiting behind child cancellation, the atomic response, and finalization. Traffic, follower requests, and a response that precedes its terminal event never reset it.
- **Fatal shutdown/output grace: at most 1,000 ms** from failure detection. Request forced termination immediately; this is a bound for exit observation and writing errors, **not** time allowed for graceful OMP cleanup. Under a functioning event loop/OS, an unanswered Stop ends its connection by `t0 + 6,000 ms`.
- Retain **one operation, at most two client request identities** (initiator and one eligible follower abort), **one normalized terminal candidate**, and no deferred user-input queue. Keep a counter/nonce for internal IDs, not an ever-growing tombstone list or arbitrary downstream-frame buffer.
- The 5-second limit is an intentional fail-closed tradeoff: even legitimate abort cleanup that takes longer loses this connection. No new tuning option or retry is needed. These exact values are proposed policy, not measured T3 timeout facts; the runtime acceptance below must establish that the failure reaches T3 before its own relevant deadline.

### Admission and correlation

1. Intercept `clear_queue` and lone `abort` **before** normal upstream tracker handling. Preserve whether `id` was absent, explicitly null, numeric, or string; never stringify IDs or substitute a default. These are RPC request IDs: OMP's returned queue entries contain text/images, not recoverable original message IDs.
2. Create the operation, arm the barrier/deadline, invoke the existing local abort transition exactly once, emit its child cards, write its `cancel_subagent` requests, then write one internal `abort_and_restore_queue`. Do not forward the original clear or plain abort to OMP.
3. One `abort` may join an initiating clear only while its atomic reply is still pending and no intervening client mutation attempt has occurred. Preserve that follower's own ID, but do not repeat the sweep or atomic write. Its wait is bounded by the original deadline.
4. Other clear/abort requests while busy, and input/session mutations, receive immediate `success:false` with a `STOP_IN_PROGRESS` error. Do not enqueue them, call their normal tracker branches, or imply that their content was accepted. An intervening mutation attempt breaks follower eligibility even when rejected. After successful finalization, a later abort is a **fresh** atomic operation, never an old clear's acknowledgement.
5. Keep read-only RPCs on their normal path. In particular, state, model/command catalog, message/tree, and subagent reads are not queued by this controller. Reject commands that can execute/enqueue input or change the turn/session (including prompt/steer/follow-up, `abort_and_prompt`, bash/voice starts, session/tree changes, model changes, and compact) while Stop is unresolved. Unknown commands cannot bypass the gate as presumed reads. Existing protocol replies needed to unwind tools/dialogs and bridge-owned cancellations remain control traffic, not new user input. This gate applies only during Stop.
6. A matched result requires top-level `type:"response"`, the exact internal ID, and `command:"abort_and_restore_queue"`. A conflicting command under the current internal ID is a protocol failure, not success. Use a per-connection reserved nonce namespace plus a monotonic counter; reject client attempts to use that namespace before forwarding. Older issued internal IDs can then be consumed without retaining every retired operation. Never leak them to T3 or use them as client IDs.

This deliberately does **not** promise exactly one atomic call per arbitrarily delayed T3 gesture. There is no shared Stop correlation ID. A follower arriving after completion is a fresh Stop; if a new prompt has since been admitted, it can stop that prompt. A pairing window that survives completion silently misidentifies later Stops instead. Whether real T3 sequencing avoids this ambiguity is a required external acceptance, not a reason to retain stale state.

### Terminal-only barrier and success

Separate terminal output from ordinary tracker output. A minimal internal change is to return a distinct `settle` line alongside the existing `emit` field, rather than concatenating `agent_end` and settlement into an opaque string. Migrate all terminal producers to that seam; do not substring-match nested child events or split/reorder arbitrary rendered output. Route doctor synthesis and any top-level passthrough `agent_settled` through the same gate.

- **Idle:** the tracker-generated aborted settlement is retained, not emitted before the atomic response. Child cards have already passed through.
- **Active:** continue processing frames in order. Forward real `agent_end`, ordinary output, and unrelated responses promptly; retain only the resulting settlement. Translated `session_settled`, command-only/fallback settlement, and watchdog synthesis cannot bypass this gate. The controller's Stop intent remains latched through a background-wake `agent_start`; tracker resets must not turn this Stop into a successful normal completion.
- **Matching valid success:** return the Pi clear text-array result under the original clear ID, preserving steering/follow-up order, duplicates, and empty strings. Answer any already-joined abort with its original ID. Emit loss diagnostics before releasing one `agent_settled {aborted:true}`. All these responses precede the terminal; no following abort is required.
- For a **lone abort**, answer `command:"abort"` under its original ID and include the same returned text arrays/loss flags in its response `data`. Do not invent an unsolicited clear response or client ID. This preserves returned information on the wire; automatic editor restoration from abort data is **not** established and must not be advertised without consumer evidence.
- If the response arrives first, send its result immediately but keep the mutation/finalization barrier until the observed terminal arrives. Do not fabricate `agent_end`. If terminalization is still missing at the original deadline, fail the connection; do not send a second contradictory response for an already-answered clear.
- If the terminal arrives first, keep just one candidate until the response. Duplicate finalizations for the stopped turn are suppressed, including a later `session_settled` following the synthesized abort terminal. Successful release retires association state and clears its timer. Subsequent admitted input/background cycles retain the existing lifecycle and cancellation-window rules.
- While finalization is pending, immediately forward translated `get_state` replies with the normal `pendingMessageCount` alias made nonzero to include the shim's outstanding finalization (including replies already carrying that field). Keep OMP's queue count and all other state fields truthful. This is pending proxy work, not an invented queued user message. Without this, a T3 idle probe could finalize before the clear reply.
- Call the existing settled/hold-open bookkeeping only when a terminal is actually released. A held or discarded terminal is not a clean-settlement observation.

**Read liveness qualification:** the shim must not hold an available unrelated response. Installed OMP nevertheless serializes `get_state` and other reads behind an awaited atomic abort/cancellation. Forwarding a request does not guarantee OMP answers it during that await. On timeout, connection failure rejects those outstanding reads; do not fabricate cached state or add a second provider. Requiring successful concurrent read answers during a hung serial OMP handler would require an upstream API change and is not satisfied by a terminal barrier alone.

## Failure and shutdown sequence

Use one idempotent fatal path for explicit atomic failure, invalid success shape, deadline, write failure, child stdout EOF, or child exit while Stop is unresolved.

1. **Latch fatal before other handlers run.** Disallow further execution/input admission, dispose the Stop timer, and stop doctor settlement synthesis. Do not let a racing late success reverse the outcome.
2. **Ask the process owner to force-kill its owned OMP process immediately**, before closing its stdin or waiting for output drain. On this Linux path use `SIGKILL`, not a plain abort, EOF-only shutdown, or graceful `SIGTERM` interval. Do not signal the shim's inherited process group: the current provider spawn does not create an owned group. No new process-tree supervisor is proposed.
3. **Respond honestly to outstanding Stop requests**, using each original command/ID and `success:false`; emit an existing notify frame while the turn is still active and the same classification on stderr. Never include fabricated restoration arrays on failure. Do not use `ContractDoctor.report()` for this path: it can persist state/file GitHub issues, neither of which is required here.
4. **Discard, rather than release, the held normal settlement on failure.** Do not emit synthetic `agent_end`, an apparent successful atomic response, or a clean `agent_settled` to conceal provider failure. Let the nonzero transport failure terminate the T3 run. Already-emitted interrupted child cards remain interrupted, not proof that every remote cancellation completed.
5. **Close the provider connection nonzero after bounded error-output delivery.** Observe process `exit`, not only `close` (descendants can retain pipe handles), and do not confuse `child.killed` with confirmed exit. The current signal-mirroring close handler must not kill the shim before pending errors are written. Flush callbacks or the 1-second grace end the wait; a disconnected/non-reading client cannot keep it alive indefinitely. Natural child EOF/error enters this same pending-request cleanup before ordinary reader shutdown.
6. **Retire all operation data.** Ignore late internal replies and stop admitting work on this connection. Do not automatically reconnect or replay. If the kill fails or no exit is confirmed within the bound, say **termination unconfirmed**, still fail the transport, and never claim execution stopped.

The minimal process API addition is a pipeline `onFatalStop(reason)` handoff wired by `spawnAndProxy`, plus a reason-aware close/cleanup entry used by child stream/process events. A pipeline embedding without a real termination owner cannot claim this policy. Apart from that seam, the separate terminal result, and the existing response `data` for a lone abort, no new public API is necessary.

### Honest failure representation in T3

Use fixed classifications in the existing error string; no new T3 event type or UI component is proposed.

| Outcome | Required meaning before transport closes |
| --- | --- |
| Exact matching `Unknown command: abort_and_restore_queue` failure | `STOP_UNSUPPORTED`: atomic Stop is unavailable; withdrawal was not confirmed; provider termination requested; no plain-abort fallback. This is not proof that the queue was empty or that nothing ran. |
| Other failed reply, invalid result, EOF/write failure, or atomic-response timeout | `STOP_INDETERMINATE`: queued input may already have been withdrawn; restoration is unconfirmed/unavailable; provider termination requested. Never say “nothing was removed.” |
| Valid success/text already returned, but finalization deadline expires | `STOP_FINALIZATION_FAILED`: withdrawal was acknowledged and available text was returned; terminalization failed, so the provider connection is ending. No duplicate failed clear response after its success. |
| Process termination cannot be confirmed | Add `termination unconfirmed`; do not substitute “stopped.” |

On successful withdrawal with `truncated:true`, return the available prefix and state that some withdrawn text was not returned. `steering:[]`/`followUp:[]` with truncation is **not** an empty-queue claim. Report image loss if OMP set `imagesDropped` **or** returned images that the Pi text-only clear result cannot represent. Carry available flags in response data and emit a loss notice before settlement. No inferred counts, placeholder text, synthetic image URLs, or restoration storage.

A notify may be dropped while idle, and the current adapter may catch a failed clear. Therefore request errors plus nonzero connection failure are mandatory; notice delivery is supplemental. Whether current T3 exposes that failure without misreporting a clean Stop is a consumer acceptance gate, not a fact established by local code comments.

### Cancellation and cleanup limits

Keep `abortSweep()` before the atomic write; keep provenance-scoped late cancellation and sticky child outcomes. A joined follower does not sweep twice; a genuinely new Stop may cancel newly observed live children without reopening old cards. Rejected prompt attempts do not disarm the window; an admitted plain prompt after successful finalization does.

The shim currently issues native-child cancellation requests without awaiting their acknowledgements, and installed OMP processes those requests serially. A cancellation can therefore stall the atomic command; the same 5-second deadline must cover this. Force-killing OMP stops its local queue scheduler, but may skip descendant/browser cleanup and cannot establish cancellation of external T3 delegates or already-running external tools. Preserve existing cancellation attempts; do not report new guarantees about those resources or introduce broad process ownership changes in this port.

## Exact bounded acceptance cases

These are future acceptance requirements, **not tests run for this design**. Use a deterministic clock and synthetic queues/child processes before any real-runtime proof. Let `t0` be first accepted Stop, `D = 5,000 ms`, `G = 1,000 ms`. “Promptly” below means the same proxy dispatch, before the atomic response/terminal is supplied—not another timer tick or a following client command.

| # | Scenario and required observation |
| --- | --- |
| 1 | **Idle clear, no follower:** queue steering `['', 'same', 'same']` and follow-up `['later']`; withhold atomic reply. Interrupted cards pass, cancel writes precede the single atomic write, no settlement passes. Supply valid success before `D`: exact text arrays/original clear ID precede exactly one aborted settlement; timer/association retire without an abort. |
| 2 | **Active, terminal first:** send `agent_start`, clear, then real `agent_end` and `session_settled` before atomic success. Real `agent_end` passes immediately; neither terminal route finalizes early. Clear data and joined-abort response precede one aborted settlement. Late duplicate terminal for that stopped turn does not produce another. |
| 3 | **Active, response first:** valid atomic success at `t0+100 ms`; terminal at `t0+200 ms`. Clear data passes at 100 ms, input remains gated, settlement passes once at 200 ms. With no terminal instead, fatal handling starts at `D` and connection ends by `D+G`; the already-answered clear is not answered again. |
| 4 | **Every finalization seam:** independently supply local-command completion, fallback `prompt_result`, translated `session_settled`, doctor synthesis, and top-level `agent_settled` while the reply is pending. None finalizes T3 early. Ordinary frames accompanying them are not retained; the gate holds at most one terminal candidate. Nested child `agent_end` is not a parent terminal. |
| 5 | **Follower boundaries:** clear ID `7`, abort ID `'7'` before atomic reply and without mutation produce one atomic request, one sweep, and two distinct correctly typed response IDs. A second follower/repeated clear is immediately busy. A mutation attempt between clear and abort makes the latter busy rather than attaching to the old clear. No operation extends `D`. |
| 6 | **No stale association:** finish clear without abort; admit a new prompt; then send abort. It creates a new atomic request/sweep and can stop the new prompt. An abort arriving immediately after prior completion is likewise fresh, not consumed as an old follower. Document the gesture ambiguity rather than asserting cross-request deduplication. |
| 7 | **Lone abort and IDs:** run string, numeric `0`, explicit null, and absent-ID initiators. Response command/ID presence/type match the initiating request; lone abort carries available returned text data before its settlement, with no unsolicited clear response. Consumer restoration from abort data is separately verified or explicitly not promised. |
| 8 | **Unrelated reads and probe:** while pending, emit unrelated state/catalog/message responses. They pass promptly with original IDs; state keeps real OMP fields but reports nonzero proxy pending finalization even if an incoming `pendingMessageCount` was zero. After release, no Stop sentinel remains. A read submitted behind a hung installed OMP handler may wait there, but ends in connection error by `D+G`, not fabricated success. |
| 9 | **Bounded storage/input:** stream 10,000 ordinary frames, repeated terminal candidates, and mutation attempts during one pending Stop. Ordinary frames pass; mutations fail immediately without a child write, tracker reset, or cancellation-window disarm. Retained Stop state remains one operation/two identities/one terminal/zero queued mutations; no traffic resets `D`. |
| 10 | **Unsupported:** matching exact unknown-command response at `t0+100 ms` with discarded input still queued. Issue no plain abort, second atomic call, queue-removal probe, or new prompt. Request forced termination immediately at 100 ms; fail outstanding clear/follower IDs with `STOP_UNSUPPORTED`; no empty success or held settlement; connection ends by 1,100 ms. A fixture whose plain abort would execute the input must never receive that command. |
| 11 | **Post-withdraw failure:** fixture withdraws queued input, then returns a generic error before replying successfully. Responses say indeterminate, not unchanged/empty/restored. One atomic request only; no fallback/retry/replay. Immediate fatal termination with the same `G` bound. |
| 12 | **No reply / blocked preceding cancellation:** keep the first `cancel_subagent` or atomic handler unresolved. At `D`, fail outstanding Stop requests and request forced termination; by `D+G` end nonzero. A late success after the deadline cannot release a terminal or reopen the connection. Closing stdin without killing is a failing implementation. |
| 13 | **Disconnect and output failure:** child EOF/exit/write failure during idle and active Stop enters fatal cleanup immediately. Pending Stop identities receive errors if writable; no successful settlement is invented. Client EOF/backpressure cannot extend `G`; child `exit` with a descendant retaining stdout cannot force an indefinite wait for `close`. Kill failure yields “termination unconfirmed,” not success. |
| 14 | **Payload/loss:** valid empty arrays without flags are a successful empty result; duplicates/empty strings survive. `truncated:true` with empty arrays reports missing data, not empty queue. Images present with no OMP loss flag still trigger text-only conversion loss; `imagesDropped:true` is retained. Missing arrays/non-string text/conflicting internal response command cause explicit protocol/indeterminate failure, never coercion to empty success. |
| 15 | **Late response isolation:** after operation A succeeds and B begins, A's duplicate internal response is consumed and cannot answer/settle B. An unrelated response with a different ID passes. A client ID in the reserved internal namespace is rejected before forwarding; numeric and string IDs are never conflated. Fatal retirement likewise disposes every late internal reply. |
| 16 | **Children/background wake:** known attributed and ownerless live children are swept before atomic write; open childless cards close; completed cards stay terminal. A late child proven owned by a pre-abort call is cancelled without another card finalization. A newly admitted prompt after success disarms as today; its children are not cancelled by the old window. Background `agent_start` during the barrier does not bypass the barrier or erase Stop intent. |
| 17 | **Real T3 consumer gate, owned by the other worker:** establish actual clear→abort ordering, error swallowing, request timeout, handling of EOF/nonzero exit, notice visibility before settlement, idle probe behavior, and tolerance/use of returned abort data. Demonstrate one active and one idle Stop failure leave no hung client and do not display fabricated restored input. Confirm the proposed `D+G` fits the client contract. If current T3 cannot meet these outcomes, mark compatibility unproved; do not silently replace fatal error with success. |

## Remaining uncertainties and adoption gates

- No current T3 sequencing or error-rendering observation was made here. Existing comments prove intended shim ordering, not today's consumer behavior. Case 17 is required before claiming end-to-end compatibility.
- The shim can correlate internal response IDs precisely; untagged lifecycle events have no shared turn ID. Input gating and retirement prevent shim-created overlap, but cannot identify an arbitrarily delayed old `session_settled` arriving after a new turn starts. Validate actual lifecycle ordering across a subsequent prompt; do not claim a local generation counter solves missing source correlation.
- Installed OMP's serial dispatcher prevents an unconditional promise of successful reads during a hung Stop. The guarantee here is no additional shim buffering plus bounded failure of the connection. A stronger read-concurrency requirement needs an upstream change.
- Forced termination sacrifices graceful cleanup and cannot prove external-child cancellation or recovery of omitted data. These are explicit failure consequences, not grounds for a retry, guessed queue result, or automatic resume.

**Recommendation:** adopt option B and the terminal-only, single-flight, zero-mutation-buffer contract. Keep P3's runtime compatibility gate until the separate T3 evidence meets the bounded cases; do not copy the upstream fallback or full-stream buffering.
