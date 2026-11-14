# W07 — Atomic Stop implementation

## Scope and authority

Implemented P3/AC3 against supplied catalog checkpoint `eac8480` and authorization `bd3344c`. Authority: ledger D06–D09/D14, [initial required matrix](selective-upstream-stop-plan-review.md), [approved round-two contract](selective-upstream-stop-plan-review-r2.md), and the subsequent [pinned consumer oracle](selective-upstream-stop-consumer-oracle.md). Source/runtime inputs: [W03](selective-upstream-integration-spike.md), [W13](selective-upstream-integration-runtime.md), [safety evidence](selective-upstream-stop-safety-design.md). The original upstream queue implementation was not imported.

No subagents, commits, ledger edits, routing/probe removals, package/version changes, installed OMP launches, paid models, real delegates, browser, plugins, T3 restart or real gh invocation. Full union gates and independent implementation review remain the orchestrator's responsibility. This document is an implementation receipt, not an independent PASS or live-T3 compatibility certificate.

## Exact owned files

- New `src/queue.js`: single-flight Stop transaction; random private namespace plus exact ID/type/command matching; one follower; mutation-attempt invalidation; validated text withdrawal; loss/lone-abort notify; capped terminal/state fence; acceptance/follower timers; fatal owner handoff and inert retired callbacks.
- `src/proxy.js`: mandatory termination owner at construction, admission before tracker/disarm/child writes, one Stop-aware client writer, private-reply interception before other adapters, ordinary state projection before finalization classification, EOF/write/error handling, stale pre-activity old lifecycle suppression after a post-Stop prompt. `createProviderOwner` kills only the direct owned main child immediately, observes `exit`, and finishes nonzero at the 250 ms observation timer without awaiting `close` or output drain. `spawnAndProxy` installs that owner.
- `src/settlement.js`: explicit `outputRecords` terminal/nonterminal batch seam, new-prompt lifecycle reset, and Stop-ownership hook across unsolicited `agent_start`. Existing compaction/state projection remains in the tracker.
- `src/doctor.js`: captured pending-announcement identity guards queued watchdog callbacks; `stop()` retires the pending announcement. W23 makes proxy settlement bookkeeping conditional on successful terminal write completion, not admission.
- New `test/queue.test.js`: real proxy/settlement/subagent components, synthetic streams, deterministic clock, adversarial T3-like batch consumer, identity/provenance/lifecycle/cap/failure regressions.
- New `test/stop-owner.test.js`: actual synthetic Node main processes, a language-level accepted-work/EOF hazard model (not OMP queue execution), ignored TERM, retained descendant pipes, non-reading output, actual SIGKILL exit observation, separate provider-process nonzero exit, unrelated owned sibling survival, unconfirmed-exit case.
- `test/e2e.test.js`: existing lifecycle/native-child scenarios now supply an atomic-capable synthetic child and a real synthetic-transport termination owner; ordering assertions target the atomic request instead of plain abort.
- `test/doctor.test.js`: retired-watchdog regression and corrected async temporary-state lifetime.
- `test/approval.test.js`, `test/usage.test.js`, `test/parity.test.js`, `test/model_catalog.test.js`, `test/check-shell.test.js`: necessary embedding-fixture migration for mandatory owners. Each synthetic owner destroys its owned child streams; no production no-op owner fallback. No catalog/thinking assertions were weakened.
- `README.md`: Atomic Stop contract, corrected settlement/passthrough/cancellation claims and Unreleased entry.
- `AGENTS.md`: consumer predicate, process ownership, timer identity and asynchronous fixture-isolation lessons.
- New `planning_docs/selective-upstream-stop-implementation.md`: this receipt. A temporary standalone classifier test file was removed; its consumer-visible edge cases live in the focused queue fixture instead. No throwaway script remains.

## Behavioral contract

