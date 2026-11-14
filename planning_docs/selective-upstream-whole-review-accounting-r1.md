# W11 — Whole-change accounting/consumer review r1

## Verdict: FIX — one open functional finding

**WA1 (P2 / medium): required-hook startup can hang indefinitely after the owned child exits without registering.** AC4/AC5/AC6 cannot close on this candidate. No Replan, Discard, new accepted risk or scope reduction is proposed. No additional catalog or Stop functional finding was found in the inspected implementation and required proof corpus.

Scope: baseline `aafbe12` through the current tracked and untracked catalog/Stop/routing implementation, tests and documentation. Read AC1–6, decisions D01–D20, work/finding accounting, approved catalog r2/Stop r2/routing plans, D16's independent joint-checkpoint approval, current implementation/correction receipts and both last Stop reviews. Read new controller, generated-hook helper, queue/owner tests and untracked evidence directly, not only tracked diffs. LSP reports no configured servers.

Only this new report was written. No implementation/test/README/AGENTS/ledger edits, commits or subagents. No installed OMP/T3, actual gh, models, browser, heavy workload or ambient user-state inspection. No broad gate or historical reported failure was rerun. One previously unobserved isolated synthetic launcher probe was run; details below.

## WA1 — retain bounded refusal ownership across `exit` and pipe delivery

**Evidence:** `src/proxy.js:429–452,472–483`.

- Required registration starts a 10,000 ms timer. Successful fd-3 acknowledgement clears it and starts the proxy.
- The owned child's `exit` listener also clears that timer unconditionally, even when `hookRegistered` is false.
- Missing-registration refusal then depends on child `close`. `close` waits for inherited pipe handles, unlike `exit`.
- A startup extension/helper can leave a descendant holding stdout or fd 3 while the owned OMP process exits before registering. No timer remains, `close` does not arrive, and the proxy never starts or reports refusal. T3 sees an indefinitely open, silent provider instead of the documented bounded failure.

This is a new registration-lifetime defect, not the old fixed-list probe failure and not an assertion that an unguarded prompt executed. Withholding RPC is correct; abandoning bounded transport retirement is not. The required-hook layer must not reintroduce the `close` dependency that Stop's direct-process owner deliberately avoids.

### Independent reproduction, run once

A finite inline Node harness created a fresh `/tmp/w11-ack-*` directory and an allowlisted child environment: scratch HOME/XDG/Pi directories, explicit existing fake `OMP_PATH`, cleared model-policy lists and a rejecting scratch `gh`. It launched the real `bin/omp-t3 --mode rpc` with default routing. The literal-path fake executable contained the following program, with absolute Node shebang and scratch `holderFile` substituted:

```js
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const h = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
  stdio: ['ignore', 1, 2, 3]
});
fs.writeFileSync(holderFile, String(h.pid));
process.exit(7); // no generated-hook registration or acknowledgement
```

The harness kept shim stdin open, collected stdout/stderr, registered an `exit` observer, and inspected the result after 11,200 ms, beyond the registration deadline. Exact output:

```json
{"elapsedMs":11200,"shimExit":null,"stdout":"","stderr":"","retainedPipeHolder":1203042,"stillAlive":true}
```

Harness command exited 0 after 11.29 seconds. It then killed only its own holder and shim, awaited shim closure and removed scratch state. Cleanup was after the observation and does not supply a claimed natural exit. No installed executable/provider was used. The observed assertion is bounded to 11.2 seconds; indefinite lifetime follows from the missing timer and retained handles in the source.

### Required closure

1. Preserve bounded registration/refusal ownership after main-child `exit` without discarding acknowledgement bytes already in flight. Do not simply fail synchronously on `exit`: successful immediate-exit acknowledgement delivery must remain valid.
2. Ensure missing registration retires the provider nonzero without waiting for descendant-held `close`; use the existing direct-owner boundary rather than probes, relaunch, fallback, process-group signals or child replacement.
3. Add isolated actual-launcher regressions for exit-before-registration with a retained pipe and valid acknowledgement plus immediate exit. Observe bounded exit and diagnostic before cleanup; assert one launch, no forwarded readiness/RPC on refusal and unrelated-process survival.
4. Re-review the correction and rerun parent final isolated gates after the last behavioral change. Keep README/help's ten-second refusal claim only with the lifetime actually enforced.

`test/launcher.test.js:155–163` currently covers load error, registration throw and a still-running missing hook. Its fake exits naturally without a retained descendant in the error cases, so it cannot catch WA1. Existing Stop retained-pipe tests exercise another ownership path and do not cover this startup gap.

## Full accepted-goal disposition

