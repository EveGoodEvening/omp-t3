# W22 — Stop corrective implementation r1

## Scope and result

Corrected OR1–OR5 and PR1–PR4 (PR3 duplicates OR4) within frozen D06/D09/P3. Read D06–D10/D14–D17, both complete round-one reviews, the pinned consumer oracle and approved Stop plan review r2. No ledger/review edits, subagents, commits, routing/probe/launcher changes, package/version/updater/model-policy changes, installed OMP/T3/provider execution, browser or gh execution. No new accepted-risk waiver or architecture change.

Final focused verification is partitioned: **270 component tests + 22 owner tests, both commands exit 0, zero failures/skips**. This is not the parent full npm gate or independent review. D16's reported 323/324 legacy launcher failure was not rerun, patched, skipped by a broad gate or weakened; parent P4 migration/full union gates remain required.

## Corrections and proof by finding

| Finding | Correction | Behavioral proof |
| --- | --- | --- |
| OR1 | Both readline Interfaces and both readable inputs have explicit error handling. Stop failures synchronously reach the idempotent fatal owner; ordinary non-Stop errors diagnose and retire the pipeline, not an uncaught-exception suppressor/no-op. | `actual PassThrough childOut/clientIn error reaches fatal owner once` emits real stream errors twice, observes one owner request, correlated failure and no terminal. Ordinary-error cases observe diagnostic and no subsequent child admission. Real owned-main `client-error` / `readable-error` cases observe actual SIGKILL exit and bounded nonzero finish. |
| OR2 | `release()` retains the transaction through every retained write and checks failure before continuing/bookkeeping. Closed/destroyed output, close/error, throwing writes and false writes fail Stop; held output is discarded on failure. Already-answered clear/follower requests are not answered again. | Four `release retains fatal output ownership` cases cover real Writable backpressure, thrown write, destroyed output and close. A failed state precedes the held terminal: no terminal is emitted/bookkept, clear appears once, and post-fatal large-ID requests do not add output. Real owned-main `release-pressure` / `release-throw` and provider subprocess `release-pressure` prove process ownership/exit, not just wire behavior. |
| OR3 | Stop-owned writes check queued bytes plus proposed UTF-8 line before admission (1 MiB). Any false child/client write fails immediately. Native cancellation, atomic write and allowed read/control traffic use the same child writer. Fatal owner handoff occurs before pausing/closing client admission; already-queued callbacks are fatal-guarded. Only the finite outstanding Stop diagnostics are attempted. No replay queue/drain wait. | Real non-reading Writables exercise atomic/cancel/read admission, not callback counts. Repeated follow-on requests cannot grow child/output buffering. Over-budget child/client frames are rejected before buffering. Real owned-main `input-pressure`, `input-throw`, `output-pressure` and saturated unread provider stdout cases prove owner/finish behavior. Existing deterministic cancellation-delay regression retains the 1,000 ms acceptance origin. |
| OR4 / PR3 | Retired-watchdog construction is inside `withTempStateHome`; issue creation disabled and version controlled. E2E/approval/usage/parity embeddings now inject inert doctors; other pipeline fixtures already inject doctors. Outer scratch HOME/XDG is additional defense. | Final doctor and embedding checks pass without default production doctors in fixture construction. Real-doctor tests use scratch state with issue-disabled controlled/fake versions. No user state inspection/repair or real gh/installed OMP version invocation. |
| OR5 | Expanded active-Stop owner cases; pipe holder is indefinite and explicitly cleaned after observation, not a 750 ms timer. Records detection, kill request, actual exit, stdin destruction and provider finish. EOF fixture ends a separate proxy-facing PassThrough while the original OS output remains descendant-held. | Seventeen real-main modes pass: unsupported, partial, malformed, timeout, EOF, write, overflow, client-EOF, client-error, readable-error, output-error, output-close, output-pressure, release-pressure, release-throw, input-pressure, input-throw. Every case checks actual SIGKILL exit before cleanup, kill before stdin destruction, exit before nonzero finish, and live holder/pending `close` at finish. Four actual provider subprocesses exit 1 with unread stdout; pressure modes explicitly diagnose backpressure. Unrelated sibling remains alive. Fake unconfirmed-owner case still reports unconfirmed termination truthfully. |
| PR1 | An early follower uses the existing active-turn notify channel for available text before releasing finalizing output. It is not treated as clear-consumption acknowledgement. | `early follower notify preserves active text before held probe and terminal consumption` drives real pipeline output through unchanged string-ID Consumer waiters and the permit. Recovered text is consumed before active-turn nulling. The later awaited abort can be a fresh atomic gesture; the fixture supplies its real synthetic result rather than disguising that accepted ambiguity. |
| PR2 | Bound exact string state-request destinations from admission, including probes issued before Stop. Matched state replies are routed before catalog/command/other response adapters and use the ordinary shared projection. Wrong/missing command, payload, success/failure and external ID are preserved. Private atomic command validation remains strict. | 32 Consumer cases: absent/wrong/`get_available_models`/`get_commands` response commands × failed/idle × before/after atomic success × pre/post activity. Notice precedes actual idle finalization or final post-activity failure termination. Projected-busy wrong catalog command and unrelated failure remain prompt. Count/UTF-8 request-ID caps and retirement on response are exercised; existing Stop identity tests retain absent/null/numeric/string ID behavior. |
| PR4 | Added genuine split Consumer parses/continuations, active-object replacement and active absence at the blocked clear-notice permit, completed-clear disposal with saved timer, matched permissive outcomes, and completed-fence prompt traffic. | Split failed pre-/final post-activity probes observe notice before finalization/termination. Same-ID replacement/absence suppress old clear notice at permit acquisition. Disposal after clear success emits no duplicate clear/clean terminal, requests the owner once and leaves saved callback inert. Null/scalar/malformed data and nonliteral success traverse matched Consumer idle/failure branches. Unrelated error/tool/approval frames remain observable before the completed fence's follower. |

