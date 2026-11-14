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

P1/P2/P5 are firm and independently reviewed; only P2 implementation is authorized now. P3 awaits W16; P4 awaits actual API proof and plan review.

1. Running-session `get_available_models` responses are pruned for T3 with available request ID types preserved; standalone `--check` honors its process cwd/environment and resolved binary (no new overlay/profile CLI syntax). No persisted or fabricated catalog is served. Empty live lists succeed; empty standalone discovery fails. Malformed entries produce a correlated error without killing the proxy. Enforce the 1 MiB UTF-8 output-frame ceiling including newline and both list fields; upstream protocol-1 overflow errors pass through without invented IDs or fallback.
2. Map advertised CLI arrays and live RPC `thinking.efforts` to all seven recognized effort keys, including advertised `xhigh`/`max`; every absent/unknown effort is explicitly null. Unknown/boolean/budget-only capabilities get a complete all-null map, preventing T3's lower-level default ladder. Preserve reasoning and caller/role thinking options separately.
3. T3 Stop (`clear_queue` then `abort`, or lone `abort`) atomically withdraws queued input through OMP's `abort_and_restore_queue`, returns available withdrawn texts with original IDs, preserves settlement/cancellation ordering, and does not associate later Stops with stale operations or hold unrelated responses indefinitely. Surface upstream truncation/image-loss diagnostics rather than promise recovery of omitted data. Choose and verify unsupported/indeterminate-failure policy before implementation (D03/D05).
4. Default delegation routing preserves OMP's resolved tools except native `task`, avoiding fixed-list discovery probes when supported. Preserve `OMPT3_DELEGATE_TASKS=0`, explicit `--tools` precedence, native-task concurrency caps, opt-in model restrictions, and OMP role/model/thinking inheritance.
5. Existing `--offline` compatibility, shell-safe executable invocation, skill/command menus, startup adaptation, and unrelated release/install/issue/update ownership remain intact. Documentation/changelog describe the new contracts and their limitations.
6. Each implemented slice has targeted behavioral evidence and independent converged review. The final whole-change review converges; applicable full project gates pass on the final tree. No deployment, push, external plugin installation, or presentation/plugin port occurs.

## Plan

- **P1 — Evidence and planning:** firm; reviewed @2e9fa03 ([accounting review](selective-upstream-plan-accounting-review.md)). Persisted independent source/proposals, explicit AC and work ownership; continue adaptive evidence/review decisions rather than a fixed implementation sequence.
- **P2 — Session catalogs and thinking:** firm; reviewed @2e9fa03 ([round-two review](selective-upstream-catalog-plan-review-r2.md)). Forward live requests and prune catalog responses, retaining ID types, empty live arrays, real failures and explicit errors for malformed entries. Remove cache/fabricated lists/prewarm; retain shell-free standalone discovery using process cwd/env and binary, existing public diagnostic syntax, no unused overlay plumbing. Bound serialized T3 success to 1 MiB including LF and duplicated lists; emit small errors on oversize and propagate OMP protocol-1 errors without invented IDs/chunk support. Emit complete seven-key maps, all-null for unknown capability; migrate callers/tests/docs and preserve roles, skills and ownership.
- **P3 — Atomic Stop translation:** firm; unreviewed; design frozen until its next green implementation checkpoint (D06). One generation-scoped Stop transaction, unique internal ID/command correlation, atomic cancellation/sweep once, one completed-clear follower latch invalidated by new mutation. Gate only terminal output and idle settlement-capable `get_state` replies until clear is consumed via follower (or bounded expiry); pass unrelated traffic. Bounded request/storage deadlines shorter than T3's 2-second clear timeout; explicit busy errors rather than buffering new mutations. Surface truncation/image loss. Unsupported/malformed/indeterminate/timeout/transport failure must report honestly and close this owned provider connection without atomic/plain-abort retries. Cover all settlement emitters and disposal; do not maintain another message queue.
- **P4 — Conditional live-tool routing:** unknown-until(OMP lifecycle/API evidence); unreviewed. Preserve local opt-out/model-policy/concurrency contracts; do not take upstream's unconditional policy.
- **P5 — Documentation, independent review, and final gates:** firm; reviewed @2e9fa03 ([accounting review](selective-upstream-plan-accounting-review.md)). Update per-slice docs/Unreleased/lessons, independent slice and final union review; targeted behavioral checks then full `npm test`/isolated `npm run check` at checkpoints and after last change. No absent build/lint/typecheck gate, no real-user configuration, gh, paid model, plugin install, deployment or push.

