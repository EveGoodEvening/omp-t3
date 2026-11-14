# W11 — whole-change protocol/safety review r1

## Verdict: FIX REQUIRED — two concrete findings

Independent review of the combined catalog, Stop and routing goal since `aafbe12`, including committed catalog checkpoint `eac8480` and the current uncommitted P3/P4 work. **Two open Fix findings (one high, one medium); zero Replan findings.** No functional Discards. Earlier catalog/Stop PASS receipts were evidence to inspect, not blanket approval of the union.

Authority: single ledger AC1–6, P1–P5, D01/D08/D10/D16/D20 and frozen P3 bounds; catalog implementation receipt; Stop correction r2 and both original-scope Stop r3 reviews; routing implementation receipt and its actual-generated-file installed-API proof. Read new controller, generated-hook adapter, queue and owner fixtures directly, not only tracked diffs. Reviewed production source and relevant callers/tests/docs across catalog, queue, proxy, settlement, doctor, routing generator/CLI/bin, delegate defaults, extension adaptation, commands, notices and native-child cancellation/provenance. Checked release/install/issue/update ownership against the whole-change inventory.

Only this new report was written. No source/test/docs/ledger/AGENTS edits, commits or subagents. No installed OMP/T3, provider, gh, browser, credentials or external user-state execution. No broad suite, parent diagnostic gate or historical failure was rerun. One new finite synthetic command exercised the two suspected boundaries below; exit 0 in 11.07 seconds. Temporary fixture/cache/state were removed and owned processes terminated afterward.

## WP1 — High / Fix: pre-acknowledgement process exit cancels the only startup bound

**Source:** `src/proxy.js:429–452,472–477` (`spawnAndProxy`).

The required-hook timer is cleared unconditionally on main-child `exit` (449–452), even when `hookRegistered` is false. Missing registration is otherwise detected only on child `close` (473–475). A descendant retaining an inherited pipe delays `close` independently of the main child's already-observed exit. Consequently the shim can remain alive indefinitely with no registration, no refusal and no admitted RPC. The fixed 250 ms failure owner is never invoked. This is the precise exit-versus-pipe distinction already handled by `createProviderOwner`, missed at the new startup boundary.

**Observed new counterexample:** ran the actual `bin/omp-t3 --mode rpc --no-session --offline` with an allowlisted scratch environment and literal fake OMP executable. The fake spawned a synthetic Node holder inheriting stdout/fd 3, recorded its PIDs, then exited 7 without acknowledging. Queued a model request and lone Stop to shim stdin. At 11,000 ms (beyond the ten-second registration deadline), the fake main was reaped, the shim was still alive, and neither stdout nor stderr contained anything:

```json
{"case":"pre-ack-exit-retained-pipes","observedAfterMs":11000,"mainAlive":false,"shimExitCode":null,"shimSignalCode":null,"stdoutBytes":0,"stderr":""}
```

The holder is a synthetic retained-pipe hazard, not a production fake fallback or a claim about installed OMP internals. Cleanup occurred only after those observations. Static cause does not depend on queued requests: they demonstrate the resulting model-menu/Stop admission deadlock. No child replacement, remote service or real model was involved.

**Required correction:** retain a finite startup-failure observation path after unregistered main exit while permitting already-written acknowledgement bytes to drain. Do not make required-hook refusal depend on descendant-held `close`; do not fail immediately on `exit` in a way that loses valid in-flight acknowledgement bytes. Preserve one session, direct-child ownership, no retry/replacement and bounded nonzero refusal. Add a consumer-facing startup regression with actual main exit and a retained pipe, plus the existing immediate-valid-ack/exit behavior.

**Coverage gap:** `test/launcher.test.js` covers normal early exit after successful registration, load/registration failure and continued-ready missing hook, but none retains a pipe after an unregistered main exits. Its natural-exit/signal fixtures therefore do not cover this new owner seam. AC4/AC5 and P4 registration-refusal behavior remain incomplete; this is not D10's concurrent tool-map limitation or an accepted provenance risk.

## WP2 — Medium / Fix: catalog error serialization bypasses the UTF-8 ceiling

**Source:** `src/model_catalog.js:57–60,64–72,85–91` (`errorResponse`, `serializeModels`, `handleDownstreamFrame`).