## Bounds and lifecycle details

Existing frozen bounds remain: restore 1,000 ms from acceptance, completed-clear follower fence 500 ms, one transaction/follower/normalized terminal, terminal source admission 16 KiB, at most 16 deferred states totaling 1 MiB, restore frame 1 MiB. Serialized-frame bounds include UTF-8 JSON plus LF.

Minimal additional bookkeeping/admission bounds:

- At most 16 outstanding string state-request IDs, aggregate 16 KiB UTF-8. Register before forwarding; retire on reply or fatal/disposal. Limit exhaustion outside Stop returns `STATE_REQUEST_LIMIT`; during Stop it fails closed. No expiry/retry, response-wide map or unbounded waiter list. This can reject further state requests until a pending reply retires capacity or the transport is disposed; the limit is explicit, not silent eviction.
- During Stop ownership, each child/client proposed write plus already-buffered bytes must fit 1 MiB. False writes fail immediately, including cancellation/atomic/read admission and final release. Fatal diagnostics are finite and subject to the output admission bound. Ordinary non-Stop backpressure behavior is not replaced by a new buffering mechanism.

`createProviderOwner` retains its immediate direct-child SIGKILL and fixed 250 ms timer. Tests record `detect < SIGKILL < exit < finish` and `SIGKILL < stdin-close`; Node may destroy stdin before delivering its `exit` event, so no contrary ordering is invented. All real-main cases observe at least 200 ms and less than 1,500 ms from detection to completion under the test scheduler, with exactly 250 ms requested by the owner clock. This is qualified elapsed evidence, not a hard-real-time guarantee under arbitrary OS stalls. The holder is alive through finish and the child `close` event has not completed there. Provider subprocess pressure cases use a 512 KiB state/error payload below the frozen state budget to actually saturate stdout.

The synthetic EOF execution marker is a **language-level accepted serial-work hazard model**, not OMP's queue implementation. A queued callback models work behind a blocked operation and an EOF handler models draining it. Installed-source evidence in the approved safety documents supplies the OMP premise; these tests do not execute installed OMP. EOF at the proxy-facing readable is produced with actual PassThrough `.end()`, independently of the deliberately retained main-child output socket.

