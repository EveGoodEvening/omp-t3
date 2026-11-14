# W17 — Independent plan-accounting review

**PASS — P1/P5 procedural plan only.** No implementation PASS, subsystem-design approval, completed-goal claim, or authorization for unreviewed P2/P3/P4. Work remains active.

Evidence: `selective-upstream-integration-ledger.md` (AC1–6, P1–P5, W01–W17, D01–D07, final gate), `selective-upstream-integration-plan.md` (§§2, 5–8), and `package.json`. Static document review only; no source-heavy subsystem review, runtime, tests, commits, or delegates.

## Accounting and preservation

- Accepted goals are covered: catalogs/thinking → AC1/2, W05/W06; corrected atomic Stop → AC3, W07/W08; conditional live-tool filtering → AC4, W09/W10. AC5 carries compatibility, ownership and documentation preservation across all slices; AC6 and W11/W12 carry independent convergence and final verification. No accepted work is silently omitted.
- D01 consistently excludes readable cards/presentation/plugin changes from initial scope, not as a later dropped AC. Historical `specs/004-*` and `specs/005-*` checklists are expressly not adopted because they concern different goals. Version, owner/fork URLs, install/update/issue ownership, opt-in model policy, routing opt-out, explicit tools, native caps and inheritance remain preservation boundaries.
- The proposal is explicitly subordinate to the ledger. Its older candidates/unknowns do not override D05–D07. Evidence work marked done does not imply its downstream implementation or runtime compatibility passed.

## Authorization and ordering

- P1 and P5 have an adequate procedural contract and may be recorded as independently plan-reviewed through W17. Their approval does not close W11/W12 or any implementation review.
- P2 still requires amended-plan re-review; P3 requires W16 review of the frozen contract; P4 requires W15 actual installed lifecycle proof and independent plan review. Their unresolved subsystem questions are tracked prerequisites, not W17 accounting defects.
- Only firm, independently reviewed sections may be implemented. Workers implement; different workers independently review. Shared proxy/CLI/documentation edits are serialized; parallel implementation requires disjoint ownership and T3-managed worktrees.
- D06 applies the two-replan freeze to P3 only, through its next green checkpoint. D07 accounts for adopted and rejected alternatives without silently dropping W07/W08 or AC3. Accepted protocol limitations remain explicit; they cannot relabel a concrete implementation bug as an accepted risk or bypass independent review.

## Checkpoints and safe final gate

- End-to-end green slices, targeted behavioral proof, independent converged review, documentation/Unreleased updates and owned-file Conventional Commits are required. No red commits, pushes, deployments or external plugin work are authorized.
- `package.json` defines only `npm test` and `npm run check`; no absent build/typecheck/lint scripts are required. Baseline test evidence is not final-tree evidence.
- Plan §7 requires isolated scratch HOME/XDG/cache/config/state, controlled executable and fake `gh` for process diagnostics; in-process doctor tests disable issues. The actual `--check` CLI surface is exercised with a fixture, not the user's configured providers. No browser is required.
- W11 must converge on the union. W12 must rerun both full package gates after the last change, with command/isolation/exit/evidence recorded. Final ledger accounting must close or validly block every unknown and Fix/Replan finding, cite decisions for every dropped/weakened/superseded item, and quote every non-done item's status/reason before the final ledger commit. A doable item prevents completion.

## Reconciliation before closure

D05 says F05 is resolved by loss disclosure, while the findings table still marks it open; F01/F02/F06 likewise await reviewed closure despite selected design decisions. This is conservative active-work bookkeeping, not permission to claim completion. Reconcile each row against independent review/evidence before the final gate; do not auto-close findings merely because an architecture was selected. No accounting Fix/Replan blocks P1/P5 approval now.