Only success serialization checks the final byte length. On projection overflow, `errorResponse` copies the original ID into a larger error envelope without checking its size. A legal upstream frame already fitting the 1 MiB ceiling can therefore cause the shim itself to emit an oversized error frame. Typed/present ID fidelity does not make that error small.

**Observed new counterexample:** one successful live response with a valid single model `{id:'m'}` and a long string request ID, sized to exactly 1,048,576 UTF-8 bytes including LF. Projection exceeds the success ceiling and takes the intended explicit-error path, but that error is **1,048,607 bytes**:

```json
{"case":"catalog-error-ID-budget","inputBytes":1048576,"outputBytes":1048607,"success":false,"limit":1048576}
```

Exact no-file reproduction of the catalog portion:

```js
const { ModelCatalogManager } = require('./src/model_catalog.js');
const limit = 1048576;
const frame = { type: 'response', command: 'get_available_models',
  success: true, id: '', data: { models: [{ id: 'm' }] } };
frame.id = 'i'.repeat(limit - Buffer.byteLength(JSON.stringify(frame) + '\n'));
const input = JSON.stringify(frame) + '\n';
const result = new ModelCatalogManager().handleDownstreamFrame(input.trimEnd());
console.log(Buffer.byteLength(input), Buffer.byteLength(result.line));
// Observed: 1048576 1048607
```

**Observable impact:** a framing-limited consumer rejects the shim's purported small correlated error rather than receiving the promised bounded catalog failure. This is not upstream pre-pruning overflow: the input itself fits. Real upstream failure passthrough need not be changed.

**Required correction:** enforce the ceiling for shim-generated catalog errors too, preserving the original ID/type where a bounded correlated envelope is representable. A shorter error can fit this concrete input; do not truncate IDs, invent correlation or serve fallback models. Define explicit transport handling if even the minimal correlated envelope cannot fit. Extend the boundary test to include ID/error-envelope cost, not just model-name expansion.

**Coverage gap:** `test/model_catalog.test.js` tests exact limit ±1 with empty/one-character IDs, while typed-ID tests use short IDs. Neither covers the overflow-error envelope. AC1 and its AC5 documentation claim remain incomplete; D08/D09-style finite bounds cannot waive this case.

## Retained whole-change assessment

### Catalog authority and thinking

Requests pass once to the existing child; response adaptation is downstream only. No cache/prewarm/CLI substitute remains. Whole-array identity validation fails rather than dropping individual malformed entries. Existing real failures, including ID-less protocol-1 overflow, pass unchanged. Live empty success and standalone empty failure are distinct. `--check` discovers with literal executable/argv and inherited process cwd/environment; no profile-overlay interface or discovery-to-issue callback was reintroduced.

Complete seven-key maps use exact advertised CLI arrays/RPC efforts, including `xhigh`/`max`; absent/boolean/budget/unknown capabilities stay all-null. Reasoning is independent; this advertising does not clamp caller or role thinking. Existing tests cover duplicates, escaping/multibyte names, whole-member failure, subsequent streaming, typed/missing IDs, and duplicated-list success size. WP2 is the uncovered error-envelope interaction, not rejection of those checks.

### Atomic Stop and ordinary ownership

Rechecked the full current controller and producer seams, not just W23: one private random namespace/transaction, strict private response command/type/string-ID matching; one sweep and atomic withdrawal; exact available-text order/duplicates/empty text; whole restore validation and visible truncation/image loss; one mutation-invalidated follower, no hidden input queue/replay/retry/plain-abort fallback.

Exact string state-destination correlation precedes catalog/command/subagent adapters; normal pending-count projection precedes gating. Literal activity and finite nonzero counts pass; failed/idle/missing/malformed matched outcomes remain fenced without a busy sentinel. Source preserves original external response command/ID/outcome. Correlation and deferred output are count/byte bounded.

All normalized terminal producers share `outputRecords` and the controller: idle abort, active agent-end suffix, translated/raw settlement, fallback/local command completion, doctor synthesis. Nonterminal prefixes pass. Release retains failure ownership through actual write callbacks, not admission or `_write` entry; terminal bookkeeping waits for all retained callbacks. Generation, transaction and disposal guards protect replacement prompts, saved deadlines and doctor/hold-open lifetimes. The 1,000 ms restore bound, existing 500 ms follower/completion fence and 250 ms fatal-owner observation remain finite and are not traffic-renewed.

