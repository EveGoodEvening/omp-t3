# Selective upstream integration goal

## Control summary

- Mode: proactive adaptive orchestration; assess repository/ledger, choose the next justified move, delegate, evaluate evidence, update this ledger, repeat. Never ask the user to resolve reachable questions.
- This file is the single durable source of truth. Persist worker research/design/spike/review evidence in linked files; workers have no inherited context. Resume by assessing active work and repository/worktree state.
- The orchestrator may inspect lightly, edit this ledger, run gates, and commit; implementation and substantial exploration belong to workers. Implementation and independent review must use different workers.
- Implement only firm, independently reviewed plan sections. Parallel implementation requires disjoint files and separate T3-managed worktrees; serialize shared-interface edits. Scope is the numbered AC; changes require the append-only Replan protocol.
- Commit every green checkpoint and clean plan/decision change using Conventional Commits, owned files only, no AI attribution trailers, and never push. Do not commit a red tree. Iteration entries ride with the next commit.
- Pause only for missing external tools/credentials/services/state, externally blocked verification, changes outside this repository, or more than 20 review rounds for a scope; finish unblocked work and record/commit what unblocks the pause. Effort/time/priority are not deferrals. Budgets: at most three design/spike rounds and three decision revisits; eight unconverged review rounds trigger Replan; two replans without a green implementation checkpoint freeze that slice until its next checkpoint.
- Final gate (verbatim): Reread the ledger. The gate passes only when every AC has verified evidence or a valid recorded blocker or deferral; every dropped, weakened, superseded, or invalidated AC or work item cites its decision-log entry; no decision is open; no finding is open with triage Fix or Replan; no plan section is still unknown-until unless its trigger is recorded as blocked; a final whole-change REVIEW-LOOP has converged; and you have rerun the full project gates (build/typecheck, tests, lint as applicable) on the final tree after the last change, and they pass. If any item is still doable now, continue the loop instead. When the gate passes, quote every work item that is not done with its status and reason, commit the final ledger, then stop.

## Acceptance criteria

All plan sections are firm and independently reviewed. P2 is complete; authorize P3/W07 now, then P4/W09 after the next shared-file green checkpoint. No external blocker is recorded.

1. Running-session `get_available_models` responses are pruned for T3 with available request ID types preserved; standalone `--check` honors its process cwd/environment and resolved binary (no new overlay/profile CLI syntax). No persisted or fabricated catalog is served. Empty live lists succeed; empty standalone discovery fails. Malformed entries produce a correlated error without killing the proxy. Enforce the 1 MiB UTF-8 output-frame ceiling including newline and both list fields; upstream protocol-1 overflow errors pass through without invented IDs or fallback.
2. Map advertised CLI arrays and live RPC `thinking.efforts` to all seven recognized effort keys, including advertised `xhigh`/`max`; every absent/unknown effort is explicitly null. Unknown/boolean/budget-only capabilities get a complete all-null map, preventing T3's lower-level default ladder. Preserve reasoning and caller/role thinking options separately.
3. T3 Stop (`clear_queue` then `abort`, or lone `abort`) atomically withdraws queued input through OMP's `abort_and_restore_queue`, returns available withdrawn texts with original IDs, preserves settlement/cancellation ordering, and does not associate later Stops with stale operations or hold unrelated responses indefinitely. Surface upstream truncation/image-loss diagnostics rather than promise recovery of omitted data. Choose and verify unsupported/indeterminate-failure policy before implementation (D03/D05).
4. On the default routing path, remove only native `task` from OMP's live enabled selection at stable startup/tree/before-agent lifecycle boundaries, preserving the observed other names and top-level/mounted presentation; skip mutation when absent. A routing-only call guard blocks later native-task re-enablement. Launch one session without fixed-list probes. Preserve opt-out, both explicit `--tools` forms, native cap, opt-in model policy and OMP role/model/thinking inheritance. Concurrent out-of-band tool/mount mutations cannot be atomically preserved by OMP's public full-selection setter; scope/limitation is explicit (D10), not hidden behind a preservation claim.
5. Existing `--offline` compatibility, shell-safe executable invocation, skill/command menus, startup adaptation, and unrelated release/install/issue/update ownership remain intact. Documentation/changelog describe the new contracts and their limitations.
6. Each implemented slice has targeted behavioral evidence and independent converged review. The final whole-change review converges; applicable full project gates pass on the final tree. No deployment, push, external plugin installation, or presentation/plugin port occurs.

