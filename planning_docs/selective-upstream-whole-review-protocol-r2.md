# W11 — independent whole-change protocol/safety review r2

## Verdict: PASS — zero open Fix, zero Replan

Independent combined-goal review since `aafbe12`, including current untracked `src/queue.js`, `test/queue.test.js`, `test/stop-owner.test.js` and `test/generated-hook.js`, not merely the W24 corrective diff. WP1/WP2 close; related RR1/RR2/RR3 corrections are supported at the reviewed source/process-contract boundary. No functional Discard, acceptance reduction, new accepted risk or architecture substitution.

Authority: ledger AC1–6/P1–5/D10/D16/D21–D23; prior whole-change protocol/accounting r1; routing review r1 and W24 `selective-upstream-routing-fix-r1.md`; catalog review r2 and both Stop protocol/owner r3 reviews. Inspected combined production source, original queue/owner and corrected launcher/catalog corpus, generated handler and lifecycle cases, preservation adapters/defaults, diagnostic isolation fixture and documentation. Earlier reviews and implementation results are attributed evidence, not this reviewer's runtime results.

Only this report was written. No implementation/test/other docs/ledger/AGENTS changes, commits or subagents. No installed OMP/T3, provider, gh, browser, credentials, real session, user cache/state or external service execution. No broad project/diagnostic gate or reported failure was rerun. One new finite no-file synthetic integration probe is documented below.

## Original findings and related routing dispositions

| Finding | Severity / disposition | Source and independently assessed effect/evidence |
| --- | --- | --- |
| WP1 = RR1 = WA1 | Original High / **closed** | `src/proxy.js:432–456,475–496`: only complete selected-contract acknowledgement clears the original 10,000 ms timer. Direct-child `exit` no longer clears it. `close` grants one `setImmediate` drain opportunity, not a renewed deadline. Missing or partial acknowledgement with retained stdout/fd3 therefore still reaches `owner.fail`, whose fixed 250 ms finish does not await descendant-held `close`. The existing deadline remains armed through close-time judgment. Valid queued acknowledgement can start the sole pipeline before close-time refusal. |
| WP2 | Original Medium / **closed** | `src/model_catalog.js:57–72,99–103`: all generated failures measure final UTF-8 JSON plus LF with the original own-property ID. Detailed, short, empty and no-optional-detail candidates preserve correlation when representable. Equality fits; minimal one-over returns an explicit fatal disposition. `src/proxy.js:261–266,45–56` transfers that result to the existing mandatory transport owner, not a fabricated response, thrown listener exception, retry or silent pending request. Raw upstream failures remain unchanged. |
| RR2 | Original High / **closed at required-contract boundary** | `src/subagent_policy.js:75–115,129`, `src/cli.js` and `bin/omp-t3` carry the selected `{file, identity}` through generation/argument adaptation to spawn. Embedded identity hashes canonical generated source; final source independently determines the cache filename. Routing-enabled and policy-only contracts differ. A different generated source neither acknowledges nor closes fd3. `proxy.js:413–417,435–451` deletes inherited old/new channel fields, supplies only the selected identity and accepts its exact JSONL prefix. The generated factory acknowledges only after lifecycle and ordinary-dispatch guard registration. |
| RR3 | Original Medium / **closed** | `src/proxy.js:471–486`: forwarding callbacks are individually retained and only those owned callbacks are removed before mirroring child termination. Default SIGTERM/SIGHUP no longer encounter the shim's own forwarding listener; numeric status remains the direct child's status. No global listener deletion, group signal, replacement process or forced success. |

### Corrected proof corpus inspected, not rerun

