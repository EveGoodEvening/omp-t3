# Selective upstream integration — research and proposed implementation plan

## Status and worker boundary

- W01/W02 design-worker evidence, 2026-11-14. Baseline supplied by the task: `aafbe12`; initial ledger checkpoint: `790f46c`.
- This is a **proposal**, not implementation authorization or a second progress ledger. The orchestrator owns acceptance, decisions, work status, and commits in [the ledger](selective-upstream-integration-ledger.md). Read W03's independent evidence before making P3/P4 firm.
- Performed: static reads of the ledger, both accepted upstream patches, relevant local implementation/tests, and readily available installed OMP source. No tests, OMP sessions, provider requests, delegates, browsers, server restarts, or external writes were run. No implementation, tests, README, AGENTS, or ledger were edited; no commit was made.
- There is no inherited transcript of the prior research. The claims below are re-established from named sources; upstream README assertions of live verification are **upstream claims**, not verification of this checkout.

## 1. Source record

### 1.1 Accepted and excluded upstream changes

| Evidence | Source | Finding / use |
| --- | --- | --- |
| U1 | [c32d3ed full commit](https://github.com/lychen2/omp-t3/commit/c32d3ed1111d0d8005a0706308c4fdc1860388c9), [patch](https://github.com/lychen2/omp-t3/commit/c32d3ed1111d0d8005a0706308c4fdc1860388c9.patch) | Mixed change: session catalogs, standalone discovery context, atomic queue adapter, live-tool routing, and unrelated ownership/default-policy changes. Select hunks/behavior, not a cherry-pick. |
| U1-C | [model_catalog.js at c32d3ed](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/src/model_catalog.js) | Forwards `get_available_models` to the running session; prunes its response; deletes shared persisted/builtin fallbacks and prewarm; preserves numeric IDs; adds standalone discovery context projection. |
| U1-Q | [queue.js at c32d3ed](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/src/queue.js), [queue tests](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/test/queue.test.js) | Correct atomic primitive and clear-before-settle intent. **Do not port unchanged:** `flushAll()` only flushes buffers, leaving `operations`/`awaitingAbort`; the next abort can bind to an old clear. `handleDownstreamFrame()` holds every frame behind `bufferOwner`, with no deadline/size bound. |
| U1-R | [subagent_policy.js at c32d3ed](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/src/subagent_policy.js), [CLI](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/src/cli.js) | Useful mechanism: `getActiveTools()` minus exactly `task`, awaited `setActiveTools()`, lifecycle hooks. Reject unconditional routing/native-task prohibition, new model defaults, removal of the native cap, and replacement of local inheritance guidance. |
| U2 | [0088817 full commit](https://github.com/lychen2/omp-t3/commit/0088817867e4c5dd6b2cf6d6ab59c746f7beb727), [patch](https://github.com/lychen2/omp-t3/commit/0088817867e4c5dd6b2cf6d6ab59c746f7beb727.patch) | Adds `Array.isArray(item.thinking?.efforts)` after the CLI-array branch. Maps supported `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` to themselves and unsupported entries to `null`. |
| X1 | [78ec253](https://github.com/lychen2/omp-t3/commit/78ec2537e0dc572ea25c4bb5e2861c1da91dd095) | Excluded by ledger D01/task. No readable-card schema changes, parent-CWD changes, plugin port/install, or related downstream persistence migration. Its patch was not needed/read for this design. |

Additional upstream defects/limits relevant to a selective port:

- Queue request correlation checks `String(frame.id)` without checking the response command. Use an exact internal ID **and** expected command; never consume a user response because its ID resembles an internal one.
- `abortId === undefined` is used both as “no follow-up abort received” and as the value of an idless abort. Use presence/state booleans independent of the JSON ID value.
- Upstream lone-abort failure silently forwards plain `abort`; its later success can conceal that queue withdrawal never worked. Old-command incompatibility must be observable on that path too.
- `clearQueueData(null)` becomes successful empty arrays upstream. A malformed success cannot prove withdrawal; reject a malformed result instead of fabricating “nothing was queued.”
- Upstream tests establish the happy-path handshake, numeric IDs, text order, and child cancellation wiring, but “new turn releases held frames” checks only replay, not retirement. They do not establish liveness without the follow-up abort, unrelated-response progress during the barrier, or cross-generation safety.

### 1.2 Current checkout contracts

Line numbers below describe the files read by this worker; later implementation can shift them.

| Evidence | Local source | Observed contract / risk |
| --- | --- | --- |
| L1 | `src/model_catalog.js:18-57,129-183,205-271` | One-minute in-memory cache, shared `models.json`, builtin fallback, async CLI prewarm, and local interception of session catalog requests. `createModelResponse` stringifies IDs; `reqId || '1'` loses numeric zero. CLI invocation already uses **execFileSync**. |
| L2 | `src/model_catalog.js:67-122` | Safe small field projection and redundant provider-prefix removal. CLI thinking arrays already map to the seven-key ladder; `thinking:true` currently fabricates a low/medium/high ladder. |
| L3 | `src/proxy.js:46-76,90-167,170-249,270-304` | Upstream abort goes through settlement before forwarding; its synchronous observer closes native task cards and sends child cancellations before settlement. Catalog prewarm runs outside the live session. Commands, skill menus, subscriptions, and subagent reconciliation are separate adapters. |
| L4 | `src/settlement.js:75-112,190-255,264-355` | Idle abort can synthesize `agent_settled` immediately; active abort synthesizes it at `agent_end`. `prompt_result`, `session_settled`, local prompt completion, and idle `get_state` are other settlement paths. A queue adapter must cover **all** terminal paths, not only raw `session_settled`. |
| L5 | `src/doctor.js:48-61,109-145,147-162,229-273` | Watchdog can synthesize a terminal independently of settlement. Automatic issues are enabled by default, and error text enters `gh issue create` without redaction. Diagnostic fixtures must use `issuesEnabled:false` or mock `gh`, synthetic data, and temporary state. Do not port the upstream issue-repository change. |
| L6 | `src/cli.js:97-171,211-235`; `bin/omp-t3` proxy branch | Routing is enabled only if `OMPT3_DELEGATE_TASKS !== '0'` and no explicit `--tools` form exists. Fixed-list validation can spawn up to five probes before final launch. Native-cap overlays, user appendices, and model policy survive existing fallback. `--offline` consumption is already present. |
| L7 | `src/subagent_policy.js`; `src/extension_compat.js:38-57,174-264` | Model restrictions are opt-in. Native task blocking under an active model policy is independent of routing opt-out. Adapted MCP client fills omitted model first, then validates it. Active-policy adaptation failures refuse launch; skill-marker-only drift warns without dropping the guard. |
| L8 | `src/delegate_models.js`; `test/delegate_models.test.js` | Live OMP settings, role overrides/frontmatter fallbacks, model-role aliases, thinking suffixes, caller options/explicit clears, Pi/local-only application, opt-out, and explicit-model precedence already work through the adapted bridge and active-policy hook. Keep this implementation and guidance, not upstream's “always choose an explicit model” replacement. |
| L9 | `bin/omp-t3` check branch; `src/cli.js:76-89`; `test/check-shell.test.js` | `--check` uses a shell-safe binary version call and separate CLI catalog discovery. Helper recognition is currently restricted to one/two argv entries; do not claim arbitrary `--check --config ... --profile ...` works solely because an internal context helper supports it. |
| L10 | `package.json:16-19`; `README.md:23-125,219-263,306-326` | Project gates are `npm test` and `npm run check`; no package build/typecheck/lint scripts. Existing fork install/update ownership and version identity must not change. README has an Unreleased section suitable for slice notes. |

### 1.3 Installed API evidence (read-only; not runtime proof)

Installed package: `/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/package.json`, version **18.20.0**. Executable resolves from `/root/.bun/bin/omp` to that package's `dist/cli.js`. Unminified sources are available under the package's `src/`. This establishes this installed version's source contract, not the minimum supported OMP release.

In the following table, `OMP_SRC` means `/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src`.

| Evidence | Exact source | Observation |
| --- | --- | --- |
| O1 | `OMP_SRC/modes/rpc/rpc-mode.ts:2088-2104` | Plain abort awaits `session.abort`. Atomic restore **first** calls `session.clearQueue({forInterrupt:true})`, then awaits abort, then returns the restored queue. Catalog handler at `2544-2547` awaits registry refresh and calls the running session. |
| O2 | `OMP_SRC/session/agent-session.ts:11160-11221` | Withdrawal includes user-authored queued input already dequeued but not recorded; it preserves per-queue order. Non-user visible work can be recorded without starting a turn. Reimplementing this with `get_state` plus per-message removal is not equivalent. |
| O3 | `OMP_SRC/session/agent-session.ts:12166-12291` | Abort has async unwind/maintenance and finally calls `#drainStrandedQueuedMessages()`. Other sources can start a turn during awaits (`12263-12271`). Atomic response, raw agent terminal events, and later activity need real lifecycle evidence; do not assume a new agent cycle cannot race the response. |
| O4 | `OMP_SRC/modes/rpc/rpc-mode.ts:737-778` | `fitAbortAndRestoreQueueResponse` can set `imagesDropped:true`, then `truncated:true` and return only an oldest-first prefix when over the frame bound. Upstream shim normalization drops these flags. “All original texts restored” cannot be claimed on this path. |
| O5 | `OMP_SRC/modes/runtime-init.ts:127-130,209-215` | Extension `getActiveTools` maps to **getEnabledToolNames**, including discoverable tools, and `setActiveTools` awaits the session mutation. Runtime actions are wired before awaited `session_start`. |
| O6 | `OMP_SRC/session/session-tools.ts:865-881,2336-2348,2410-2442` | Enabled names include top-level and `xd://` mounts; setActiveTools preserves the current mounted subset and applies tool presentation. Reading only the top-level tool list would lose enabled discoverable tools. Runtime preservation still requires a no-provider fixture. |
| O7 | `OMP_SRC/extensibility/extensions/runner.ts:1984-2019,2645-2699`; `OMP_SRC/modes/rpc/rpc-mode.ts:1786-1791` | `before_agent_start` handlers are awaited, but thrown/timed-out handlers are reported via extension errors, not automatically a refused session. A hook that merely throws on missing APIs is not a proven fail-closed routing mechanism. |
| O8 | `OMP_SRC/session/model-controls.ts:533-542` | Live model availability applies configured `enabledModels` to the credential-available registry. Standalone CLI listing is not proof of the running session's selectable catalog. |
| O9 | `OMP_SRC/cli/models-cli.ts:33-47,116-131,317-382,390-427` | Standalone models command accepts extension/config options, uses project cwd/settings, discovers extension-provided models, and emits a CLI thinking array via `getSupportedEfforts`. It can refresh providers online when uncached; it is not intrinsically an offline/safe diagnostic. `OMP_SRC/cli.ts:481-490` resolves inherited profile environment. |

## 2. Proposed precise acceptance criteria

These refine ledger AC1–6, not replace them. Approve them in the ledger before implementation; resolve the unknown-until entries below rather than silently weakening a criterion.

### AC1 — Session-authoritative catalogs

1. A session `get_available_models` request reaches that OMP child; the response is derived only from that request's live response. There is no CLI prewarm/subprocess on this session path and no disk, last-context, or builtin model fallback.
2. Preserve string and numeric request IDs, including `0`, without coercion. Preserve absent/null identity deliberately rather than silently inventing a request ID; exact idless behavior must follow the input protocol, not a truthiness fallback.
3. Keep small ModelInfo fields, provider-prefix normalization, `data.models` plus the existing top-level `models` compatibility field. A successful empty live array means empty, not “serve old models.” Existing OMP error responses pass through; malformed success is an explicit correlated error, never a guessed catalog.
4. Standalone discovery uses its supplied executable, cwd, environment/profile, extension and config-overlay context; no persistent/fabricated fallback on command, JSON, or empty-catalog failure. Retain argv-based **execFileSync** (or an equivalently shell-free invocation only if independently justified). Test paths containing spaces, quotes, `$()` and backticks.
5. `--check` reports **standalone** discovery, not session equivalence. In this bounded port its public syntax remains the existing standalone helper: inherited cwd/env/profile are honored. An internal context helper may project `--cwd` to cwd, `--profile` to `OMP_PROFILE`, and supported extension/config args for explicit callers. Do not advertise new multi-flag `--check` syntax or add unused launch-context plumbing to live catalog requests. If review requires new diagnostic CLI flags, record that interface decision and cover the actual launcher, not just a helper.
6. Use a representative large synthetic catalog to prove the forwarded frame is below T3's 1 MiB limit after pruning. Arbitrarily large names/counts are not guaranteed to fit; resolve the desired oversized-result failure contract before advertising an unconditional size guarantee (U-C below). Never silently truncate the set of models to satisfy a size test.

### AC2 — Thinking capability fidelity

1. Both CLI `thinking: string[]` and live `thinking: {efforts: string[]}` produce the seven recognized keys. A listed recognized level maps to itself; an unlisted level maps to `null`. Include `xhigh` and `max` only when advertised. Preserve `reasoning` independently.
2. Empty explicit capabilities remain empty support, duplicates do not expand support, and unknown effort names do not enable a different level. Preserve the model ID even if it contains meaningful non-provider slashes/suffixes.
3. A bare boolean is not evidence of low/medium/high support. Recommended: remove the fabricated boolean ladder, emit no invented support, and document unknown capabilities. Budget-mode objects without `efforts` and T3's default behavior when no map exists remain **unknown-until U-T**; do not claim unsupported levels are excluded until the consumer contract is checked. No hardcoded model-name exceptions.

### AC3 — Atomic Stop and bounded ordering

1. Supported OMP: T3 `clear_queue` + its matching follow-up `abort`, or a lone `abort`, causes exactly one `abort_and_restore_queue` for that Stop. Never substitute `get_state`/remove loops or send a second plain abort after acknowledged atomic success.
2. Successful clear returns original-ID `{steering:string[], followUp:string[]}` with order, duplicates, whitespace and empty text preserved. The clear response and native-child terminalization/cancellation must precede the observable aborted settlement. Early follow-up abort, late follow-up abort, idle Stop, active Stop and idless Stop each terminate correctly.
3. Lone abort also withdraws the queue. Recommended wire result: attach the returned text data to its original-ID abort response and emit it before settlement; do not fabricate an unsolicited `clear_queue` response with no matching request. Whether old T3 displays that data is **unknown-until U-Q** and must be documented separately from wire preservation.
4. No Stop from a previous turn/session can satisfy a later Stop. A clear without a follow-up abort cannot leave a permanent pending-operation entry or output barrier. Close/dispose, new-turn and session-change transitions retire ownership as well as releasing output; late internal responses cannot revive retired state.
5. Unrelated RPC responses, stream/tool output, approvals and cancellation/reconciliation responses continue through the pipeline during a Stop barrier. Settlement-capable state replies are a narrowly identified exception with a finite bound, not justification for buffering the whole downlink. No unbounded frames, bytes, operations, waiters, or timers.
6. An unsupported atomic command, malformed result, disconnect or missing response is explicit for the affected original request(s); no success or empty restored queue may be fabricated. Recommended old-version policy is fail-closed for the Stop transaction, not the upstream silent plain-abort fallback; adoption is **unknown-until U-E** because the provider error/teardown contract must be reviewed.
7. Text-only T3 restoration cannot restore image attachments. Preserve/report OMP's `imagesDropped`/`truncated` information visibly before settlement if received; never imply complete recovery after upstream text truncation. Unknown client handling of these flags is **U-Q**. Do not implement attachment storage or a second queue database.

### AC4 — Conditional routing, not unconditional policy

1. Compute routing once from launch intent: enabled iff `OMPT3_DELEGATE_TASKS !== '0'` **and neither explicit `--tools` form is present**. Only that path filters the resolved enabled set by `name !== 'task'` and appends routing guidance. Preserve every other enabled name, disabled-name absence, and mounted/discoverable-tool availability.
2. Await filtering at validated lifecycle seams (initial session, restored tree/switch/branch as required by W03, and before agent dispatch). Idempotent: no set operation/prompt rebuild if task is already absent. Do not persist a rewritten user tool configuration.
3. Supported live-API path launches one OMP session, not repeated fixed-list probes. Remove obsolete fixed-list exports, probe/fallback plumbing and associated implementation-detail tests after migrating callers. Capability failure must be explicit; do not recreate the probe loop under a new name.
4. Preserve user `--tools` bytes/order/errors, routing opt-out, user prompt appendices, native concurrency overlays and invalid-value handling. With routing off, native task is allowed when model policy is off; active model policy still blocks it as today.
5. Model lists remain opt-in. Preserve both direct-tool and adapted-MCP policy coverage; fill OMP role/model/thinking defaults **before** checking them, preserve explicit models/options and explicit option clears, local/Pi scoping, live settings precedence, session-model inheritance and `OMPT3_DELEGATE_MODEL_ROLES=0` behavior.

### AC5/6 — Preservation and evidence

- Keep `--offline` consumption without disabling discovery resources; safe executable invocation; command/skill catalogs and paths; extension adaptation/ownership identity; native-child provenance cancellation; compaction, usage, approvals and ordinary passthrough.
- No package version, publish channels, owner/fork URLs, updater/install behavior, issue repository, readable-card data contract or external plugin changes. No paid models/live delegates/server restart/external-system modifications for verification.
- Each slice changes documentation/Unreleased notes for its own contract, has behavioral proof, independent converged review, and green package gates before commit. Final gate reruns `npm test` and `npm run check` on the final union after the last change. No test execution is claimed in this planning artifact.

## 3. Concrete corrected queue-adapter proposal

**Status: design candidate; unknown-until U-Q/U-E.** Prefer a small Stop state machine and a terminal-output barrier over upstream's “buffer everything, replay later” design. Keep queue contents owned by OMP; the shim stores only the response it owes and bounded delivery bookkeeping.

### 3.1 State and correlation

One active transaction per provider session, with:

- `generation` (local turn/session epoch), unique private restore ID, and `phase = restoring | awaitingFollowup | complete | failed`;
- explicit `hasClearRequest`, `hasAbortRequest`, original IDs and original command identity, independent of whether an ID is missing/null/zero;
- validated restore result, one-shot response flags, one-shot abort-sweep flag;
- at most one deferred terminal record and bounded settlement-probe response records;
- restore and follow-up deadlines, both cleared on retirement/disposal.

Keep **one** follow-up-pairing latch, scoped to the current generation. Do not retain a list of unmatched clears. Correlate internal responses by exact private ID plus `command === 'abort_and_restore_queue'`; never `String(id)`-coerce arbitrary responses. An internal ID namespace must not overlap client request IDs; use a per-pipeline unpredictable prefix and enforce separation for accepted client IDs rather than rely on `ompt3-queue-1` being unused. Late responses in the owned namespace are consumed as late internal results, never forwarded as client responses or used to mutate new state.

Repeated distinct clear requests are not retries without a protocol retry token. Proposed bounded handling: while a restore is in flight, answer another distinct clear/independent Stop with an explicit busy error rather than silently merging unrelated Stop identities or growing a queue of operations. An early **matching follow-up abort** is attached to the one clear transaction. Validate this overlap policy against T3 before making it firm.

### 3.2 Normal transitions

| Input / observation | Action |
| --- | --- |
| Clear, no active Stop | Create transaction/barrier **before** calling the existing settlement abort path. Fire native-child sweep once, retaining card-close/cancel-before-settle ordering. Send one internal atomic request. Do not forward clear to OMP. |
| Lone abort | Same atomic path, storing abort identity. Use the barrier to keep its returned withdrawal data ahead of terminal output; do not settle the paused run before knowing the restore result. |
| Abort while the clear transaction is restoring | Record its presence/ID; do not fire sweep again or write another abort. Finish only when the restore result exists. |
| Valid atomic success | Validate both arrays and text entries, prepare loss flags, write clear result if owed (or lone-abort result). If the matching abort already arrived, release terminal output and acknowledge that abort exactly once. Otherwise enter the bounded follow-up wait. |
| Follow-up abort after success | It proves a normal sequential T3 clear consumer progressed to abort. Release old terminal output and acknowledge using the original abort ID; retire the entire transaction. No second OMP abort. |
| New prompt after restore success but no follow-up | Retire the pairing latch and finish old output **before** admitting the new generation. The next abort starts a new atomic operation. A terminal from the old generation cannot be emitted after the new prompt's output. |
| New prompt/session mutation while restore unresolved | Immediately invalidate follow-up pairing across that boundary. Do not forward new work into an outstanding old abort. Recommended bounded behavior: explicit “Stop is still resolving; input not accepted” response, not an extra shim message queue. Resolve consumer retry behavior under U-Q; never silently drop or auto-replay user text. |
| Disposal / child exit | Clear timers, discard the pairing latch/terminal barrier, answer outstanding requests with a connection/Stop failure where transport remains writable, and make late callbacks inert. |

An unsolicited `agent_start` can occur during OMP abort unwind (O3); it is **not automatically a user prompt** and cannot be used as an unexamined “retire and replay everything” shortcut. W03 must determine which lifecycle edges are safe to associate with a generation. In the absence of reliable provenance, fail the unresolved transition explicitly rather than attach an old settle to new work.

### 3.3 Ordering without arbitrary downstream buffering

1. Refactor the proxy's output seam, not the OMP queue: process normal downstream frames immediately through model, command, subagent and doctor logic. All ways of emitting a terminal (settlement return, idle upstream return, doctor `onSynth`) must use one Stop-aware writer. Side-effecting native cancellation stays immediate.
2. While the Stop barrier is active, retain only the terminal signal for that generation; coalesce duplicate aborted terminal signals. Avoid holding token streams, approval dialogs, tool results, catalog/command replies, or internal cancellation replies. Do not replay already-processed raw frames and mutate settlement state twice.
3. `get_state` needs special treatment: an idle reply may itself make T3 settle. Do not falsify `queuedMessageCount`/`hasPendingAsyncWork`. Until the client contract is established, classify a potentially finalizing get_state response as ordering-dependent and hold it with an explicit small cap/deadline; pass non-finalizing state and unrelated responses normally. Unknown-until U-Q: exact consumer finalization paths, including whether raw `agent_end` must also be gated.
4. A successful clear response is not necessarily **consumed** before the next line if both travel in one pipe chunk. The follow-up abort is the preferred acknowledgement fence for the sequential T3 client. “Write clear, then immediately write settle” alone is not sufficient proof; replay both lines in one chunk in the consumer fixture.
5. Make bounds named constants and test them with controlled time: proposed ceilings are one transaction/terminal and at most 16 ordering-dependent responses totaling 1 MiB. Deadline values must be selected against the actual T3 request/Stop timeout (U-Q), not a guessed sleep. Overflow fails the outstanding transaction explicitly rather than accumulating memory or returning fake queue data.
6. When restore has succeeded but abort never follows, expiry must release the already-ordered terminal, clear all pairing state, and emit a diagnostic that the handshake was incomplete. A later abort is a **new Stop**. Wire clear-before-settle remains true; whether a stalled client renders the notice cannot be guaranteed without the acknowledgement and is a documented limitation, not a silent success claim.
7. When the atomic response itself never arrives, do not turn an optimistic idle settle into proof of successful withdrawal. Fail pending requests and make the affected provider transaction unusable for new work until safely closed; no automatic retry, second plain abort, or replay of stored user messages. See U-E for the owned-process shutdown boundary.

### 3.4 Compatibility failure recommendation

Reject upstream's silent fallback as the default design: O1/O2/O3 show why plain abort is not equivalent to queue withdrawal. Preferred contract on unsupported/malformed atomic RPC: correlated error(s) naming the missing command and recovery requirement, no success/empty-list substitution, then controlled failure of **this shim-owned provider connection** if needed to prevent admitting work into an unknown Stop state. Do not restart T3, respawn automatically, or claim queued texts were restored. Close the provider only through an explicit reviewed callback, not process-global signals from a library adapter.

This is a proposal requiring a ledger decision (U-E), not an accepted broad minimum-version change. If the orchestrator instead retains best-effort plain abort for old versions, it must explicitly record the queue-safety exception, surface it for **both** clear+abort and lone-abort clients, and prove fallback response identity/order. Forwarding the original abort and hiding the atomic error is unacceptable. No change may describe this as reliable queue preservation on unsupported OMP.

### 3.5 Queue result shape and limitations

Normalize only observed supported item forms (string or `{text:string, ...}`); preserve each text exactly. Require both `steering` and `followUp` arrays; invalid entries/result shape must not silently disappear into successful empty arrays. Images are not encoded into text or persisted elsewhere. OMP `truncated` means some withdrawn texts are unavailable; return available text with an explicit loss notice before settlement and retain metadata where the consumer accepts it. A model-free consumer fixture must show what is visible. Do not assume 18.20.0's response fitting exists in every supported OMP release.

## 4. Catalog and routing implementation decisions

### Catalog

- Cut over session requests completely: remove `setCachedModels`, persisted reads/writes, stale state/warnings, builtin model constants, prewarm and callers that only support those paths. Do not delete a user's old cache file on disk; merely stop reading/writing it.
- Keep `pruneModels` pure. Prefer simply forwarding the upstream catalog request unchanged, with a strict downstream response discriminator, over retaining an upstream interceptor that adds no transformation. Migrate tests/callers in the same slice.
- Standalone discovery and response building are separate operations: response building accepts an already discovered list and never launches a child implicitly. Error paths are exercised with a fake executable; no diagnostic “fallback means PASS”.
- Live response errors are not reclassified as CLI failures. If doctor wording is updated for the new source, preserve issue ownership and test it with synthetic errors only. No new issue triggers on benign empty live arrays.
- Keep current launch agent-directory policy unless a reviewed context bug requires changing it. U1 also changes `PI_CODING_AGENT_DIR` override precedence; session-authoritative discovery does not require that unrelated launch-policy change.

### Routing

- Reuse the existing generated-extension/content-keyed cache mechanism. Pass an explicit launch-derived `routingEnabled` into generation; do not infer it from model-policy activity or environment alone (environment cannot reveal explicit `--tools`).
- Keep `createSubagentPolicy().checkTool()` model-policy semantics opt-in. A routing-only hook may reject native task while routing is enabled, but it must not turn native task into an unconditional policy rejection for opt-out/explicit tools. Reuse the existing delegate-model runtime source wherever policy checks remain.
- Filtering reads the live enabled list, removes exactly `task`, awaits mutation, and repeats at verified restoration/dispatch seams. Do not install a fixed list, enable all registered tools, disable MCP/extensions, or add a new delegated-thread semaphore/four-task rule.
- Confirm the generated hook itself loads on the no-extensions path used by supported OMP. No-method/failed-mutation behavior must be documented and tested; O7 means throwing alone is not enough. Recommended unsupported-API behavior: explicit diagnostic plus native-task call guard on the enabled routing path; if the loader/guard cannot be proven active, refuse the affected launch rather than silently claim routing. Resolve exact enforcement path under U-R before deleting probes.
- Remove readiness-prune machinery only in the same green slice as the working hook. Keep extension adaptation before final launch, mode rewrite, offline hint consumption and cap overlay. Do not copy U1's bin import changes over local execFileSync safety.

## 5. Bounded committable slices and evidence

All shared edits are serialized (`src/proxy.js`, `src/cli.js`, `bin/omp-t3`, policy generation, README). No parallel implementation in this checkout. Commit labels below are suggestions for the orchestrator, not commits made by this worker.

| Slice | Files / bounds | Readiness and acceptance | Targeted proof before independent review |
| --- | --- | --- | --- |
| S0 — research/decisions | This plan, W03 evidence, orchestrator ledger only | W01/W02 evidence persisted; adopt/revise AC; resolve queue/routing unknowns. A plan checkpoint can be committed without implementation authorization. | Static source citations; independent design review of Stop transitions and routing lifecycle. |
| S1 — session catalog + efforts | `src/model_catalog.js`, relevant `src/proxy.js` catalog path, `bin/omp-t3` check caller; catalog/e2e/check contract tests; README catalog/thinking notes | W05/W06; AC1/2/5. Firm only after U-C/U-T decisions. No queue/routing edits in this slice. | `node --test test/model_catalog.test.js test/e2e.test.js test/check-shell.test.js`; deterministic fake CLI context/executable scenarios and stream-driven live-response fixtures. Full package gates at green checkpoint. |
| S2 — corrected Stop | New `src/queue.js` (or equivalent focused module), `src/proxy.js`, necessary settlement output seam; new behavioral queue tests and existing abort e2e updates; README Stop limits | W07/W08; AC3/5. **unknown-until U-Q/U-E**. Keep normal non-Stop settlement behavior intact; no subagent rendering redesign. | `node --test test/queue.test.js test/e2e.test.js test/settlement.test.js test/subagent.test.js test/doctor.test.js`; scripted same-chunk T3-consumer scenario, bounded-time/no-follow-up scenario, synthetic OMP error scenario. No model requests. Full package gates. |
| S3 — live enabled-tool routing | `src/cli.js`, `bin/omp-t3`, existing generated policy mechanism; routing/launcher tests; minimal existing inheritance/extension fixtures if their generated interface changes; README routing/help | W09/W10; AC4/5. **unknown-until U-R**. Keep `src/delegate_models.js` behavior; do not replace it with upstream defaults. | `node --test test/cli.test.js test/delegate-enforcement.test.js test/launcher.test.js test/subagent_policy.test.js test/delegate_models.test.js test/extension_compat.test.js test/extension_compat_ledger.test.js`; no-provider extension lifecycle fixture proves enabled tool sets/custom mounted tools, one actual session launch, restoration and opt-out. Full package gates. |
| S4 — whole-change convergence | README/Unreleased consistency, evidence links and ledger accounting; no version/owner changes | W11/W12; AC5/6. Every unknown resolved or a real blocker recorded; independent reviewer did not implement the slices. | Union review focused on shared proxy/CLI seams; then final `npm test` and `npm run check` after last change, recorded stdout/exit status and diagnostic isolation. Commit owned files only, never push. |

Do not split an implementation slice at “module added but proxy not wired”, “tests adjusted but known queue races remain”, or “probes deleted but hook unproven.” Each checkpoint must provide its contract end to end.

## 6. Existing tests: preserve contracts, replace obsolete mechanisms

### Catalog / diagnostics

- Keep pruning, provider-prefix and literal-executable-path cases in `test/model_catalog.test.js`. Replace cache-interception/persisted-fallback expectations with live-child response authority, no answer before child response, explicit discovery failure, and two distinct contexts. Adapt the literal-path case to the new API; do not discard shell-metacharacter coverage.
- Update `test/e2e.test.js`'s initial model discovery: it currently calls the real default discovery path and expects local interception. Feed a synthetic child catalog and inspect what the client actually receives. Do not weaken it to only counting calls or allowing either source.
- Retain `test/check-shell.test.js`'s marker non-creation and observed binary version. For a successful --check scenario, give the fake executable a nonempty synthetic catalog; add a separate failing-catalog case rather than depend on fallback PASS.
- New plausible edge cases: numeric `0` vs string `"0"`, changed live catalogs on subsequent requests, empty live catalog, child failure, malformed success, efforts object with xhigh/max and holes, CLI equivalent, explicit empty capabilities and the approved unknown-capability behavior.

### Queue / settlement

- Existing `test/e2e.test.js` abort cases at lines 73, 293, 396, 478, 507 and fleet cases cover observable settlement/native-child behavior. Update the child command expectation to atomic restore and feed its response. Preserve native-child terminalization before settle, cancellation before atomic request, late child provenance cancellation and new-prompt disarm. Only idle/terminal timing genuinely changes to wait for queue-result ordering.
- Preserve `test/settlement.test.js` normal completion, pending-work aliases, wake cycles and compaction tests; don't rewrite unrelated expectations to make the adapter green. Preserve byte-passthrough and approval/usage/command tests.
- New queue tests must observe child/client frames, not private maps, buffers, ID prefixes or exact helper names. Required cases: clear then abort both sides of the result; lone/idless/numeric-zero abort; text order/duplicates/empty text; active and paused runs; unsupported and malformed result; late result after retirement; clear/no-abort/new-prompt/later-Stop regression; second clear/overlap policy; unrelated model/command/cancel responses during a barrier; state-probe settlement interaction; missing response/follow-up timeout and disposal; upstream truncation disclosure.
- Use the real proxy/settlement/subagent components with synthetic streams for ordering. A fake time source is appropriate for uncertain deadlines; wall-clock sleeps and fixed internal ID assertions are not. A consumer fixture must deliberately process clear+terminal in one chunk to exercise the acknowledgement race.

### Routing / inheritance

- `test/delegate-enforcement.test.js` currently pins the injected list and fallbackArgs. Replace those mechanism assertions with the resolved enabled-tool behavior and the complete routing/model-policy/explicit-tools truth table. Preserve user appendix content but delete tests of exact policy prose.
- `test/launcher.test.js`'s singular/plural/slow/late probe-pruning tests describe a removed algorithm. Remove them when that algorithm is removed, replacing them with one-session launch, delayed readiness without duplicate startup, explicit-tool error passthrough, final-child spawn error, signal cleanup, adaptation-before-launch, offline discovery, and no unguarded launch on active-policy failure.
- Keep native cap coverage in `test/cli.test.js`, including no variable, valid overlay, invalid input, unwritable cache and distinct caps. Remove obsolete `delegation.fallbackArgs` assertions, not the offline behavior they accompanied.
- Keep policy check results and transformed MCP-boundary execution tests. Generated-hook fixtures that assert every registration is exactly `tool_call` are implementation detail: use an event-handler map and exercise outcomes. Do not re-pin a new handler count/source string.
- Preserve the entire consumer-facing inheritance matrix already in `test/delegate_models.test.js`: role/frontmatter/aliases/settings-layer updates; options merging and explicit clears; Pi/local scoping; explicit model and opt-out; policy checks the filled value; actual adapted client sends it. VM-cross-realm outputs should continue to be JSON-normalized when comparing values.
- A model-free OMP extension fixture should expose a synthetic command reporting enabled tools, restore a synthetic session tree, and report again. It must not launch real task/delegate work or invoke paid providers. W03 owns executable spike evidence; this worker did not run it.

## 7. Verification safety and gates

1. No real `gh` in error-path verification. Inject `ContractDoctor({issuesEnabled:false})` for in-process tests; for launcher/process scenarios prepend a fake `gh` that records/rejects issue creation, use synthetic diagnostic data and isolated HOME/XDG state. Merely omitting gh credentials or trusting “sanitized” labels is insufficient.
2. `npm test` is `node --test test/*.test.js`; `npm run check` is `./bin/omp-t3 --check`. Run the named package gates, not assumed build/lint commands. Existing e2e catalog discovery must stop accidentally spawning installed OMP as part of fixture tests.
3. `--check` is not read-only by default: session-symlink setup can write, and OMP CLI discovery may load configured extensions/refresh provider catalogs. For no-external-change gates, run it in an isolated HOME/cache/state/config with a controlled synthetic executable and gh stub. Report that as a **CLI/diagnostic gate**, not verification of the user's configured providers. Any separate installed-OMP no-provider smoke needs W03's explicit safe fixture; do not swap in paid/live verification to remove uncertainty.
4. Record exact command, environment isolation category, exit code and artifact path at each gate. Run narrow changed-surface proof first, fix failures, then checkpoint gates and independent review. Final gates run again after the last whole-change adjustment.
5. Throwaway verification scripts/data are temporary and removed; persist only concise evidence and permanent consumer-visible regression cases. No new source-text, wiring-only, exact-ID-prefix or wording tests.
6. This planning task launches no runtime/heavy work. Later workers must honor the shared heavy gate for browsers/Electron/emulators or commands expected over 2 GiB: `~/.omp/bin/heavy-gate`, finite gated bash `async:true, timeout:0`, no timeout wrapper, no bypass. No browser is required for this RPC/CLI design.

## 8. Unknown-until register and required decisions

These are explicit implementation blockers for the affected contract, not deferrals. The orchestrator must resolve them from W03/review evidence and append decisions to the ledger. Do not label a slice verified based only on a shim fixture that assumes the answer.

| ID | Unknown until | Required evidence / decision | Affected scope |
| --- | --- | --- | --- |
| U-Q | W03 establishes actual T3 clear/abort sequencing, request timeouts, parsing/finalization paths and OMP lifecycle order | Source plus no-provider wire/consumer fixture: sequential vs early abort, same-chunk responses, clear without abort, idle state probes, unsolicited cycle during abort, session changes, and text-only/loss-flag visibility. Set finite deadlines from this evidence; choose overlapping/new-input behavior explicitly. | S2/AC3; terminal barrier shape and lone-abort display claim |
| U-E | Independent review accepts old-command/error/timeout behavior and owned-provider failure boundary | Decide fail-closed Stop/provider connection (recommended) versus explicitly unsafe best-effort plain abort. Prove correlated failure for both client styles, no optimistic successful restore, cancellation/settle ordering, no stale ownership, no T3 restart. Record any old-version limitation; do not silently narrow AC3. | S2/AC3.6 |
| U-R | W03 proves routing hooks against supported OMP startup/restoration/dispatch and missing APIs | No-provider enabled-tool fixture, mounted/custom tool preservation, opt-out and both explicit-tools forms, no-extensions behavior, awaited mutation, failure reporting/guard behavior, and one-session startup. Installed O5–O7 are necessary but not runtime proof. Do not assert a minimum supported release without evidence. | S3/AC4 |
| U-T | T3 thinking map fallback semantics and installed OMP capability variants are inspected | Establish behavior for boolean/missing/empty/budget-only capabilities; approve non-fabricating projection that does not introduce unsupported T3 options. Arrays/efforts exact mapping is already source-supported. | S1/AC2.3 |
| U-C | Large raw session catalogs reach the shim and T3's rewritten-frame bound is established | Check OMP v1 framing/oversize behavior before pruning, not only the small-output fixture. Decide explicit error for an oversized pruned response; no list truncation/fallback. The T3 test fixture must cover the consumer-visible result. | S1/AC1.6 |

No caller should interpret this plan as permission to change upstream/fork ownership, install plugins, run live paid tasks, or restart shared services to resolve these questions.

## 9. Reusable lessons to carry into the implementation checkpoint

This worker is forbidden to edit AGENTS.md. The orchestrator may record the approved reusable lessons in the repo-level Lessons section with the relevant permanent slice:

- OMP 18.20.0 extension `getActiveTools()` exposes the enabled union, including `xd://` mounts, not just top-level tools.
- Its atomic queue restore can return `truncated`/`imagesDropped`; successful withdrawal does not guarantee every text/attachment fits the response.
- Its extension handler exceptions can be reported and swallowed; throwing inside a routing hook is not by itself proof that the launch or turn is blocked.
- Session catalogs honor live `enabledModels`; standalone model listing cannot replace that authority even with matching cwd/profile overlays.