Consumer evidence is native-Promise adversarial scheduling, not Effect/live-T3 or visual rendering equivalence. Existing same-batch cases remain; split cases now call `Consumer.parse()` separately with continuation opportunities. No consumer command-equality requirement, fake busy state, global replay buffer, Stop retry or hidden gesture ID was added. Same-gesture ambiguity, upstream text/image loss, display caps, finite expiry not acknowledgement and external lifecycle containment remain the supplied limitations, not excuses for these fixes.

## Exact verification commands and results

No LSP is configured (`lsp status`). Only ordinary synthetic Node processes ran; no heavy-gate-eligible runtime was launched.

### 1. Initial corrected component run

```sh
scratch=$(mktemp -d /tmp/ompt3-w22-focused-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/queue.test.js test/stop-owner.test.js test/doctor.test.js test/e2e.test.js test/settlement.test.js test/subagent.test.js test/approval.test.js test/usage.test.js test/parity.test.js test/model_catalog.test.js test/check-shell.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **268/268 pass**, zero skipped (`artifact://2`). This preceded the added explicit per-write byte limit, expanded pre/post destination matrix and provider saturation cases; it is not claimed as final-tree coverage.

### 2. Expanded focused attempt — fixture defects, not waived

```sh
scratch=$(mktemp -d /tmp/ompt3-w22-final-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/queue.test.js test/stop-owner.test.js test/doctor.test.js test/e2e.test.js test/settlement.test.js test/subagent.test.js test/approval.test.js test/usage.test.js test/parity.test.js test/model_catalog.test.js test/check-shell.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Tool deadline **200 seconds: timed out**, no successful shell exit claimed. Individual queue/doctor/embedding assertions printed passes, but the command is not green evidence. Two expanded owner fixtures failed: the stdout-EOF fixture also shut down the descendant-shared socket (invalid retained-pipe assertion), and the unread-provider release frame did not force saturation and left the fixture waiting. Corrected those fixtures without weakening assertions: separate proxy-facing PassThrough EOF and a 512 KiB release state/error payload. The existing 250 ms/actual-exit/holder assertions remain. No reported production/reviewer failure was rerun merely to reconfirm it. Timeout scratch remnants were removed; no throwaway source file remains.

### 3. Final corrected owner gate

```sh
scratch=$(mktemp -d /tmp/ompt3-w22-owner-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/stop-owner.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **22/22 pass**, zero failures/skips, 8.91 seconds wall time. Includes all 17 real-main modes, unconfirmed owner, and four actual provider-process exits. Child/holder cleanup runs after assertions, so cleanup kills cannot satisfy observed-exit proof.

### 4. Final remaining component gate

```sh
scratch=$(mktemp -d /tmp/ompt3-w22-components-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/queue.test.js test/doctor.test.js test/e2e.test.js test/settlement.test.js test/subagent.test.js test/approval.test.js test/usage.test.js test/parity.test.js test/model_catalog.test.js test/check-shell.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **270/270 pass**, zero failures/skips, 1.17 seconds wall time (`artifact://10`). This completes the same focused component set without duplicating the now-green owner gate. No tests/assertions were removed or disabled to obtain these results. Catalog/thinking, compaction, menus, approval, usage and native-child provenance checks are retained. Full routing/model-policy/launcher/union gates remain parent-owned after P4; no claim that this targeted set establishes their complete coverage.

## Owned files and accounting

W22 source: `src/queue.js`, `src/proxy.js`, `src/settlement.js`. Fixtures: `test/queue.test.js`, `test/stop-owner.test.js`, `test/doctor.test.js`, `test/e2e.test.js`, `test/approval.test.js`, `test/usage.test.js`, `test/parity.test.js`. Documentation: README Atomic Stop contract, repository AGENTS Lessons, corrected W07 receipt/matrix, this new report. Existing W07 doctor implementation and other fixture/source changes are retained, not discarded.

The W07 receipt now explicitly corrects rows 2/6–8/16/18–20 and its former broad consumer-guard claim. It distinguishes actual Consumer/process tests from wire classifiers and nominal `fail()` routing. No independent review PASS, live UI proof, arbitrary external-process containment, full gate success or red-tree commit is claimed. All concrete requested corrections are implemented; independent re-review and D16's parent P3+P4 checkpoint procedure remain separate work.