- `test/launcher.test.js:59–64,281–304`: actual entrypoint, synthetic literal executable, missing/partial acknowledgement plus real main exit and retained descendants; stdout/RPC nonadmission, one launch, main ESRCH, retained holder and unrelated sibling liveness before cleanup. The retained cases assert original ten-second deadline plus bounded observation. Valid immediate exit and forced exit-before-data delivery preserve status 7. The forced-order preload delays actual fd3 data rather than fabricating exit.
- Earlier generated policy-only source executes unchanged. Missing required routing source cannot admit readiness/RPC; correctly loaded selected source succeeds. Fragmented/duplicate delivery and inherited legacy-field consumer coverage remain. The legacy consumer tests channel migration, not every historical cache artifact.
- Default SIGTERM/SIGHUP assert signal status; the pre-existing handled SIGTERM → 42 case and sibling/reaping assertions remain. No signal assertion was replaced with a numeric approximation.
- `test/model_catalog.test.js:168–227`: near/exact legal input budgets with long escaped/multibyte IDs, oversized messages, absent/null/numeric/string identities, minimal-envelope exact/one-over boundaries, pipeline retirement/nonadmission. `launcher.test.js:315–322` additionally observes actual owned-main termination for unrepresentable correlation before cleanup.
- W24 reports final launcher 31/31 and 254 other focused passes, plus corrected unchanged-generated-source installed OMP 18.20.0 proof. Its failed first close-drain attempt, rejected loader `import.meta.url` identity and stale partial-fixture correction remain disclosed. This report does not rerun, erase or count those failures as passes.

The acknowledgement is selected generated-contract registration, not proof that every later filter succeeds or a sandbox against an arbitrary extension forging process I/O. Identical generated contracts may share identity/content; a distinct policy-only/legacy contract cannot satisfy routing registration. The ten-second bound covers unregistered startup, not arbitrary post-registration descendants.

## Full acceptance/contract coverage

### AC1 / P2 — live catalog authority, fidelity and frame bounds

`src/model_catalog.js` has no persisted catalog, prewarm, cache/default list, CLI substitution or recovery retry. Proxy forwards live requests once; adaptation reads the existing child's response. Every member is validated before emitting success; incompatible identity/provider/name types or malformed members fail the entire catalog rather than silently dropping models. Existing supported selector/provider/name fallbacks remain. Own-property ID copying preserves availability/type, including absent, null, zero and empty string, without generated correlation.

Live empty arrays succeed; standalone `discoverModels` rejects empty arrays. Real child failures, including protocol-1 ID-less overflow, bypass generated-error adaptation. Standalone diagnostics reuse the resolved executable with literal argv, process cwd/environment, one explicit discovery and bounded serialization before PASS; no new overlay/profile API or discovery-to-issue path exists.

Success measures the final duplicated `data.models` and top-level `models`, envelope, ID/escaping and LF. Generated errors now use the same 1 MiB ceiling or explicit owned failure when correlation is unrepresentable. Existing exact-limit ±1 model-name tests remain alongside the new ID-envelope tests. No model or ID truncation, fallback list or oversized pseudo-error was introduced. Input overflow already rejected by OMP remains a real upstream failure, not a claim that pruning can repair an unavailable success.

### AC2 / P2 — exact thinking advertising

All seven keys (`off/minimal/low/medium/high/xhigh/max`) are explicit. Exact strings in CLI arrays or live `thinking.efforts` self-map; every absent/unrecognized effort is null. Missing, boolean, budget-only and unknown-only capabilities produce complete all-null maps, preventing partial-map defaults. Reasoning conversion is separate. Caller/role thinking options are not clamped by catalog advertising. Existing array/effort/duplicate/unknown tests retain substantive output assertions.

### AC3 / P3 — original atomic Stop scope retained

Re-read the complete controller and producer/owner seams, plus the original queue/owner corpus; the new startup/catalog changes do not replace their safety argument.