Both clear and lone abort arm the deadline/fence before the existing abort transition. That transition closes cards and writes existing native-child cancellations before exactly one `abort_and_restore_queue`. A clear may own one early or completed follower, with independently preserved ID presence/type. Overlaps are explicit failures, not a message queue. Unknown requests are conservatively mutations; known message/tree/catalog/state reads and tool/dialog control traffic remain immediate. Rejected prompts never reset settlement or disarm provenance cancellation.

The restored arrays and every entry are validated, not filtered. Strings and text objects preserve exact text/order/duplicates/empty values. Returned images imply text-only loss even without an upstream image-loss flag. Truncation/image loss, lone-abort text and early-follower text use active-turn notify, independent of doctor's issue ledger. A lone abort never emits a clear response. Only available text is claimed; upstream omission and T3 display loss are not recoverable.

Every terminal emitter enters the same explicit output-record seam, including upstream idle abort, active abort's agent-end prefix/settle suffix, translated and raw settlement, prompt-result fallback, local-command response/settle batches and doctor synthesis. Nonterminal prefixes remain immediate. One normalized aborted terminal is retained, duplicate terminals coalesce, and the terminal retains its relative position among deferred state replies. W23 delays `doctor.noteSettled()`/hold-open cleanup until successful output completion. New accepted prompts invalidate old completion cleanup, but old admitted delivery still owns transport failure until completion. Arbitrary untagged external lifecycle attribution is not invented.

Successful state classification follows the pinned oracle after ordinary projection: literal activity `true`, or a finite nonzero pending count (negative/fractional included), proves busy. Missing/null/scalar/array data and invalid count/activity fields can be idle. Existing null/string pending aliases remain unchanged. Any nonliteral-success matched state response is failure-sensitive. No Stop-specific pending sentinel or fabricated busy response exists.

W22 correlates actual state-request destinations before other response adapters, not by response command alone. Exact string IDs occupy a 16-entry / 16 KiB UTF-8 bounded set from request admission through reply. Response projection preserves command, ID and success/failure; recognized but wrong catalog/command labels cannot consume a matched state reply first. Overflow is an explicit ordinary limit error, or fatal during Stop.

Limits: 1,000 ms from Stop acceptance, including cancellation delay; completed-clear fence 500 ms after clear success; one transaction/follower; one minimal normalized terminal with a 16 KiB terminal admission ceiling; 16 deferred states and aggregate 1 MiB; restore frame 1 MiB. Byte admission counts serialized UTF-8 and LF. State and restore budgets are separate, not a claim that combined storage is only 1 MiB. Expiry releases old output and diagnoses the missing follower, not consumption. W23 retains delivery ownership until callbacks succeed, using that same fence as the completion deadline, without renewing it. Completed mutations admit old ordered output before forwarding; follower association is invalidated immediately, and another Stop overlaps while delivery is pending.

Fatal failure latches admission closed, synchronously asks the actual owner to SIGKILL before stdin closure, attempts honest outstanding errors and notify, discards held clean settlement and finishes provider transport nonzero. Already-answered requests are not answered again. Unsupported, malformed, generic partial-withdrawal, timeout, EOF, write/error and overflow all use this path. No retry, replay, plain abort, TERM grace, inherited/global process-group signal or reconnect. Actual child exit, not `killed` or `close`, confirms termination. A 250 ms timer bounds observation/output waiting; this is not hard real-time under an unbounded scheduler/OS stall.

W22 corrected synchronous release admission failures, but round-two owner review found ordinary transport retirement could orphan the main child and `write(true)` could retire release before callback failure. W23 corrects both: ordinary errors notify the process owner before reader retirement, and Stop retains its transaction through successful completion/failure of admitted output. Settlement bookkeeping waits for completion and is generation guarded across new prompts. Stop-owned child/client writes still admit at most 1 MiB of queued bytes plus proposed line; false writes fail immediately without a replay queue. Fatal client admission remains paused/closed and guarded against already-queued callbacks; only finite outstanding errors/notify are attempted.

## Verification commands and results