| Scope | Source/consumer/test evidence inspected | Disposition |
| --- | --- | --- |
| AC1 session catalog | `src/model_catalog.js:8–93`; proxy forwards requests and adapts child replies (`src/proxy.js:261–266`); real diagnostic uses one resolved literal executable and explicit discovery (`bin/omp-t3:104–128`). No persisted state, fabricated lists, prewarm or retry path. `test/model_catalog.test.js:34–114` covers forwarding, fresh/session-separated catalogs, out-of-order typed/present/absent IDs, empty live success, malformed whole-catalog error, subsequent streaming and unchanged real/ID-less protocol-1 failures. | Implemented at the reviewed protocol boundary; no new finding. |
| AC1 size/failure/diagnostic | Final success serializer measures UTF-8 JSON plus LF including both list fields. Exact 1,048,575/1,048,576/1,048,577-byte pipeline cases include escaping/multibyte content and duplicated lists (`model_catalog.test.js:133–166`). `test/check-fixture.js` and `test/check-shell.test.js` use scratch context, seeded untouched legacy cache, recording literal executable with quotes/$()/backticks, and rejecting gh; failures/empty/malformed/oversize/unspawnable cases require nonzero status. | No CLI fallback or guessed overflow identity. Raw upstream pre-prune overflow is explicitly outside what pruning can repair. |
| AC2 thinking | Complete seven-key map is constructed for CLI arrays and RPC efforts; absent/boolean/budget/unknown support maps entirely to null (`model_catalog.js:33–38`, tests `116–131`). Reasoning is separate. Catalog receipt records a source-derived consumer filter proof: unknown has no descriptor, sparse retains low/xhigh/max, absent-map control enables the five lower defaults. | Source/test projection matches approved consumer rules. Receipt's consumer execution is attributed evidence, not this review's live T3/UI proof. No caller/role clamp added. |
| AC3 atomic admission and fidelity | `src/queue.js` implements one private exact-ID/type/command transaction, one sweep/follower, explicit overlap, attempted-mutation invalidation, text validation/order/duplicates/empties and loss notices. Proxy admission precedes tracker/provenance side effects; no plain-abort fallback/replay/retry. All emissions enter `outputRecords` and the same Stop writer. | No new defect found; available text only, not composer restoration. |
| AC3 actual consumer behavior | `test/queue.test.js:59–202,605–753` models exact string-ID RPC waiters without response-command equality, separate pre/post-activity failure, last retry termination, notice permit/object identity and same-batch plus actual split parses. Destination association precedes other adapters; ordinary pending-count projection precedes classification. Negative/fractional finite nonzero counts and malformed/nonliteral success outcomes have explicit cases. | Required consumer observations exist, not merely wire order/callback counts. Native Promise scheduling remains adversarial evidence, not Effect/live-client equivalence. |
| AC3 caps/lifetime/owner | Source has 1,000 ms restore, 500 ms follower/completion fence, 250 ms fatal owner observation; one terminal <=16 KiB, <=16 states/1 MiB, restore <=1 MiB, <=16 state IDs/16 KiB and Stop-owned queued-plus-proposed write <=1 MiB. Exact/one-over and aggregate UTF-8/LF tests, absolute timers, traffic, disposal and saved-identity callbacks are present. | No enlarged grace, global buffer or missing cap found. Missing-follower release allows only a zero-delay completion observation turn, not a renewed drain deadline. |
| AC3 real Writable/process proof | `queue.test.js:755–917` injects real nonreading/admitted Writables, callback failure, closure, never-ack and successful terminal completion. Old delivery owns failure across a new prompt without settling its doctor. `stop-owner.test.js` contains 23 actual-main modes + nine provider subprocess modes + one unconfirmed-exit case: kill-before-EOF, actual exit before finish, retained holder/close pending, saturation, no queued marker and unrelated sibling survival before cleanup. | Prior OR/PR closure is supported by actual source/assertions. The EOF queue is explicitly a language-level hazard model, not installed OMP execution. No deep owner suite rerun here. |
| AC4 routing matrix/filter/guard | `parseArgs` captures original intent, preserves split/equals explicit tools including empty/invalid forms, appends one existing content-keyed generated hook after user arguments, and keeps policy separate. Generated handlers remove only exact task from current names, await setter at all three lifecycle seams, skip absent task, diagnose API/getter/setter/rejection failures and retain the routing call guard. `delegate-enforcement.test.js` has all 12 policy/routing/tools combinations; generated-handler tests cover latest selection, awaiting, absence and later re-enable. | Core filter/guard contract implemented. WA1 blocks the new startup refusal/lifetime contract. |
| AC4 installed generated source | Routing receipt includes exact reproduction source that generates the production file, loads it unchanged with actual installed explicit-only discovery under no-extensions, checks real fd-3 acknowledgement and uses installed loader/runner/initializeExtensions/SessionTools/xdev. Complete enabled/top/mounted arrays and listing/docs are compared; disabled names stay disabled; later re-enable is blocked by actual dispatch. | Stronger than W15's synthetic hook; attributed gated OMP 18.20.0 evidence, not independently rerun. Host/session/agent are structural doubles; injected tree event is not disk-backed restoration, plugin/MCP transport, UI or all-future-version proof. |
| AC5 preserved baseline | Model resolver and adapted bridge remain unchanged. `test/delegate_models.test.js` retains role/frontmatter/layer/alias/session inheritance, caller thinking and empty options clears, Pi/local scoping, opt-out, policy-off fill and fill-before-policy/send checks. Native cap edge cases remain in CLI tests; offline discovery, menus, adaptation ownership and literal shellpath diagnostics retain behavioral checks. Package/version/release/install/update/issue destinations are not ported from the fork. | No baseline-preservation finding found. Existing explicit opt-out does not disable independently opted-in model policy. |
| AC5 docs/changelog | README protocol/Stop/routing/Unreleased and launcher help describe no cache fallback, unknown thinking, text/loss/notice limits, scoped owner termination, stable-only selection/presentation, concurrent full-set loss and advertised-task-on-filter-failure. | Accurate scope/limits except the bounded missing-registration assertion disproved by WA1. Historic release notes are historical, not a demand to restore obsolete mechanisms. |
| AC6 independent convergence/gates | Catalog and Stop reviews converge with corrections preserved. Ledger's newest I28 records parent outer-isolated 422/422 and actual isolated npm diagnostic success; W09/W10/W11 remain active, W12 remains todo and G1 remains open. | Candidate gate evidence is attributed, not reviewer execution or final closure. WA1 requires correction/re-review and fresh parent gates afterward. |