- **Admission and restoration:** one random private namespace/transaction, strict private string ID/type/atomic command ownership, one native sweep and atomic withdrawal, one eligible clear follower and explicit overlap rejection. Every mutation attempt invalidates follower eligibility; unresolved mutations reject before tracker reset/provenance disarm/child writes. Completed mutations first admit old retained output. Restored text keeps original order, duplicates, whitespace and empties; whole-array validation and loss notices precede finalization. No hidden input queue, replay, retry, plain-abort fallback or fabricated recovery.
- **Consumer destination and classifier:** `proxy.js:244–250` routes exact string `get_state` destinations before catalog/command adapters, even for wrong/missing command labels. Ordinary pending-count projection precedes gating. Original command/ID/outcome/error survive. Literal streaming/compacting true or any finite nonzero count, including negative/fractional values, is busy. Nonliteral success and failed/idle/missing/malformed matched replies remain failure-sensitive/fenced; no busy sentinel. Destination tracking is at most 16 string IDs / 16 KiB and retires on response/failure/disposal.
- **Selective output:** `outputRecords` is the common writer seam for idle abort, active agent-end terminal suffix, translated/raw settlement, fallback/local completion and doctor synthesis. Nonterminal prefixes, streaming/tool/approval/unrelated failures remain prompt. One retained normalized terminal and bounded finalizing states preserve ordering; duplicate terminals coalesce without a global downlink buffer.
- **Real completion:** `queue.js:54–64,235–283` retains Stop failure ownership until admitted output callbacks succeed. `write(true)` and terminal `_write` entry alone do not settle. All retained writes must complete before terminal bookkeeping. A new prompt may forward after ordered admission, but old completion cannot settle/stop its doctor or clear its hold-open lifetime. Old delivery failure still belongs to the process owner. Transaction/generation/disposal guards protect saved timers and callbacks.
- **Finite budgets:** 1,000 ms acceptance-origin restore, existing 500 ms follower/release-completion fence and fixed 250 ms failure-owner observation; no renewal on traffic/release. One terminal <=16 KiB; <=16 states totaling <=1 MiB; restore <=1 MiB; queued-plus-proposed Stop child/client writes <=1 MiB, including UTF-8/LF. Missing-follower expiry permits only a zero-delay completion observation turn, not another drain interval. Overflow and nonreading output fail explicitly.
- **Process ownership:** `createProviderOwner` synchronously requests direct-child SIGKILL before pipe destruction; actual `exit`, not `killed`/`close`, determines observed termination. Both ordinary unrecoverable transport failure and Stop failure reach this owner. No process-group/global signal, TERM grace, restart or orphan-through-reader-retirement substitution.

The original Consumer cases still cover exact string waiters without command equality, same-batch and genuinely split parses, notice permit/object identity, malformed/permissive outcomes, finite-count semantics and distinct pre/post-activity failure behavior. Real Writable cases retain callback error/close/never-ack/success and replacement-prompt/disposal checks. Original owner corpus remains 23 actual-main modes, nine provider subprocess modes and one unconfirmed-exit case, with actual exit/kill-before-EOF/retained-pipe/nonreader/sibling observations before cleanup. No callback-count substitute or weakened predicate was introduced.

### AC4 / P4 — live-tool routing and startup/Stop interaction

Original launch intent determines routing independently of model-policy activation. Either explicit tools spelling, including missing/empty/invalid values, or environment `0` disables routing only. Caller arguments/appendices, sessions, offline consumption and native concurrency overlay survive. The default launches one final session, without validation probes, fixed lists, pruning or stock retry.

The existing content-keyed generated extension is appended after user extensions. At startup/tree/before-agent seams it reads current enabled names, immediately invokes and awaits the full-selection setter with exact `task` removed, and skips the setter when absent. Stable non-task names, disabled membership and mounted presentation remain the contract. Getter/setter/API failures diagnose headlessly while the independent routing task-call guard remains registered; later native task re-enablement is blocked at ordinary guarded dispatch.

RPC/readiness admission waits for the selected required registration; subsequent catalog/menu/Stop traffic uses the same child/pipeline/owner. No new unbounded pre-registration RPC buffer or replacement child exists. The acknowledgement timer and later Stop timer own separate phases. Catalog fatal disposition integrates with active Stop ownership rather than bypassing the controller; the new probe below exercises the pending-delivery/replacement-prompt seam.

W24's installed proof loads the actual generated file unchanged through real loader/runner/initializeExtensions/SessionTools/xdev, with stable enabled/top/mounted arrays and byte-identical non-task listing/docs. Its structural host/session doubles, synthetic tool names and injected tree event remain explicit. That is not full CLI/T3/UI/provider/plugin transport or disk-backed restore proof. No installed runtime was executed by this reviewer.

### AC5 / preservation and docs

