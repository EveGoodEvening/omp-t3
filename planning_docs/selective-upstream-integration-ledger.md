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

Draft pending independent planning/review; no implementation authorized yet.

1. Running-session `get_available_models` responses are pruned for T3 with request ID types preserved; standalone diagnostics respect discovery context; no cross-context persisted or fabricated model catalog is served.
2. Model catalogs preserve supported thinking levels from both CLI arrays and live RPC `thinking.efforts`, including advertised `xhigh`/`max` and excluding unsupported levels.
3. T3 Stop (`clear_queue` then `abort`, or lone `abort`) atomically withdraws queued input through OMP's `abort_and_restore_queue`, returns withdrawn texts with original IDs, preserves settlement/cancellation ordering, and does not associate later Stops with stale operations or hold unrelated responses indefinitely. Unsupported OMP behavior is explicit and documented.
4. Default delegation routing preserves OMP's resolved tools except native `task`, avoiding fixed-list discovery probes when supported. Preserve `OMPT3_DELEGATE_TASKS=0`, explicit `--tools` precedence, native-task concurrency caps, opt-in model restrictions, and OMP role/model/thinking inheritance.
5. Existing `--offline` compatibility, shell-safe executable invocation, skill/command menus, startup adaptation, and unrelated release/install/issue/update ownership remain intact. Documentation/changelog describe the new contracts and their limitations.
6. Each implemented slice has targeted behavioral evidence and independent converged review. The final whole-change review converges; applicable full project gates pass on the final tree. No deployment, push, external plugin installation, or presentation/plugin port occurs.

## Plan

- **P1 — Evidence and planning:** tentative; unreviewed. Persist the prior research; draft testable AC and bounded slices; resolve queue lifecycle/API uncertainties before implementation.
- **P2 — Session catalogs and thinking:** tentative; unreviewed. Selectively adapt c32d3ed catalog changes and 0088817, retaining local safe execution and contracts.
- **P3 — Atomic Stop translation:** unknown-until(queue design and runtime/API evidence); unreviewed. Port behavior only after addressing stale operation and unbounded buffering findings.
- **P4 — Conditional live-tool routing:** unknown-until(OMP lifecycle/API evidence); unreviewed. Preserve local opt-out/model-policy/concurrency contracts; do not take upstream's unconditional policy.
- **P5 — Documentation, independent review, and final gates:** tentative; unreviewed. Update docs per slice, run project gates at green checkpoints, then review the union and rerun final gates.

## Work items

| ID | Kind | AC | Status | Work / verification |
| --- | --- | --- | --- | --- |
| W01 | research | 1–6 | active | Planning worker persists prior research and relevant contracts in `selective-upstream-integration-plan.md`. |
| W02 | design | 1–6 | active | Planning worker drafts AC, bounded slices and corrected queue proposal; task `674d9fe3-f389-4852-ae2d-67cff74813db`. |
| W03 | spike | 3,4 | done | Source/API evidence and three abstract scratch scenarios in [spike](selective-upstream-integration-spike.md); no OMP runtime launched; runtime/order questions remain F03/F07. |
| W04 | review | 1–6 | todo | Independent PLAN-REVIEW of firm sections and AC. |
| W05 | impl | 1,2,5 | todo | Implement and verify session catalogs + thinking levels. |
| W06 | review | 1,2,5 | todo | Independent catalog slice REVIEW-LOOP. |
| W07 | impl | 3,5 | todo | Implement and verify corrected atomic Stop/queue compatibility. |
| W08 | review | 3,5 | todo | Independent Stop/queue REVIEW-LOOP. |
| W09 | impl | 4,5 | todo | Implement and verify conditional live-tool filtering. |
| W10 | review | 4,5 | todo | Independent routing REVIEW-LOOP. |
| W11 | review | 1–6 | todo | Final whole-change REVIEW-LOOP and accounting. |
| W12 | review | 6 | todo | Rerun applicable full project gates after the last change; finalize and commit ledger. |
| W13 | research | 3,4 | todo | Verify actual T3 Stop sequencing and safely test installed OMP active-tool lifecycle/presentation without paid calls or user plugins. |

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


## Iteration log

- I01 — ASSESS → PLAN/RESEARCH: clean baseline, historical plans unrelated; create/commit this ledger first. Next delegate planning and independent high-impact investigation; reject immediate cherry-picks. Queue/API evidence can revise the tentative design before implementation.
- I02 — RESEARCH/DESIGN + SPIKE in parallel: shared read-only implementation inspection, disjoint evidence files, no code edits. Independent queue proposals will be judged on ordering, liveness, lifecycle isolation, compatibility, and bounded complexity. Reject copying upstream's adapter unchanged; API/runtime evidence determines firm routing/queue sections.
- I03 — BASELINE GATE: orchestrator ran `npm test` on the pre-implementation tree: 222 passed, 0 failed/skipped (artifact://7). `package.json` exposes test/check only, no build/typecheck/lint scripts. This establishes a green starting checkpoint, not final verification; no implementation was started while plan/API questions remain open.
- I04 — GATE SAFETY: light inspection of diagnostic entrypoint found `--check` writes the session bridge. Choose isolated diagnostic environment (D02), reject bare real-HOME execution; no code or external settings changed.
- I05 — EVALUATE SPIKE → REPLAN: W03 supplies source evidence and abstract proof, not a live-runtime compatibility claim. Record newly discovered truncation/indeterminate-failure constraints (D03); investigate actual client sequencing and active-tool preservation before choosing the queue/routing design.