No language servers are configured (`lsp status`); source inspection/edit tools were used. Final resource preflight reported 8,834 MiB available and both heavy-gate slots free. Only ordinary Node/synthetic processes ran, not installed OMP/browser/heavy workloads.

1. Initial focused command:

   ```sh
   node --test test/queue.test.js test/e2e.test.js test/settlement.test.js test/doctor.test.js test/subagent.test.js test/stop-owner.test.js
   ```

   First run: 170 tests, 164 pass/6 fail (`artifact://2`). Three real active-cycle failures exposed a terminal arriving after successful atomic release being suppressed; fixed by retaining pending aborted-terminal ownership until emission or new prompt. Three consumer assertions incorrectly required probe termination to win over an already eligible terminal; fixed the fixture to permit the real terminal race and added separate eligible final-retry failure scenarios with no terminal. Subsequent expanded run had 200 tests, 198 pass/2 fail (`artifact://6`): both were literal `\\n` rather than newlines in provider fixture event logs. Corrected fixture escaping; no failure was waived.

2. Corrected owner + actual isolated diagnostic:

   ```sh
   node --test test/stop-owner.test.js && node test/check-fixture.js "$(command -v npm)"
   ```

   10/10 pass, exit 0; actual `npm run check` passed under the existing helper's scratch HOME/XDG/Pi/OMP environment and recording fake OMP (`artifact://7`). The helper was not changed. Expected synthetic extension-ledger warning did not fail the diagnostic.

3. Queue/owner boundary verification:

   ```sh
   free -m && ~/.omp/bin/heavy-gate --status && node --test test/queue.test.js test/stop-owner.test.js
   ```

   101/101 pass, exit 0. Includes exact/one-over UTF-8/LF limits, count 16/17, two-frame aggregate byte boundary, restore success at 999 ms followed by exact 500 ms expiry, actual cancellation write consuming the acceptance deadline, and 10,000 unrelated stream frames with duplicate terminal signals. Subsequent stale-cycle-end refinement: `node --test --test-name-pattern='completed active restore with no terminal|unsolicited agent_start' test/queue.test.js`, 2/2 pass.

4. Mandatory owner + final isolated embedding gate:

   ```sh
   free -m && ~/.omp/bin/heavy-gate --status
   scratch=$(mktemp -d /tmp/ompt3-w07-check-XXXXXX)
   mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
   HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" \
     node --test test/queue.test.js test/e2e.test.js test/settlement.test.js test/doctor.test.js test/subagent.test.js test/stop-owner.test.js test/approval.test.js test/usage.test.js test/parity.test.js test/model_catalog.test.js test/check-shell.test.js
   result=$?; rm -rf "$scratch"; exit "$result"
   ```

   220/220 pass, exit 0 (`artifact://11`). This is the expanded focused preservation gate, not `npm test`. Final `get_entries` whitelist addition and its new restoring/completed-fence regression were then checked with:

   ```sh
   scratch=$(mktemp -d /tmp/ompt3-w07-tree-XXXXXX)
   HOME="$scratch" XDG_STATE_HOME="$scratch/state" node --test --test-name-pattern='tree reads remain immediate' test/queue.test.js
   result=$?; rm -rf "$scratch"; exit "$result"
   ```

   1/1 pass, exit 0. Later edits are documentation only.

### Isolation caveat

Early focused commands inherited the calling HOME/XDG environment. The pre-existing asynchronous `withTempStateHome` helper restored XDG state before watchdog promises completed. **[INFERENCE]** Those early runs could therefore access/persist doctor state under the inherited state home; no actual external state modification was inspected or is claimed. The helper now retains its temporary state until Promise completion, and the final embedding gate additionally used an outer scratch HOME/XDG boundary. No external user files were inspected, deleted or repaired to hide this caveat. Doctor tests disable issue creation; actual installed OMP and real gh were not launched.