Unchanged `src/delegate_models.js` and `src/extension_compat.js` preserve live settings/role/override inheritance, caller explicit model/options/clears, provider/machine scope, fill-before-policy/send, returned replacement input, skill path adaptation and MCP ownership identity. Routing does not enable the model allow/deny policy by default or disable independently opted-in policy on explicit-tools/env0 paths. Native-cap/offline/menu behavior is retained.

`bin/omp-t3 --check` uses `execFileSync(path, argv)`, not shell interpolation. The scratch diagnostic fixture records process cwd/environment and literal executable paths with shell metacharacters, preserves ignored legacy caches and rejects gh. Real-doctor tests retain scratch-state lifetime through asynchronous completion; pipeline embeddings use inert doctors. Generic doctor version/issue destination and default issue ownership remain baseline behavior; removed discovery reporting is not reconnected.

Package version/release/install/update/repository ownership were not imported from upstream. README protocol/Atomic Stop/routing/Unreleased and launcher help state bounded catalog errors, exact maps, selected registration, retained-pipe deadline, truthful single-child behavior and accepted limitations. No presentation/plugin port or unrelated external ownership change appears in this goal.

### AC6 / P1/P5/D16 accounting

This protocol/safety review converges independently. It does not update ledger statuses or certify the other current reviewers. P1's reviewed scope and D16's joint-checkpoint amendment remain intact: obsolete probe code and mechanism tests left together, replaced by stronger sole-final-child status/registration/ownership proof, not a timing repin or failed-assertion waiver.

The historical 422-test candidate and W24 focused/runtime evidence are not corrected-tree parent final-gate results. Parent alone reconciles W09–W12/W24, findings and G1, and records fresh applicable full isolated `npm test`/actual diagnostic results. `package.json` defines test/check only, no separate build/typecheck/lint script. No gate result is predicted here and no commit/final acceptance is authorized by this report alone.

## New independent narrow integration evidence

Ran one inline Node command once, exit **0**, under `env -i` with explicit PATH and nonexistent synthetic HOME/XDG paths. It created no source/temp/state files, invoked no executable child/provider/gh/installed OMP and injected an inert doctor. Used repository pipeline, genuine Node Writable, held actual `_write` callback and synthetic streams.

Previously uncovered combination:

1. Active turn accepts clear; hold a failed state and terminal; complete atomic restoration, then accept follower and enter retained-output release.
2. Hold the state callback (real `write(true)`), admit a replacement prompt after old ordered output admission, and verify old delivery still owns failure with zero settlement.
3. Deliver a malformed catalog response exactly 1,048,576 UTF-8 bytes including LF, with escaped/multibyte long ID for which minimal correlated failure cannot fit.
4. Observe exactly one fatal owner handoff through the active Stop path; no catalog frame emitted. A subsequent prompt is not forwarded. Completing the old retained callback cannot record settlement or undo fatal ownership.

Observed output:

```json
{"case":"catalog-fatal-during-old-release-after-new-prompt","result":"PASS","ownerFailures":1,"settlements":0}
```

This is new component-integration evidence, not an actual-process owner rerun or live T3/Effect scheduling equivalence. Deep actual-owner and corrected startup behavior are supported by inspected substantive regression assertions and attributed W24 results, not newly executed here.

## Preserved accepted risks

D10's public full-selection/mount concurrency races remain: stable lifecycle preservation is not atomic external mutation protection. No shared Stop gesture identity; an independent abort may consume the finite same-generation follower. Upstream omitted text/images are irrecoverable; client display may truncate/omit empty text; finite expiry is not consumption acknowledgement under scheduler stalls. Arbitrary external lifecycle provenance/containment is not universal. Registration is not a malicious-extension sandbox, and installed structural-host proof is not full CLI/T3/UI equivalence.

None is used to excuse a concrete defect. D01 presentation/plugin exclusion remains the sole functional-scope exclusion, not an unfinished adopted port. **Final review accounting: WP1/WP2 closed, related RR1/RR2/RR3 supported closed; zero new Fix, zero Replan, zero functional Discard. Parent final gates/accounting and sibling independent verdicts remain separate.**