## Work items

| ID | Kind | AC | Status | Work / verification |
| --- | --- | --- | --- | --- |
| W01 | research | 1–6 | done | [Independent source record](selective-upstream-integration-plan.md) re-establishes upstream/local contracts and exclusions; no runtime claims. |
| W02 | design | 1–6 | done | [Independent proposal](selective-upstream-integration-plan.md) supplies bounded slices/AC and queue alternative; accepted details and unresolved triggers are controlled here (D04/D05). |
| W03 | spike | 3,4 | done | Source/API evidence and three abstract scratch scenarios in [spike](selective-upstream-integration-spike.md); no OMP runtime launched; runtime/order questions remain F03/F07. |
| W04 | review | 1–6 | active | Independent PLAN-REVIEW: P2/AC1,2,5 first; queue/routing sections remain gated on evidence. |
| W05 | impl | 1,2,5 | active | Authorize reviewed P2 catalog/thinking slice only; independent implementation worker and targeted checks required. |
| W06 | review | 1,2,5 | todo | Independent catalog slice REVIEW-LOOP. |
| W07 | impl | 3,5 | todo | Implement and verify corrected atomic Stop/queue compatibility. |
| W08 | review | 3,5 | todo | Independent Stop/queue REVIEW-LOOP. |
| W09 | impl | 4,5 | todo | Implement and verify conditional live-tool filtering. |
| W10 | review | 4,5 | todo | Independent routing REVIEW-LOOP. |
| W11 | review | 1–6 | todo | Final whole-change REVIEW-LOOP and accounting. |
| W12 | review | 6 | todo | Rerun applicable full project gates after the last change; finalize and commit ledger. |
| W13 | research | 3,4 | done | [T3/source and modeled runtime evidence](selective-upstream-integration-runtime.md): awaited clear→abort and probe race established; modeled tool tests are not live proof. Two informational OMP commands breached task-specific gating; no RPC session launched. |
| W14 | design | 3,5 | done | [Independent safety proposal](selective-upstream-stop-safety-design.md) supports immediate owned-process force termination; timer/correlation/state choices judged against newer T3 evidence in D07. |
| W15 | spike | 4,5 | active | Actual installed-code proof task `e7cc5c50-cfc5-4208-9d5d-bbf75dff0cac`; gated/network-denied scratch, output `selective-upstream-tool-runtime-proof.md`. |
| W16 | review | 3,5,6 | active | Independent P3 plan review task `c4fb87ce-bff0-4758-97da-374ffff65ac1`; frozen design risks given, output `selective-upstream-stop-plan-review.md`. |
| W17 | review | 1–6 | done | [Accounting PASS](selective-upstream-plan-accounting-review.md) approves P1/P5 procedure only; implementation/final gates remain open. |

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

## Findings and open questions
| ID | Triage | Status | Finding / reason |
| --- | --- | --- | --- |
| F01 | Replan | open | Upstream queue `flushAll()` retains operations/`awaitingAbort`; a missing follow-up abort can consume a later unrelated Stop. Resolve in design before port. |
| F02 | Replan | open | Upstream queue buffers all downstream frames while awaiting abort, including unrelated RPC responses, without a bound. Resolve ordering and lifecycle design first. |
| F03 | Replan | open | Live-tool filtering relies on OMP lifecycle hooks and active-tool APIs. Establish supported behavior and preserve opt-out/explicit tools before replacing probes. |
| F04 | Discard | closed | Wholesale readable-card/parent-CWD/plugin integration is outside accepted selective scope (D01), not implementation left for later. |
| F05 | Replan | open | OMP 18.20.0 response fitting may omit withdrawn queue text/images; AC3 must expose loss, not promise recovery of data the API discarded (D03). |
| F06 | Replan | open | Generic atomic failure may happen after withdrawal; choose explicit indeterminate/unsupported policy without unsafe blind retries (D03). |
| F07 | Replan | open | Validate T3's actual clear-before-abort sequencing and active-tool lifecycle/presentation before claiming runtime compatibility (W13). |
| C1–C4 | Fix | closed | D05 clarifications and exact D08 contract independently pass [round-two plan review](selective-upstream-catalog-plan-review-r2.md). |


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