W22 corrected independent fixture isolation: embedding fixtures now inject inert doctors; the retired-watchdog regression constructs its issue-disabled, controlled-version real doctor inside `withTempStateHome`. The outer scratch boundary remains additional defense. Historical W07 commands/results above are not rerun or reclassified as hermetic proof.

## W22 corrective evidence

The original matrix over-accounted early-follower consumption, actual split parsing, command-independent state destinations, output release/admission, completed-fence disposal and process/pipe coverage. Rows below now distinguish the corrected tests from the original nominal failure-path inference. Exact corrective commands, exit results and per-finding proof are in [stop-fix-r1](selective-upstream-stop-fix-r1.md). This remains implementation evidence pending independent original-scope review; P4 migration and the parent's full isolated gates are not claimed.

## W23 completion/ordinary-owner correction

Round-two owner findings OR1-R2/OR2-R2 supersede W22's ordinary-retirement/full-flush claims. [stop-fix-r2](selective-upstream-stop-fix-r2.md) records exact isolated commands, the failed expanded fixture attempt and its correction, actual main/provider nonzero-exit proof, real asynchronous retained-state callback failure, never-ack deadline, and successful terminal-completion/new-prompt/disposal guards. Existing consumer/native-child/correlation tests remain. This is implementation evidence, not independent acceptance or the parent joint gate.


## Required matrix accounting

Numbers below follow the initial review's required matrix in order. All evidence is synthetic/runtime component evidence unless explicitly noted.

| # | Required case | Evidence |
| --- | --- | --- |
| 1 | Active clear, sequential awaited abort | Consumer notice/probe permutations parse batches before clear continuation; one atomic request, follower after notice permit, terminal after notice. Native sweep order retained in e2e. |
| 2 | Early abort, overlap | Early-follower wire/sweep regression plus actual Consumer notification before held failed probe/terminal finalization. A later awaited abort may be a fresh gesture; no claim that early follower acknowledges consumption. |
| 3 | Idle/paused clear and lone abort | Idle synthesis held by the upstream writer; identity/lone-abort tests and paused-run e2e. |
| 4 | Lone-abort text/loss | Notify before failed probe/terminal, text response, no clear; returned images imply loss; empty truncation result visibly distinguished. |
| 5 | Fidelity | Mixed text objects/strings, Unicode/whitespace, duplicate and empty strings, steering/follow-up order; malformed items fail instead of being dropped. |
| 6 | Same/split chunks | Same-batch adverse parser plus separate `parse()` calls with continuation opportunities between actual batches; failed pre-activity and final post-activity probes remain behind the active-turn text notice. Native-Promise evidence, not Effect equivalence. |
| 7 | Independent probes | Already-issued exact string-ID waiters; missing/wrong/recognized-adapter commands; failed/idle replies before/after atomic success; projection-induced busy reply; lower-attempt 100 ms retry. Matched malformed data and nonliteral success exercise Consumer idle/failure outcomes. Pending destination table is capped at 16 IDs / 16 KiB, retired on response/fatal/disposal. |
| 8 | Prompt unrelated traffic | Restoring: projected busy, unrelated failure, stream/tool/approval. Completed fence: unrelated failure/tool/approval; negative/fractional state counts and tree reads in both phases. No claim of an exhaustive cross-product of every frame kind and phase. |
| 9 | Every terminal producer | Separate agent-end, session-settled, raw settled, fallback, local response prefix and doctor callback cases; duplicate suppression; actual doctor stale-watchdog regression. |
| 10 | Native children | Existing fleet/unattributed/provenance e2e and subagent suite; rejected prompt leaves late-child cancellation armed, accepted prompt disarms; one follower sweep. |
| 11 | Missing follower | Exact 499/500 ms boundary releases output/diagnoses; retirement additionally requires completed writes. Never-ack output fails at the same fence, not a larger drain deadline. |
| 12 | Completed restore/new mutation | Admit old output before forwarding; pending delivery remains failure-owned without follower association. Successful old callbacks cannot settle a new prompt; old timers cannot affect a later transaction. Cases with held terminal and no terminal yet remain. |
| 13 | Unresolved mutation | Original-ID explicit error; no forwarded prompt, no disarm; attempted mutation invalidates follower eligibility. |
| 14 | Identity/private ownership | Absent/null/0/string IDs and successful mixed paired identities; collision rejected; exact command/type/ID; numeric/string lookalikes and retired IDs do not complete a new transaction. |
| 15 | Unsupported/malformed/partial failure | Correlated failures and notify; no empty success/retry/fallback. Owner partial fixture records withdrawal before generic failure. |
| 16 | Timeout/EOF/write | Acceptance-origin timer; real readable/client errors, closed/thrown/saturated writes and release failures. W23 adds ordinary actual-main client/child-readable/stdin/output errors, asynchronous retained-write errors and never-ack completion, plus actual provider nonzero exits. Exact commands/results in stop-fix-r2; nominal common `fail()` is not substitute proof. |
| 17 | Late replies | Retired private replies consumed during newer Stop; fatal/disposed callbacks inert; timer callbacks have captured ownership guards. |
| 18 | Caps/traffic | Exact/one-over state/restore/terminal and aggregate budgets, 10,000 unrelated frames and absolute timers. Real non-reading input at atomic/cancel/read admission; output saturation and release backpressure; fatal follow-on requests add no output. Stop-owned per-write admission additionally caps queued bytes plus proposed line at 1 MiB. |
| 19 | Dispose/stale callbacks | Unresolved and completed-clear disposal; real retained callback error after disposal is inert, with no duplicate clear or clean settlement. Old successful callbacks cannot settle a newer prompt; saved deadline cannot affect the next transaction. Original Consumer object-identity/generation/compaction/activity guards remain. |
| 20 | Process ownership | Actual main branches record detection, SIGKILL, exit, stdin destruction and nonzero finish with an indefinite holder alive and `close` pending. W23 adds ordinary errors, real admitted callback failure and never-ack completion; provider subprocesses exit 1 with unread stdout and unrelated sibling survival. EOF marker is a language-level model, not OMP queue execution. |
| 21 | No-Stop preservation | E2E/settlement/subagent/approval/usage/parity/catalog/check-shell checks pass in isolated embedding gate. Routing, policy, role-model, cap, CLI and update implementation files untouched. Full union preservation gate remains parent-owned. |