## Plan

- **P1 — Evidence and planning:** firm; reviewed @2e9fa03 ([accounting review](selective-upstream-plan-accounting-review.md)). Persisted independent source/proposals, explicit AC and work ownership; continue adaptive evidence/review decisions rather than a fixed implementation sequence.
- **P2 — Session catalogs and thinking:** firm; reviewed @2e9fa03 ([round-two review](selective-upstream-catalog-plan-review-r2.md)). Forward live requests and prune catalog responses, retaining ID types, empty live arrays, real failures and explicit errors for malformed entries. Remove cache/fabricated lists/prewarm; retain shell-free standalone discovery using process cwd/env and binary, existing public diagnostic syntax, no unused overlay plumbing. Bound serialized T3 success to 1 MiB including LF and duplicated lists; emit small errors on oversize and propagate OMP protocol-1 errors without invented IDs/chunk support. Emit complete seven-key maps, all-null for unknown capability; migrate callers/tests/docs and preserve roles, skills and ownership.
- **P3 — Atomic Stop translation:** firm; reviewed @eac8480 ([round-two review](selective-upstream-stop-plan-review-r2.md)); design frozen until its next green implementation checkpoint (D06). One generation-scoped Stop transaction, unique internal ID/command correlation, one cancellation sweep and one completed-clear follower latch invalidated by every mutation attempt. Gate normalized terminal output and all potentially finalizing `get_state` responses (idle, missing/malformed activity fields, or failures) after pending-count translation; busy states and unrelated traffic pass. Bounds: restore deadline 1,000 ms from accepting Stop; follower/finalization fence 500 ms after clear success; one transaction/follower/terminal (terminal <=16 KiB), <=16 deferred state replies totaling <=1 MiB, restore frame <=1 MiB. Overflow fails explicitly. Reject unresolved mutations before tracker/disarm/child writes. Preserve available text/loss notices. On unsupported/malformed/indeterminate/timeout/transport failure, request immediate owned-OMP SIGKILL before pipe closure, emit honest errors/notice, end nonzero with <=250 ms output/exit-observation grace; no retry/plain abort/global signals. Gate every settlement emitter; cleanup on actual emission/disposal.
- **P4 — Conditional live-tool routing:** firm; reviewed @eac8480 ([plan review](selective-upstream-routing-plan-review.md), D10). Extend the existing generated policy-extension convention with launch-derived routingEnabled, true only when default routing is enabled and neither explicit tools form exists. Append after user extensions; at session_start/session_tree/before_agent_start immediately await live enabled names minus exactly task, with no intervening await and no setter call when absent. Include routing-only task call guard for later re-enable; keep model checks/default fill independent. Missing/failing filter API is explicit and task guard remains fail-closed for execution, not a false hidden-tool guarantee. Preserve no-extensions explicit loading, all opt-outs/caps/appendices/roles/offline/shell safety. Replace obsolete fixed-list/probe/fallback code and migrate tests/docs in the same green slice. Exact concurrent registry/mount subtraction is unsupported by the external API and not promised.
- **P5 — Documentation, independent review, and final gates:** firm; reviewed @2e9fa03 ([accounting review](selective-upstream-plan-accounting-review.md)). Update per-slice docs/Unreleased/lessons, independent slice and final union review; targeted behavioral checks then full `npm test`/isolated `npm run check` at checkpoints and after last change. No absent build/lint/typecheck gate, no real-user configuration, gh, paid model, plugin install, deployment or push.

## Work items