Ordinary unrecoverable transport errors and Stop failures reach the mandatory direct-child owner before pipe closure. Owner observes `exit`, not `killed`/`close`; SIGKILL is direct, not a group signal. Fatal admission retires before best-effort diagnostics. New startup WP1 is outside the started pipeline and therefore bypasses these otherwise retained safeguards.

Read the real-Writable completion cases and the actual-main/provider owner fixtures, including saturation, retained holders, ordinary errors and async callback failures. Consumer fixture matches exact string waiter IDs, failure-sensitive outcomes, split and same-batch scheduling, notice object identity and pre/post-activity distinction. Source/fixture review found no additional Stop regression. Attributed prior r3 narrow probes and W23 gates remain evidence, not this reviewer's executions or live Effect/T3 equivalence.

### Routing, startup and preservation

Launch-derived routing intent remains independent of opt-in policy. Either explicit tools form (including missing/empty/invalid values) or environment `0` disables routing only. Original tool arguments, caller appendices, sessions/offline consumption and native concurrency overlay remain. The generated hook is appended through the existing content-keyed/atomic convention; lifecycle get-to-set has no intervening await, removes exact `task`, skips absent task and awaits completion. Filtering failure diagnoses headlessly while the independent ordinary-dispatch guard remains. No fixed-list/probe/prune/retry launch path survives.

Model defaults remain live-settings based, fill before opt-in checks, and return the checked replacement input. Explicit model/options/clears, provider/machine scope, roles/frontmatter/overrides, opt-out and unavailable-settings behavior remain covered. The adapted bridge still preserves skill paths and MCP ownership identity. Routing receipt's installed proof loads the actual generated file and exercises real loader/runner/SessionTools; it is not production code copied into a test fake. Structural host doubles and injected tree events are honestly disclosed. VM adapter only strips ESM syntax. No installed runtime was executed by this reviewer.

Source gates RPC/readiness on child fd-3 registration; queued model/menu/Stop traffic is not forwarded early. Successful acknowledgement, ready subscription and later Stop use the same sole child/owner. WP1 exposes the missing pre-ack-exit liveness branch. Registration acknowledgement is guard registration, not a claim that filtering always succeeded, sandboxing or tool-map atomicity.

Shell-safe diagnostic invocation, no-default-model-policy, local model/thinking inheritance, skill/command menus, startup bridge adaptation and version/ownership URLs remain preserved in reviewed source. Package/formula/updater/issue destination were not imported from the fork. README/Unreleased explain the intended contracts and D10/tool-display/provenance limits; the two findings must be fixed rather than weakening those contracts.

## Acceptance and plan accounting

| Item | Whole-change review disposition |
| --- | --- |
| AC1 / P2 live catalog | **Fix WP2**; authority, typed IDs, empty/error behavior and success projection otherwise retained. |
| AC2 / P2 thinking | No additional finding; seven explicit keys/all-null unknown support and independent caller/role options retained. |
| AC3 / P3 Stop | No additional finding in started-pipeline protocol/ownership; r3 obligations rechecked. Startup admission interaction is blocked by WP1, not waived by prior Stop PASS. |
| AC4 / P4 routing | Stable lifecycle/guard/truth-table behavior retained; **Fix WP1** for required-hook exit/refusal bound. |
| AC5 / preservation/docs | No unrelated ownership/policy/offline/shell/skill regression found; WP1/WP2 prevent full end-to-end contract approval. |
| AC6 / P5 review/gates | **Not converged**: two open Fix findings. Parent full isolated project/actual diagnostic gates are separate, reportedly running; no result fabricated or duplicated here. Corrected-tree final gates and independent re-review remain necessary. |
| P1 planning | Firm reviewed scope respected; no new plan choice requested. |
| D16/G1 checkpoint | Obsolete probe implementation/tests have been removed with stronger single-final-child tests, not suppressed. Historical 323/324 failure remains ground truth. This report does not close G1 or authorize a green commit. |

Accepted external constraints remain exactly external: concurrent full-selection/mount API races; no shared Stop gesture ID; upstream truncation/image loss; T3 display/finite-expiry limitations; non-universal external provenance/containment. Neither finding is one of those accepted risks. Only F04 presentation/plugin exclusion remains outside scope under D01; no functional finding is Discarded, silently narrowed or deferred.
