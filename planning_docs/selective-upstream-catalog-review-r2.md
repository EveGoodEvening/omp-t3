# W06 — independent catalog implementation review, round 2

## Verdict: PASS

**Zero open Fix findings; zero Replan findings; zero Discarded functional findings.** Round-one R1 (ledger CR1) is resolved by the W19 cleanup. No new concrete defect found in the original full W05 catalog scope or the cleanup. This is a source/test review PASS, not blanket runtime certification or approval of queue/routing implementations.

## Authority and reviewed scope

Read the approved [catalog plan review-r2](selective-upstream-catalog-plan-review-r2.md), [W05 implementation evidence](selective-upstream-catalog-implementation.md), [round-one review](selective-upstream-catalog-review-r1.md), [W19 fix evidence](selective-upstream-catalog-fix-r1.md), and ledger D08/D12. Reviewed the current W05 changes against `d719444`, plus W19, rather than reviewing only the corrective diff.

Source and test scope: `src/model_catalog.js`, catalog construction/forwarding/downstream handling and spawn context in `src/proxy.js`, actual `bin/omp-t3 --check`, `test/model_catalog.test.js`, the migrated full-turn case in `test/e2e.test.js`, `test/check-shell.test.js`, `test/check-fixture.js`, README catalog/diagnostic/architecture/Unreleased changes, supplied repository AGENTS lessons, and `src/doctor.js` / `test/doctor.test.js`. Pending plan/ledger work is not queue/routing implementation evidence.

No tests, runtime probes, installed OMP, real gh, providers, browser, commits or subagents were run in this round. Read-only source/diff/reference inspection only; the sole repository write is this report. LSP status reports no language servers configured, so reference enumeration used text search.

## R1 / CR1 closure

- `ContractDoctor.reportDiscoveryFailure`, its method comment and obsolete discovery claim in the class comment are removed. The direct-method test is removed, not repinned to another implementation detail.
- Source/bin/test reference enumeration finds no `reportDiscoveryFailure`, discovery-failed signature, old `createModelResponse`/`getModels`/`prewarm` caller or compatibility alias. Current manager consumers use the live downstream handler or explicit standalone discovery/serialization.
- No catalog failure path is reconnected to `ContractDoctor.report` or issue filing. Both live and standalone catalog failures stay in their explicit response/diagnostic paths.
- The exact doctor diff contains only the requested class-comment adjustment and method removal. Generic report/watchdog behavior, synchronous notice-before-synthesized-settle ordering, recorded versions, rollback guidance, 24-hour ledger, `hashangit/omp-t3` destination, and default `issuesEnabled !== false` policy remain intact. All six retained doctor tests explicitly disable issue filing.
- W19 reports `node --test test/doctor.test.js`: exit 0, six passes. Accepted as attributed implementation evidence; deliberately not rerun to confirm it.

**Accounting:** one prior Fix finding, resolved; none discarded or converted to a feature request. Remaining generic notice-policy comments do not introduce a discovery reporter, caller or alias.

## Original-scope contract accounting

