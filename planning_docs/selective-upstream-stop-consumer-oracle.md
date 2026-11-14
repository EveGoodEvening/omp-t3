# W08 — Pinned Stop consumer oracle

## Authority and limits

**Source-derived oracle, not live T3 equivalence or an implementation PASS.** Authoritative T3 v0.1.9 commit: `24e77473ecf41bc1f7142529c7911c1c1aae1d76`. Links below pin that full commit (the shortened hash in the task omits one `c1`). Read ledger P3/D06–D09, [runtime evidence](selective-upstream-integration-runtime.md), and [Stop plan review r2](selective-upstream-stop-plan-review-r2.md). Their frozen bounded terminal + potentially-finalizing-state barrier remains selected; this adds no design/API change.

Only this evidence file was written. No working-tree implementation, partial diff, fixture, installed OMP/T3, provider, gh, browser, or worker status was inspected/executed. The existing projection was read from committed checkpoint `eac8480`, not the actively edited tree. A no-file Node check verified 20 isolated JavaScript predicate cases plus one projected async-work count; that is language-semantics evidence only, not an Effect scheduler or actual-client test.

## 1. Exact state predicate and eligibility

Pinned [adapter.ts L2327–2367](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2327-L2367) handles `t3.settle_probe`. For a successful probe it finalizes exactly when:

```ts
recordField(data, "isStreaming") !== true &&
recordField(data, "isCompacting") !== true &&
(recordNumber(data, "pendingMessageCount") ?? 0) === 0
```

[RPC helpers L47–59](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L47-L59): `recordField` returns the property only for `Predicate.isObject(input)`, otherwise `undefined`; `recordNumber` accepts only numbers satisfying `Number.isFinite`, otherwise `undefined`. **Not truthiness, positivity, or schema validation.** Only literal boolean `true` proves activity; any finite nonzero count, including negative/fractional numbers, prevents this predicate from finalizing. Invalid counts default to zero.

Before either success or failure handling, the probe is ignored if any of these holds:

- no active turn;
- current turn ID differs from captured `providerTurnId`;
- current `settleProbeGeneration` differs from the captured generation;
- a pre-activity probe (`settleAfterAgentActivity !== true`) encounters `turn.sawAgentActivity`;
- `turn.activeCompaction !== null`.

No additional requirement for `turn.interrupted` or `turn.settleWhenIdle` appears in this handler. A matching pre-activity probe can finalize during Stop even though all terminal output is held.

### Projected-state classification table

Rows describe **data delivered to the matched RPC waiter**, after normal shim projection. Unless specified, activity fields are absent/not literal `true`; assume the eligibility guards above pass. “Potentially finalizing” is the Stop barrier classification, not an unconditional promise that an ineligible probe ends a turn.

| Projected response/data shape | Exact consumer outcome | Stop classification |
| --- | --- | --- |
| `success:true, data:{isStreaming:true}` | No idle finalization, regardless of count | Definitely busy; prompt passthrough |
| `success:true, data:{isCompacting:true}` | Same | Definitely busy; prompt passthrough |
| `data:{isStreaming:false,isCompacting:false,pendingMessageCount:0}` | Idle predicate true | Potentially finalizing |
| `data:{}`; either/both activity fields missing | Missing fields are `undefined !== true`; missing count defaults to 0 | Potentially finalizing |
| Activity fields `null`, `0`, `1`, `"true"`, `"false"`, `[]`, `{}`; count absent/0 | None equals boolean `true` | Potentially finalizing |
| `pendingMessageCount:0` or `-0` | Equals zero | Potentially finalizing |
| `pendingMessageCount:1`, `-1`, `0.5`, `-0.5` | Finite nonzero count | Definitely busy, even for negative counts |
| Count absent, `null`, `"0"`, `"1"`, `"-1"`, `false`, `true`, `[]`, `{}` | Not a finite number; defaults to zero | Potentially finalizing |
| Count `NaN`, `Infinity`, `-Infinity` in memory | Rejected by finite-number helper; defaults to zero | Potentially finalizing; not JSON numeric literals (JSON serialization yields null) |
| `success:true` with missing `data`, or `data:null`, scalar string/number/boolean, or `[]` | No relevant fields; all defaults idle | Potentially finalizing, not a schema error |
| Matched response with `success:false`, missing success, `null`, `0`, or `"true"` | RPC failure path; data/activity fields do not rescue it | Potentially finalizing/error-sensitive |
| Raw `data:{queuedMessageCount:0,hasPendingAsyncWork:true}` with pending alias absent | Existing projection produces `pendingMessageCount:1` | Definitely busy **after projection**; classifying raw fields would be wrong |
| Raw `data:{queuedMessageCount:2}` with pending alias absent | Projects count 2 | Definitely busy |
| Raw `data:{queuedMessageCount:0,hasPendingAsyncWork:false}` with alias absent | Projects count 0 | Potentially finalizing |
| Raw `data:{queuedMessageCount:2,pendingMessageCount:null}` | Existing alias is preserved; null defaults to zero at consumer | Potentially finalizing |