| ID | Kind | AC | Status | Work / verification |
| --- | --- | --- | --- | --- |
| W01 | research | 1–6 | done | [Independent source record](selective-upstream-integration-plan.md) re-establishes upstream/local contracts and exclusions; no runtime claims. |
| W02 | design | 1–6 | done | [Independent proposal](selective-upstream-integration-plan.md) supplies bounded slices/AC and queue alternative; accepted details and unresolved triggers are controlled here (D04/D05). |
| W03 | spike | 3,4 | done | Source/API evidence and three abstract scratch scenarios in [spike](selective-upstream-integration-spike.md); no OMP runtime launched; runtime/order questions remain F03/F07. |
| W04 | review | 1–6 | done | Independent P1/P5 accounting, P2 round-two, P3 round-two and P4 plan PASS receipts persisted in eac8480; every section firm/reviewed before its implementation. |
| W05 | impl | 1,2,5 | done | [Implementation](selective-upstream-catalog-implementation.md) + W19 cleanup; independent [W06 PASS](selective-upstream-catalog-review-r2.md); parent full gates 221/221 and isolated diagnostic exit 0 (artifact://19). |
| W06 | review | 1,2,5 | done | Two-round independent original-scope REVIEW-LOOP converged in [round-two PASS](selective-upstream-catalog-review-r2.md); CR1 fixed, no Discards/new Fix/Replan. |
| W07 | impl | 3,5 | active | Authorize reviewed P3 atomic Stop slice on committed catalog baseline eac8480; follow exact ledger/review bounds, synthetic consumer and owned-process proof. |
| W08 | review | 3,5 | todo | Independent Stop/queue REVIEW-LOOP. |
| W09 | impl | 4,5 | todo | Implement reviewed conditional live-tool filtering under the stable lifecycle/public-API contract clarified by D10; preserve guard/opt-out/cap/model settings. |
| W10 | review | 4,5 | todo | Independent routing REVIEW-LOOP. |
| W11 | review | 1–6 | todo | Final whole-change REVIEW-LOOP and accounting. |
| W12 | review | 6 | todo | Rerun applicable full project gates after the last change; finalize and commit ledger. |
| W13 | research | 3,4 | done | [T3/source and modeled runtime evidence](selective-upstream-integration-runtime.md): awaited clear→abort and probe race established; modeled tool tests are not live proof. Two informational OMP commands breached task-specific gating; no RPC session launched. |
| W14 | design | 3,5 | done | [Independent safety proposal](selective-upstream-stop-safety-design.md) supports immediate owned-process force termination; timer/correlation/state choices judged against newer T3 evidence in D07. |
| W15 | spike | 4,5 | done | [Actual installed proof](selective-upstream-tool-runtime-proof.md): stable names/partition/docs, awaited hooks, later guard, explicit-only loading verified; external full-set API races also demonstrated, addressed by D10. |
| W16 | review | 3,5,6 | done | [P3 round-two PASS](selective-upstream-stop-plan-review-r2.md) closes R1 at plan level; W07 authorization waits for catalog green checkpoint and committed reviewed-plan marker. |
| W17 | review | 1–6 | done | [Accounting PASS](selective-upstream-plan-accounting-review.md) approves P1/P5 procedure only; implementation/final gates remain open. |
| W18 | review | 4,5,6 | done | [P4 PLAN-REVIEW PASS](selective-upstream-routing-plan-review.md) approves D10 stable lifecycle/guard boundary; actual generated-hook/launcher implementation proof still W09/W10. |
| W19 | fix | 1,5,6 | done | [Narrow doctor cleanup](selective-upstream-catalog-fix-r1.md): six doctor tests; W06 full-scope re-review passes; parent union gates 221/221 + isolated check exit 0. |

## Decision log (append-only)

### D01 — Scope and ownership at adoption

- Question: Does “go for ur recommendations” mean importing all three commits?
- Options: wholesale merge/cherry-pick; selective protocol/routing ports; include presentation/plugin work too.
- Evidence: prior read-only research in this conversation; source commits [c32d3ed](https://github.com/lychen2/omp-t3/commit/c32d3ed1111d0d8005a0706308c4fdc1860388c9), [0088817](https://github.com/lychen2/omp-t3/commit/0088817867e4c5dd6b2cf6d6ab59c746f7beb727), [78ec253](https://github.com/lychen2/omp-t3/commit/78ec2537e0dc572ea25c4bb5e2861c1da91dd095); baseline `aafbe12`, package `1.5.2`.
- Choice: selectively implement session catalogs/thinking, corrected atomic Stop, and conditional live-tool routing. Exclude presentation/plugin changes exactly as recommended; this is initial scope, not a dropped AC. Do not adopt upstream's release metadata, fork URLs, default model policy, or unconditional native-task prohibition.
- Rationale: upstream changes overlap user-owned local compatibility, safety, model inheritance, and opt-out contracts; presentation changes depend on missing external plugin adaptations and alter persisted downstream data.
- Ownership: initial `git status --short` was empty; current goal branch is `t3/review-latest-main-commits`. Existing historical checklists under `specs/004-*` and `specs/005-*` describe different goals and are not adopted or modified. No competing tracker for this goal was found in `planning_docs/`, `specs/`, `.specify/`, or `docs/goals/`.

### D02 — Diagnostic gate isolation

- Question: Can the orchestrator run bare `npm run check` without touching external user state?
- Options: bare installed-environment diagnostic; isolated HOME/cache/config plus a controlled OMP fixture/runtime; skip the diagnostic.
- Evidence: `bin/omp-t3:127-128` calls `setupSessionSymlink(false)`; `src/symlink.js` creates directories and `~/.pi/agent/sessions` even from diagnostic mode.
- Choice: run the diagnostic under an isolated scratch HOME/cache/config with a controlled executable/environment; use installed OMP only when no model/network/plugin side effects are guaranteed. Do not run the bare diagnostic against the user's HOME.
- Rationale: exercise the actual CLI surface while protecting external settings/session links. This does not weaken the required full test gate; runtime API evidence remains separately required.


### D03 — Spike-triggered clarification before implementation

- Evidence: [independent spike](selective-upstream-integration-spike.md), installed OMP 18.20.0 source. Atomic queue withdrawal may truncate restored text/drop images; generic failure can follow withdrawal, so failure is not proof that nothing happened. There is no shared Stop correlation ID in the shim-visible protocol.
- Plan diff: keep all existing code unchanged; no owned implementation exists to remove/revert. Clarify AC3 to require loss diagnostics and deterministic bounded correlation rather than an impossible guarantee of recovering omitted data or deduplicating arbitrary delayed gestures. Resolve unsupported/indeterminate failure policy explicitly before queue implementation. Add W13 for real T3 ordering and isolated active-tool evidence; P3/P4 remain unreviewed and unknown-until.
- Options: copy upstream's global buffering/waiter design; terminal-only barrier plus explicit generation-scoped association; require external protocol correlation. Choice pending independent plan and T3 sequencing evidence; no implementation authorized.
- Rationale: external OMP response fitting already discards some restored information, and retries after ambiguous withdrawal can destroy user intent. These are correctness constraints, not effort-based scope reductions.

### D04 — Decouple the known catalog slice

- Question: Must catalog implementation wait for unresolved queue/routing architecture?
- Options: hold all slices; independently review the already-source-backed catalog contract first.
- Choice: firm P2 now, then independent P2 PLAN-REVIEW; keep P3/P4 unknown-until. The planning worker's later evidence may refine the candidate, which would require re-review before implementation.
- Rationale/evidence: `0088817` and the catalog/proxy portions of `c32d3ed` are independent of the queue/tool lifecycle decisions. Serial implementation owns `src/model_catalog.js`, catalog-related `src/proxy.js` and `bin/omp-t3`, targeted tests, README and lessons; no code is currently red or owned.

### D05 — Resolve bounded catalog review findings and replan Stop assumptions

- Evidence: [P2 review C1–C4](selective-upstream-catalog-plan-review.md), [independent plan](selective-upstream-integration-plan.md), [T3 Stop source evidence](selective-upstream-integration-runtime.md).
- Catalog choices: C1 adopts the review's explicit alternative: standalone public `--check` keeps process cwd/env as its context; do not add overlay/profile CLI flags or dead context plumbing. C2 requires a serialized UTF-8 limit/error, recognizes OMP may overflow before pruning, and excludes new protocol-2 negotiation. C3 errors on malformed members and distinguishes live-empty from diagnostic-empty. C4 removes invented boolean support and requires consumer fallback confirmation. These clarify AC1/2 and P2; independent re-review still required.
- Stop evidence supersedes D03's terminal-only candidate: T3 0.1.9 awaits clear before abort, and in-flight idle `get_state` can finalize independently. Choose a bounded, narrowly scoped barrier for settlement-capable state replies plus terminals, not a global downlink buffer; the final failure policy awaits W14. Generation-scoped completed-clear token is preferred over fresh abort after every successful clear. No implementation exists to rework/revert.
- Routing: W13's simplified model is not proof of actual enabled/mounted presentation; W15 must exercise installed code in a safely isolated no-model fixture. This is reachable local work, not an external deferral.
- Accounting: F05 is resolved by AC3 loss disclosure; F01/F02/F03/F06/F07 stay open until reviewed concrete design/proof. P2's unknown capability behavior remains a review check, not an invitation to hardcode model names.

### D06 — Queue tie-break after two pre-checkpoint replans

- Trigger: D03 and D05 each revised the queue plan without an intervening implementation checkpoint. Apply the required anti-thrashing freeze to P3, not to independent P2/P4.
- Choice: freeze the small generation-scoped transaction with terminal plus settlement-capable state-response barrier and fail-closed owned-provider teardown; reject global downlink buffering, unbounded waiter lists, silent plain-abort fallback, and external protocol redesign. W14 remains independent design evidence, not another architecture round.
- Evidence/criteria: [planner proposal §3](selective-upstream-integration-plan.md), [T3 awaited-clear/probe evidence](selective-upstream-integration-runtime.md), [OMP partial-withdraw failure evidence](selective-upstream-integration-spike.md). Criteria: discarded input never executes on shim retry, notice-before-settle, finite liveness/storage, unchanged unrelated streams, no association across new mutation.
- Plan diff: P3 becomes firm/unreviewed. Keep all existing implementation untouched. No superseded code or work item exists; W07/W08 still cover the same AC3, with W16 reviewing the explicit contract. Add no retries, persistent queue, protocol negotiation, or task scheduler.
- Accepted design limitations: no protocol Stop ID means a fresh independent abort without intervening mutation can match the single completed-clear follower latch; OMP-truncated texts/images cannot be recovered; T3's display truncates queue notices. These are external protocol limitations, not unfinished implementation. Further plan-rooted contrary findings during freeze are recorded as accepted risks; concrete bugs remain Fix. Freeze ends at the next P3 green checkpoint.

### D07 — Judge independent Stop safety evidence against the selected design

- Evidence: [safety proposal](selective-upstream-stop-safety-design.md) independently rejects compatibility fallback and EOF-only shutdown; installed OMP drains accepted serial work on stdin EOF. This supports D06's fail-closed choice.
- Adopt: immediate owned-OMP `SIGKILL` handoff before pipe closure, no inherited process-group signals, no auto restart/replay/retry, explicit correlated failure/notice and bounded nonzero transport exit, actual-emission settlement cleanup. Preserve existing native-child cancellation attempts; do not promise control over external T3 delegates or already-running tools.
- Do not adopt: its unmeasured 5-second deadline (T3 clear timeout is 2 seconds), fresh Stop for every post-clear abort (ordinary T3 awaits clear), or new `pendingMessageCount` sentinel instead of the chosen narrowly bounded probe barrier. These are rejected alternatives, not unfinished work; D06 remains frozen. Concrete reviewed implementation details may tighten bounds without changing architecture.
- Outcome: D06 supersedes D03's open architecture choice and W14's alternative timing/correlation proposals. External limitations remain the D06 accepted-risk list. No owned implementation exists yet; no code needs reverting.

### D08 — Adopt independent catalog and procedural plan PASS

- Evidence: [catalog PLAN-REVIEW round 2](selective-upstream-catalog-plan-review-r2.md), [plan-accounting review](selective-upstream-plan-accounting-review.md), both review candidate `2e9fa03`.
- Choice: approve P1/P2/P5 and authorize W05 only. C1–C4 are closed. Complete seven-key all-null maps for unadvertised efforts are the exact source-verified T3 v0.1.9 contract; missing/partial maps would invent five lower levels. Public diagnostics stay process-context-only; output limit and malformed whole-catalog failures are explicit.
- Rationale: the amended contract has no remaining Fix/Replan findings and all caller/test/docs migrations are bounded. Hidden real-but-unadvertised options are the conservative tradeoff; this does not clamp explicit/role thinking options.
- Preservation: no queue/routing/interface work in W05; shared implementation edits remain serialized. W04 remains active as overall plan-review accounting until P3/P4 prerequisites pass.

### D09 — Close the concrete failed-probe plan gap

- Evidence: [Stop PLAN-REVIEW R1](selective-upstream-stop-plan-review.md) shows failed pre-activity probes finalize T3 even when all terminal signals are held. This is a Fix inside D06's architecture, not another replan.
- Choice: include failed/ambiguous/missing-field idle `get_state` replies in the bounded potentially-finalizing classifier, after pending-count translation. Keep other failures and definitely busy state replies prompt; never fabricate busy state.
- Bounds adopted from review with safety-source corrections: total initial restore deadline 1,000 ms from acceptance, completed-clear follower/finalization fence 500 ms, immediate SIGKILL and <=250 ms output/exit-observation grace (D07 overrides the review's optional graceful TERM escalation). One terminal <=16 KiB, <=16 deferred state responses/1 MiB, restore frame <=1 MiB. Timers never reset on traffic; deterministic clock/caps tests required.
- Plan diff: clarify P3 gate predicate and explicit finite constants only; all existing code is kept untouched by the orchestrator. Independent round-two plan review must pass before W07. Accepted D06 risks remain supplied to reviewers.
- Commit timing: W05 is now implementing shared files; this clean plan/evidence update will ride with the next verified green checkpoint rather than commit a possibly red tree.

### D10 — Actual tool proof triggers the routing plan cut

- Evidence: [W15 installed OMP 18.20.0 proof](selective-upstream-tool-runtime-proof.md) executes actual SessionTools, ExtensionRunner, startup wiring, loader and xdev renderers under gated network/filesystem isolation. Stable selection removal preserved exact non-task membership, mounted partition/listing/docs; all lifecycle handlers were awaited; absent task caused no mutation; later re-enable was blocked at tool_call; explicit fixture loaded under no-extensions. Scratch was removed, no external configuration or implementation changed.
- External constraint: public extension `getActiveTools` + full-set `setActiveTools` cannot atomically subtract task or carry an authoritative mounted snapshot. Real interleavings demonstrably lose concurrent activations or move presentation. No missing local tool blocks work; universal interleaving preservation would require an external OMP API change or unsupported private patching.
- Options judged after the three evidence rounds: retain fixed list/probes (known systematic custom-tool exclusion); use public API at serial lifecycle seams plus guard and document its limits; monkeypatch private internals/retry stale full sets. Choose the public supported stable-boundary contract; reject private coupling, blind retries and a second tool convention.
- Plan diff/AC clarification: AC4 now explicitly covers stable lifecycle selection/presentation plus a later-reenable guard, not impossible atomic preservation across out-of-band concurrent registry/mount writes. This weakens only that newly tested universal assumption because the external public API demonstrably cannot supply it, not because of effort. W09/W10 cover retained behavior; W18 reviews the clarified contract. No owned routing implementation exists to remove/rewrite; keep current code until P4 review and its implementation checkpoint.
- Choice: route only by existing launch intent; use existing generated-extension mechanism, appended after user extensions, immediate get→set without intervening awaits; explicit error if filtering unsupported, always routing-scoped tool_call block. This is delegation routing, not a sandbox. Do not promise atomic external plugin refresh, exact universal presentation, or complete task hiding on unsupported APIs.
- P3 accounting: independent [round-two plan PASS](selective-upstream-stop-plan-review-r2.md) closes R1; P3 design is unchanged and may authorize W07 after the shared catalog slice is green/committed.

### D11 — Select the next implementation only after catalog convergence

- Evidence: [W05 implementation](selective-upstream-catalog-implementation.md); orchestrator `npm test && node test/check-fixture.js \"$(command -v npm)\"` exited 0, 222/222 tests and actual isolated npm diagnostic passed (artifact://17); [P4 plan PASS](selective-upstream-routing-plan-review.md).
- Choice: keep W05 active until independent W06 convergence, then commit the catalog checkpoint with pending reviewed plan/evidence. P3 and P4 plan content is approved by independent reviews; record reviewed commit markers after committing those exact contents. Implement W07 next, then W09, serializing shared proxy/CLI/docs changes.
- Rationale: tests alone are not independent cleanliness; a committed known-green baseline prevents cross-slice findings from being hidden. No new code move starts on top of an unreviewed catalog diff.
- Scope: W05 current implementation changes are attributed to the goal; no user-owned changes existed initially. Final gates will rerun after later slices; this checkpoint is not final verification.

### D12 — Triage catalog implementation review R1 as Fix

- Evidence: [W06 round-one review](selective-upstream-catalog-review-r1.md) finds no functional AC1/AC2 defect, but `ContractDoctor.reportDiscoveryFailure` and its direct-method test remain with no production caller after the catalog cutover.
- Choice: Fix, not Discard: remove that obsolete method/comment and implementation-only test; do not reconnect catalog failures to automatic GitHub issue creation. Preserve generic doctor/watchdog behavior and issue policy/destination.
- Rationale: this is in-scope clean cutover/dead-weight removal required by P2, even though it is low severity. Delegate W19; then re-review original W05 scope plus the cleanup and rerun checkpoint gates. No plan change or replan is needed.

### D13 — First green implementation checkpoint

- Evidence: [W06 round-two PASS](selective-upstream-catalog-review-r2.md), [W19 correction](selective-upstream-catalog-fix-r1.md); orchestrator reran `npm test && node test/check-fixture.js \"$(command -v npm)\"` after the last source change: exit 0, 221 tests passed/0 failed/0 skipped; actual isolated npm diagnostic passed (artifact://19). Count decreased by one because the obsolete direct-method doctor test was removed per CR1, not a narrowed functional contract.
- Choice: mark W05/W06/W19 done and commit the catalog/thinking slice plus owned pending plan/evidence. AC1/2 and catalog-preservation evidence is verified; AC3/4/final-union AC6 remain unimplemented.
- Next: the committed checkpoint will contain the independently approved exact P3/P4 plan contents and review receipts; record reviewed markers at that commit, authorize W07, and continue serial implementation. Do not import upstream fork/policy metadata or readable-card/plugin changes.
- Review accounting: catalog loop two rounds, one Fix resolved, no Replan/Discard findings. P3 freeze remains until its own green implementation checkpoint, not this independent catalog checkpoint.

### D14 — Authorize the reviewed atomic Stop slice

- Evidence: catalog checkpoint `eac8480` includes exact P3/P4 plan content plus independent P3 round-two and P4 PASS receipts. Mark those sections reviewed @eac8480; W04 plan-review accounting is complete.
- Choice: W07 implements P3 end to end now; W09 waits to avoid shared proxy/CLI/docs edits. Keep the frozen P3 architecture and accepted external limitations; a concrete implementation bug remains Fix, never a risk waiver.
- Acceptance emphasis: every terminal emitter and potentially finalizing failed/ambiguous state probe is gated; clear is consumed before finalization under same-chunk client scheduling; timeout/unsupported/partial-withdraw error never replays input and immediately kills only the owned main OMP process before EOF. No real user/provider/T3 changes are required for proof.

## Findings and open questions
| ID | Triage | Status | Finding / reason |
| --- | --- | --- | --- |
| F01 | Replan | closed | D06/D09 generation-scoped latch/new-mutation retirement independently approved by P3 round-two plan review; W07/W08 must supply implementation regression. |
| F02 | Replan | closed | D06/D09 replaces global buffering with capped terminal/finalizing-state gate; P3 review approves finite liveness/storage, not implementation completion. |
| F03 | Replan | closed | W15 installed stable-boundary API proof plus [P4 plan PASS](selective-upstream-routing-plan-review.md) approves D10's honest limitation/guard contract; W09/W10 still verify generated source and launcher. |
| F04 | Discard | closed | Wholesale readable-card/parent-CWD/plugin integration is outside accepted selective scope (D01), not implementation left for later. |
| F05 | Replan | closed | AC3/D03/D06 require available-text fidelity plus visible truncation/image-loss notice; independent P3 plan review accepts irrecoverable upstream loss explicitly. |
| F06 | Replan | closed | D07/D09 immediate owned-process fail-close/no retry policy independently passes P3 round-two plan review; W07/W08 still verify production owner behavior. |
| F07 | Replan | closed | W13 verifies release-source T3 sequencing/probe semantics; W15 executes actual installed lifecycle APIs. Runtime claims remain bounded; P3 consumer/P4 generated-hook integration evidence is still required by implementation work. |
| C1–C4 | Fix | closed | D05 clarifications and exact D08 contract independently pass [round-two plan review](selective-upstream-catalog-plan-review-r2.md). |
| R1 | Fix | closed | [P3 round-two plan PASS](selective-upstream-stop-plan-review-r2.md) verifies D09's failed/ambiguous probe classifier and finite bounds; implementation evidence remains W07/W08. |
| F08 | Replan | accepted-risk | D10/W15/P4 PLAN-REVIEW: external OMP full-set API cannot preserve arbitrary concurrent registry/mount changes; AC4 covers stable lifecycle behavior and guard, not atomic external refresh. Documentation must state possible membership/presentation loss during concurrent changes. |
| CR1 | Fix | closed | W19 removes obsolete method/comment/direct-method test; independent W06 original-scope round-two PASS and parent full gates verify closure. |


## Iteration log

- I01 — ASSESS → PLAN/RESEARCH: clean baseline, historical plans unrelated; create/commit this ledger first. Next delegate planning and independent high-impact investigation; reject immediate cherry-picks. Queue/API evidence can revise the tentative design before implementation.
- I02 — RESEARCH/DESIGN + SPIKE in parallel: shared read-only implementation inspection, disjoint evidence files, no code edits. Independent queue proposals will be judged on ordering, liveness, lifecycle isolation, compatibility, and bounded complexity. Reject copying upstream's adapter unchanged; API/runtime evidence determines firm routing/queue sections.
- I03 — BASELINE GATE: orchestrator ran `npm test` on the pre-implementation tree: 222 passed, 0 failed/skipped (artifact://7). `package.json` exposes test/check only, no build/typecheck/lint scripts. This establishes a green starting checkpoint, not final verification; no implementation was started while plan/API questions remain open.
- I04 — GATE SAFETY: light inspection of diagnostic entrypoint found `--check` writes the session bridge. Choose isolated diagnostic environment (D02), reject bare real-HOME execution; no code or external settings changed.
- I05 — EVALUATE SPIKE → REPLAN: W03 supplies source evidence and abstract proof, not a live-runtime compatibility claim. Record newly discovered truncation/indeterminate-failure constraints (D03); investigate actual client sequencing and active-tool preservation before choosing the queue/routing design.
- I06 — TARGETED RESEARCH/SPIKE round 2: verify actual client sequencing and isolated tool lifecycle before selecting generation-scoped follower acknowledgement versus fresh-Stop semantics. Reject more broad exploration; retain the independently drafted catalog plan as the first candidate green slice.
- I07 — PARTIAL PLAN-REVIEW: choose the independently verifiable catalog slice while queue/runtime research continues. Reject waiting on unrelated uncertainty; any new catalog design constraint resets P2 review before code changes.
- I08 — SYNTHESIZE → REPLAN/REVIEW: adopt source-backed catalog safeguards and process-context diagnostic boundary; choose targeted Stop probe gating based on actual client, not terminal-only assumptions. Require real installed-tool proof rather than relabel a simplified model as verified.
- I09 — FREEZE/PLAN-REVIEW: resolve P3 architecture tie-break per mandatory anti-thrashing rule, rather than run a third replan without code. Review the chosen bounded contract; implementation stays gated on independent plan review and concrete failure-boundary acceptance.
- I10 — JUDGE: independent safety proposal corroborates force termination, rejects EOF-only shutdown, and supplies process-closure acceptance cases. Keep the source-backed frozen barrier/token architecture; reject its unmeasured timer and incompatible correlation alternatives rather than start another design round.
- I11 — IMPLEMENT-SLICE P2: independent plan PASS authorizes catalog/thinking implementation now. Reject waiting for unrelated Stop/routing reviews; worker must run targeted behavior/actual synthetic CLI proof, then a different worker reviews before the orchestrator's full green checkpoint.
- I12 — PLAN-FIX/REVIEW P3: add failed-probe race to the already-chosen barrier and freeze-compatible constants. Reject state fabrication and graceful-drain teardown; re-review this concrete fix while P2 implements, without parallel shared code edits.
- I13 — ACTUAL PROOF → REPLAN P4: stable installed-tool behavior is now verified, and real API race counterexamples rule out a universal atomic-preservation claim. Choose the supported lifecycle+guard contract with an explicit external limitation, then independent plan review; no parallel edits to catalog-owned files.
- I14 — ACCOUNTING: planning/API decisions are selected and P3 review converged; reconcile plan-level findings without marking implementations done. W18 checks the final routing boundary while W05 implements; pending ledger/evidence changes stay uncommitted until the next green tree.
- I15 — CHECKPOINT REVIEW: W05 worker proof plus parent full tests/isolated diagnostic pass; await independent W06 before committing/starting the next shared-code slice. P4 plan has converged; no source review or gate is relabeled implementation completion.
- I16 — REVIEW-FIX: independent catalog review finds only dead discovery-reporting code, no AC1/2 functional defect. Dispatch narrow cleanup rather than reconnect an obsolete issue-filing path; original-scope re-review and full checkpoint gates remain required.
- I17 — GREEN CHECKPOINT P2: complete catalog migration and dead-path cleanup independently converge; full project tests 221/221 and isolated actual npm diagnostic pass. Commit this slice before any shared-file queue/routing implementation; final union gates remain open.
- I18 — IMPLEMENT-SLICE P3: committed catalog baseline is green and reviewed plan markers are durable. Dispatch one Stop implementer with exact synthetic consumer/owner acceptance; preserve unrelated catalogs/menus/roles and defer routing code until this checkpoint converges.