| Contract | Round-two source/test assessment |
| --- | --- |
| Session-authoritative catalogs | Upstream synthetic interception and startup prewarm are absent. Catalog requests take the normal child passthrough once; the downstream handler requires the actual response type/command. Projection never invokes standalone discovery. Default manager construction and injected-manager handling use the same downstream interface. |
| Correlation and unrelated traffic | Own-property ID copying retains value/type and absence, including zero, numeric/string `7`, empty string and null. No tracker or fabricated ID. Tests interleave out-of-order catalogs and unrelated replies; prompt text mentioning the command and streaming deltas are not catalog responses. Existing noncatalog proxy handlers are unchanged by this diff. |
| Validation and liveness | Every member is validated before a success frame is published. Null/primitive/array members and incompatible supplied identity/provider/name types fail the whole catalog without partial lists. String selector/default-provider/name fallbacks, repeated provider-prefix removal and meaningful slashes remain. Malformed replies become one explicit failure; tests assert later streaming still passes. Live empty arrays succeed; standalone empty arrays throw. |
| Raw failure boundary | An existing `success:false` returns to unchanged passthrough, including protocol-1 overflow without ID. There is no CLI retry, cache substitute, protocol-2 negotiation, chunk handling or guessed correlation. Raw upstream overflow is not claimed to be prunable success. |
| Final success limit | `serializeModels` measures final UTF-8 JSON plus LF, real ID/envelope and both model lists; `> 1_048_576` throws, so equality fits. Live failure is list-free and diagnostics cannot mistake serialized failure for successful discovery. Tests construct 1,048,575 / 1,048,576 / 1,048,577-byte projected frames, with multibyte/escaped names, raw schema-heavy pipeline input and duplicated lists that overflow although either list fits. These are inspected assertions, not executions in this round. |
| Exact thinking advertising | Both CLI arrays and RPC `thinking.efforts` yield all seven keys. Only exact advertised strings self-map; missing, boolean, budget-only, empty and unknown-only capabilities map entirely to null. Mixed/duplicate efforts do not invent options. Independent reasoning conversion remains; no caller/role thinking clamp or rewrite is added. The pinned T3 consumer rationale and prior consumer-shaped evidence remain attributed to the approved plan and earlier records, not independently rerun here. |
| Stateless standalone discovery | Literal `execFileSync(ompPath, ['models', '--json'])`, inherited process cwd/env, one explicit discovery, no forced live-child agent directory. Same-manager later failure cannot return an earlier success: the manager holds no catalog state. No cache/TTL/timestamp/stale/builtin/context scaffold remains. |
| Actual diagnostic | The executable resolved/version-checked with shell-free argv is reused for discovery. Nonempty discovery and bounded serialization both precede catalog PASS. Discovery/JSON/validation/empty/size failures set nonzero exit. No new profile/config/cwd syntax or implicit second discovery. |
| Controlled fixture and shell safety | Diagnostic tests invoke the real entrypoint in scratch cwd with an environment built from `{}`. HOME/XDG/Pi/OMP directories and profiles are synthetic; explicit existing fake OMP prevents installed fallback, including its unspawnable mode. Trusted Node/sh and rejecting fake gh occupy controlled PATH. Literal executable names include spaces, quotes, dollar-command substitution and backticks; marker, argv/context, exit status, scratch session link and unchanged legacy cache assertions are present. No inherited token environment or real provider is needed. The reproducible npm fixture cleans in `finally`; tests use teardown. This is source-level isolation assessment, not a network-sandbox claim. |
| Documentation and preservation | README describes process-context diagnostics, ignored-not-deleted legacy caches, exact maps and raw-overflow limitations. AGENTS lessons match these contracts. Diff does not alter role-model routing, opt-in policy, offline resource compatibility, menus, extension adaptation, live child environment policy, package/version/release metadata, owner/install/fork/updater contracts or generic doctor ownership. The e2e catalog migration retains its streaming and settlement assertions; no broad compatibility-test deletion. |

## Acceptance and verification boundary

- **AC1 / AC2:** original requested functional contracts remain represented in source and substantive behavioral coverage; no contrary concrete counterexample found in this bounded re-review.
- **AC5, catalog scope:** documentation/caller migration and dead-path cleanup converge. No unrelated cleanup or feature is requested.
- **AC6, catalog review portion:** independent REVIEW-LOOP converges with this PASS. Parent full-union gates remain separate; this report neither records their pending outcome nor substitutes for them.
- W05's focused/compatibility/isolated-diagnostic results, round-one narrow probe and W19's six-test result are historical, attributed evidence. No runtime result is newly claimed here. The parent is running `npm test` plus the isolated diagnostic across the current union; no duplicate broad suite was launched.
- No certification of installed-provider availability, arbitrary oversized raw-success transport through real OMP, protocol 2, real network isolation, live T3 model presentation, or pending queue/routing implementation. Those boundaries are unchanged by the PASS.