Busy literal activity wins over malformed/missing counts for successful results. Malformed **JSON** is different from malformed success data: RPC drops unparsable/non-object records; the waiter can subsequently time out and take the probe failure path.

Checkpoint `eac8480:src/settlement.js:331–350` supplies the ordinary projection: for successful response/object data, numeric `queuedMessageCount`, and `pendingMessageCount === undefined`, set `pendingMessageCount = queuedMessageCount + (hasPendingAsyncWork === true ? 1 : 0)`. An existing null/string/numeric pending field is not overwritten. No Stop sentinel is authorized. The old checkpoint comment/spec shorthand “count === 0 and activity false” is **not** the consumer oracle; the pinned predicate above is.

## 2. Probe failure, generation, and active turn

[Probe scheduling L1829–1861](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1829-L1861) captures turn ID and generation when scheduling, requests `get_state` with 2,000 ms timeout, and enqueues an internal `t3.settle_probe` event. Success includes `data`; request failure includes `probeFailed:true`, preserving the captured identity, post-activity flag and attempt. Both flow through the event pump, not directly from a raw state frame to `finalizeTurn`.

For an eligible failed probe:

- **Pre-activity:** immediately calls `finalizeTurn`, independent of terminal events. It is not harmless because it lacks data.
- **Post-activity:** attempts below 3 fork a 100 ms delay then schedule another probe with attempt + 1. Attempt 3 (or greater) sets `stopRequested = true` and awaits `connection.terminate`; it does **not** directly call `finalizeTurn` in this branch. Transport retirement can then finish the turn. Preserve this distinction; do not model every failed post-activity reply as immediate idle success or immediate finalization.
- Attempt is normalized by `Math.max(1, Math.trunc(recordNumber(event,"attempt") ?? 1))`. Errors/timeouts follow the same probe-failure route. Successful busy replies do not use this failure retry branch.

Generation is actual T3 probe invalidation, **not** a shared protocol Stop ID or the shim's input generation. New turns initialize it to 0 ([L2828–2836](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2828-L2836)); `agent_start` increments it ([L1950–1953](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1950-L1953)), compaction start increments it ([L2023–2028](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2023-L2028)), and admitted steer handling increments it under the permit ([L2940–2977](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2940-L2977)).

On `agent_settled`, an interrupted active turn finalizes directly. Otherwise T3 sets `nativeAborted` from literal `aborted === true`, sets `settleWhenIdle`, increments generation and normally schedules a post-activity probe (with the adopted-wake/pending-start exception): [L2173–2193](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2173-L2193). [Finalization L1712–1720](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1712-L1720) sets `state.activeTurn = null` **before** awaiting stream completion, tree references, usage or final status. Notice eligibility is lost at that assignment, not only at visible terminal emission.

## 3. Actual RPC matching and scheduling boundary