## Cutover, isolation and accounting

- Catalog exports/callers are migrated: production callers are proxy and diagnostic; removed interception/cache/fallback/reportDiscoveryFailure APIs have no production compatibility aliases. Deleted fixed-list DEFAULT_TOOLS, injectedTools/fallbackArgs and probe/prune/retry/stock-launch machinery have no reachable remnants in CLI/bin. Changes to the generated-hook tests dispatch actual handlers instead of re-pinning the old registration mechanism.
- E2E's atomic-capable child helper is explicitly a synthetic transport implementation for preserved lifecycle/provenance cases, not a production fallback; raw queue/owner tests independently exercise real error/consumer edges. Every production pipeline owner is mandatory; synthetic owners close their owned streams. Inert fixture doctors do not pretend to prove real doctor behavior.
- Real-doctor tests construct inside scratch state, disable issue creation and provide controlled/fake versions. Promise cleanup retains scratch state through completion. Retired-watchdog and embeddings no longer depend on ambient HOME, installed OMP or gh. Diagnostic/launcher subprocess environments are controlled and scratch-owned. Earlier isolation caveats are disclosed, not rewritten as hermetic historical evidence.
- D01 excludes presentation/cards, parent-CWD/external plugin ports and upstream fork/version/default-policy ownership at adoption. These are not unfinished accepted recommendations. Native-card baseline preservation is still tested; excluding the presentation port did not exclude the existing renderer from regression responsibility.
- D03/D05/D06/D07/D09/D15 explain bounded gesture association, loss, failure/consumer semantics and exact limits. D10/F08 explicitly accepts the demonstrated public full-selection concurrency limitation; stable membership is a condition, not an invented lock. Neither set of accepted limits excuses WA1.
- D16 changes checkpoint order only. The entire W07 implementation, W22/W23 corrections and original-scope proof remain present. The obsolete failed probe algorithm and its mechanism tests left together; the replacement launcher tests assert one final launch, >900 ms readiness, exact explicit invalid argv/natural failure, natural startup status, bounded spawn failure, signal-observed child exit/reaping and sibling survival before cleanup. No timing re-pin or assertion suppression substitutes for that stronger ordinary single-child contract. The new registration corner case remains a separate concrete missing behavior.
- W14 is done by the safety-design deliverable; no backend task metadata was polled or treated as unfinished accepted implementation. Earlier work statuses/authorization prose inside historical decisions and receipts are historical, not newly open decisions.

## Closure constraints

Keep G1 and final acceptance open. Parent-reported green candidate gates do not override WA1 or certify independent convergence. Correct WA1 without reducing AC4/refusal or losing valid exit/ack delivery, obtain independent original-scope routing/union re-review, then run final full outer-isolated `npm test` and actual isolated npm diagnostic after the last behavioral change. Reconcile W09/W10/W11/W12 and G1 through the ledger before the final green commit. No other Fix/Replan finding is introduced by this review; no deployment, push, external plugin or UI/future-version proof is required by the accepted bounded goal.