Round-two additions are not waived. Corrected consumer cases exercise failed probes on either side of success, actual split parses, permissive matched data, pre/post activity, early-follower active notify and the clear-notice object-identity permit boundary. W23 makes bookkeeping conditional on actual successful output completion, not `write(true)`; callback error/closure/never-ack output retains bounded failure ownership. Independent re-review and parent P3+P4 union gates remain outstanding.

The consumer is a native-Promise adversarial scheduler with ordered line batches, string-ID waiters and asynchronous clear continuation. It is **not Effect-fiber scheduling equivalence or an actual installed T3 UI run**. Active Stop tests model interrupted terminal handling; no claim of composer restoration or exact visual wording is made. The frozen protocol ambiguity, irreversible upstream loss, T3 display truncation/empty-text omission, finite-fence non-acknowledgement and arbitrary external provenance/containment limits remain explicit. They do not waive any observed concrete failure.

## Parent gate reproduction

Independent W08 should inspect the exact implementation and required matrix, not infer acceptance from this receipt. Run the parent union only in an outer scratch HOME/XDG environment, then the existing diagnostic helper:

```sh
scratch=$(mktemp -d /tmp/ompt3-w07-parent-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" npm test
result=$?
rm -rf "$scratch"
[ "$result" -eq 0 ] && node test/check-fixture.js "$(command -v npm)"
```

No full `npm test`, independent review or commit was performed by this worker. No installed OMP/live T3/browser proof is claimed or needed for the supplied synthetic acceptance surface.