[RPC routing L289–311](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L289-L311) consumes a response only if `type === "response"`, ID is a **string**, and that exact key has a pending waiter. It deletes the waiter first. Literal `success === true` resolves it with `record.data` (including undefined/null); anything else fails it with `PiRpcError`, operation from `String(command ?? "request")`, summarized error detail and optional original cause. There is **no command-equality check** against the original request in this router. [Error summary L164–173](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L164-L173) uses strings directly, otherwise JSON serialization, `unknown error` for undefined, and slices overlong text to 200 characters plus an ellipsis.

[Requests L422–445](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L422-L445) allocate string IDs `t3-${nextRequestId++}`, overwrite any supplied ID, register before sending, await the Deferred/transport race and remove failed/interrupted waiters. Numeric, null, absent, late or unmatched string IDs go to `connection.events`, **not** these waiters. Do not coerce numeric IDs to strings in the consumer fixture. Shim ID-preservation tests remain a separate protocol requirement.

[Reader L329–354](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L329-L354) frames a chunk then loops through lines, yielding `routeRecord` per record. Event consumption is a separate fiber under `sessionEventPermit` ([adapter L2371–2400](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2371-L2400)). Resolving the clear Deferred is **not** awaiting its caller's notice emission. The pinned source uses Effect fibers/Deferred, not native Promise callbacks. It establishes no guaranteed clear-notice-before-next-line ordering. A Promise-based fixture parsing all lines synchronously before awaited continuations resume is a required adverse schedule, **not proof of exact Effect scheduling**. Exercise same-chunk and split-chunk delivery, and independent probe continuation/event-pump order; never count wire order alone as notice consumption.

## 4. Awaited clear/abort and notices

[Ordinary interrupt L2993–3034](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L2993-L3034) validates the active turn and marks it interrupted, then **awaits `clearNativeQueue(turn)` before requesting/awaiting abort**. Abort failure resets interrupted and propagates through the interrupt adapter error. The ordinary request wrapper defaults to 15,000 ms ([L751–752](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L751-L752)); clear explicitly uses 2,000 ms. Restart/settling/compaction paths instead terminate; only explicit restart while not already settling uses an awaited clear and 2,000 ms abort (abort error ignored) before termination. Do not replace all paths with one lone-abort model.

[Clear L1444–1474](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1444-L1474) concatenates string entries from `steering` then `followUp` arrays; other fields/elements are ignored. Failure is swallowed into an empty array, so ordinary Stop still proceeds to abort. Missing/null/malformed clear data likewise yields no strings. Nonempty results acquire `sessionEventPermit` and emit only if `threadState?.activeTurn === turn` by **object identity**. Empty strings count as cleared messages but are omitted from the displayed body. The whole joined notice is sliced to 2,000 characters. It is a completed `system_notice` item, not composer restoration. [Notice emission L1422–1440](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1422-L1440) awaits a completed system item node then `turn_item.updated` carrying title/message.

[Notify L1476–1490](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts#L1476-L1490): `extension_ui_request` with method `notify` emits a notice only for an active turn and nonempty **string** message. No request ID is required; whitespace is not trimmed. Its normal event-pump path holds the permit. It does not acknowledge a Stop or revive a finalized turn. Stderr is only length-logged, not a notice ([RPC L387–397](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts#L387-L397)).

## Independent fixture review cut

Require observed notice emission with the original active turn, before active-turn nulling/transport retirement, for failed pre-activity probes and final post-activity retry failures on both sides of atomic success. Repeat same-chunk clear/terminal/probe permutations and split chunks. Busy projected states and unrelated failures must remain prompt. The awaited follower must follow completed notice emission in the modeled ordinary Stop flow, not merely parsing clear success. Successful idle and malformed/null/missing success data must use the exact predicate above; failures must use the separate failure branch. Keep generation/compaction guards and true string-ID waiter routing. A copied predicate or callback-count/wire-order assertion alone is not runtime proof. All other frozen caps, owner-kill, fidelity, correlation and mutation acceptance requirements remain in the r2 review, unchanged.
