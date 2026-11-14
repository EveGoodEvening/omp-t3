# W23 — Stop corrective implementation r2

## Scope and result

Corrected OR1-R2 and OR2-R2 within frozen P3/D06–D19, retaining W07/W22 and the protocol round-two PASS scope. Read ledger D06–D19/P3, complete owner/protocol round-two reviews, W22 receipt and approved Stop plan review r2. No subagents, commits, ledger/old-review changes, routing/launcher/model-policy/CLI/bin/catalog-source/package-URL changes. No installed OMP, provider service, T3, browser, real gh or external user-state execution/inspection. No heavy workload needed; LSP reports no configured servers.

Final focused evidence: **277 component passes** in the initial combined gate and **33/33 owner passes** in the final owner gate; zero skips/cancellations in either. The initial combined gate was 305/305 including the then-current 28 owner cases. The later expanded provider attempt failed two new fixture assertions; correction and exact results are preserved below. These are not full-project, independent-review, live-T3 or hard-real-time claims. D16's reported legacy launcher 323/324 failure was not rerun, patched, waived or hidden behind a broad suite. P4/full joint gates remain parent-owned.

## OR1-R2 — ordinary transport failure owns process shutdown

`src/proxy.js` ordinary `transportFailure` now latches ordinary failure, calls the existing mandatory process owner synchronously, then pauses input and disposes readers/doctor. It no longer merely closes readers behind a persistent main process. Ordinary failures do not fabricate Stop notices/correlated responses. Active Stop failures still use `StopController.fail`, preserving honest original request identities and already-answered flags. The process `error` handler also uses the owner rather than exiting without owner teardown.

The unchanged `createProviderOwner` requests direct-owned SIGKILL immediately, observes actual `exit`, and finishes nonzero at its existing 250 ms observation timer, without waiting on `close`, output callbacks or descendants. No EOF-first shutdown, TERM draining, global process-group signal, restart or input replay.

Actual-main fixtures add ordinary client-readable, child-readable, client-output and child-stdin errors before any Stop. Each uses a real persistent Node child, consuming stdin/EOF hazard model and indefinite descendant pipe holder. Assertions record detection < SIGKILL < actual SIGKILL exit < finish(1), SIGKILL before stdin destruction, holder alive and child `close` still pending at finish, no queued EOF marker and exactly one kill before test cleanup. Three added actual provider subprocess cases independently exit with code 1 on ordinary client/child-readable/output errors, leave the unrelated sibling alive and observe the holder alive through finish. Reader-only unit assertions now require one owner request, no further child admission and no invented Stop response.

## OR2-R2 — admission is not completion

The existing single client writer accepts an optional Node write-completion callback. `StopController` counts outstanding admitted output callbacks on the existing transaction, with captured transaction/disposal/fatal guards. Release admits the existing capped records in their original order, marks follower association ineligible and retains delivery ownership until all admitted writes complete successfully. It does not re-adapt/replay records or build a second/global output queue. A callback error fails Stop immediately; output stream error/close, false/throwing/closed writes and admission caps remain fatal.

Terminal `doctor.noteSettled()` and hold-open cleanup run only after successful terminal output completion (and, for a retained release, successful completion of all its admitted output). They do not run on `write(true)`, `_write` entry, retention or an earlier failed state. Ordinary terminal output uses a completion callback too. Completion cleanup captures prompt generation: an accepted new prompt still forwards after old output admission, but old callbacks cannot stop its doctor, clear its hold-open interval or record it settled. Old delivery nevertheless retains failure ownership if its callback later fails. Another Stop is an explicit overlap while this one delivery is pending, not a follower/new hidden waiter. Once completion retires it, a fresh Stop gets the ordinary fresh private transaction. No association survives a mutation attempt.

Restore remains **1,000 ms from acceptance**. Successful restoration arms the existing **500 ms fence**, which also bounds output completion; release never renews it. If missing-follower expiry itself starts release, a zero-delay observation turn permits already-scheduled completions, not a new grace/retry deadline. Still-unacknowledged output fails closed. Failure detection still requests immediate kill and the existing **250 ms** fatal-owner finish. No larger timeout, retry or unbounded drain wait was introduced.

All existing payload/storage/correlation bounds remain: one transaction/follower/terminal, terminal source <=16 KiB, <=16 retained state records totaling <=1 MiB, restore <=1 MiB, Stop-owned queued-plus-proposed write <=1 MiB; serialized frame bounds include UTF-8 plus LF. State destination correlation remains exact string IDs, <=16 / 16 KiB, before response adapters with original external command/ID/outcome preserved.

### Real completion proof

Seven component cases inject actual Node Writables with a 1 MiB high-water mark, retain the real state `_write` callback and observe admission without `writableNeedDrain`. State precedes the retained terminal. Before callback resolution, transaction delivery remains owned, settlement is zero and terminal has never entered `_write`.

- Retained callback asynchronously errors: one fatal owner request; terminal never enters `_write`; no clean bookkeeping or duplicate clear/follower.
- Actual output destruction: same failure ownership, no clean terminal.
- Never acknowledges: no failure at 499 ms, fatal at 500 ms on the deterministic clock; no renewed deadline.
- Successful state callback then retained terminal callback: terminal `_write` entry alone leaves settlement zero; successful terminal completion retires delivery and records settlement once.
- New prompt before retained callback error: prompt was forwarded, but old failed delivery still fails the owner; no clean bookkeeping.
- New prompt before successful terminal callback: old completion does not settle the new prompt; subsequent Stop and saved old deadline remain isolated.
- Disposal before callback error: one disposal failure, late callback/stream error/deadline inert, no clean bookkeeping.

Actual-main `release-async-error` and `release-never-ack` cases use the same real-callback mechanism with a 512 KiB retained state below the frozen cap. Both observe actual SIGKILL exit before cleanup, exit before finish(1), kill before EOF, retained holder alive/`close` pending, zero settlement and no terminal `_write`. Actual provider subprocess equivalents exit 1 while their external stdout remains unread, and persist markers proving state admission but neither terminal `_write` nor settlement. Provider async-failure output is an actual custom Writable; saturated native provider stdout remains separately exercised by the existing pressure cases.

The ordinary deterministic queue helper now explicitly acknowledges its synchronous sink. Real callback regressions inject genuine Node Writables instead; owner `write` wrappers forward completion callbacks. No existing Consumer state-ID/same-chunk/split/early-notice/native-child tests were removed, skipped or weakened. All passed in the component gate. Native-Promise Consumer scheduling remains adversarial evidence, not Effect/live-T3 equivalence. EOF execution marker remains a language-level accepted-work hazard model, not installed OMP queue execution.

## Exact verification history

Every command used fresh outer scratch HOME/XDG directories and removed them after completion. Pipeline fixtures inject inert doctors; real-doctor fixtures retain scratch lifetime and controlled versions with issues disabled. No real gh/installed OMP lookup was required. Shell command timeout values were tool observation bounds, not production timing changes.

### 1. Corrected source/component and initial owner gate

```sh
scratch=$(mktemp -d /tmp/ompt3-w23-focused-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/queue.test.js test/stop-owner.test.js test/doctor.test.js test/e2e.test.js test/settlement.test.js test/subagent.test.js test/approval.test.js test/usage.test.js test/parity.test.js test/model_catalog.test.js test/check-shell.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **305/305 pass**, zero failed/skipped/cancelled, 10,957.901443 ms Node duration (11.06 s wall). Partition: **277 components + 28 then-current owner cases**. Production source and component fixtures did not change afterward; later behavioral edits only expanded/corrected provider fixtures.

### 2. Expanded provider gate — failed fixture assertions

```sh
scratch=$(mktemp -d /tmp/ompt3-w23-owner-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/stop-owner.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **1**, **31 pass / 2 fail**, zero skips/cancellations, 13,182.995722 ms. Both new provider callback cases saw a terminal `_write` marker, failing the explicit absence assertion. The provider fixture had accepted Stop while idle, synthesizing a terminal at acceptance **before** the intended failed retained state. The actual-main fixture already established active state first. Corrected provider setup to establish active state before Stop, putting the held state before terminal; did not suppress the idle terminal producer, loosen assertions or change production ordering.

### 3. Corrected affected provider cases

```sh
scratch=$(mktemp -d /tmp/ompt3-w23-callback-owner-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test --test-name-pattern='provider subprocess.*release-(async-error|never-ack)' test/stop-owner.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **2/2 pass**, zero skips/cancellations, 1,338.478001 ms. This was post-correction proof, not a rerun to confirm a reported failure.

### 4. Final full focused owner gate

```sh
scratch=$(mktemp -d /tmp/ompt3-w23-owner-final-XXXXXX)
mkdir -p "$scratch/home" "$scratch/state" "$scratch/config" "$scratch/cache"
HOME="$scratch/home" XDG_STATE_HOME="$scratch/state" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" node --test test/stop-owner.test.js
result=$?; rm -rf "$scratch"; exit "$result"
```

Exit **0**, **33/33 pass**, zero failures/skips/cancellations, 13,110.815306 ms (13.16 s wall). Includes **23 actual-main modes, one unconfirmed-exit case and nine provider subprocess cases**. Actual-main fixtures request exactly 250 ms fatal observation and assert >=200 ms/<1,500 ms detection-to-finish under the observed scheduler; this is qualified elapsed evidence, not a hard <=250 ms wall-clock promise under arbitrary stalls. The never-ack modes also wait the unchanged 500 ms completion fence before failure detection. Cleanup kills occur only after the asserted observed exits/finish and cannot satisfy those proofs.

## Files and remaining acceptance boundary

W23 changed `src/proxy.js`, `src/queue.js`, `test/queue.test.js`, `test/stop-owner.test.js`, README, repository AGENTS lessons and W07 implementation accounting, plus this new receipt. No `src/settlement.js` edit was needed. Prior W22 receipt remains historical; this receipt and W07 accounting explicitly supersede its ordinary-retirement/full-flush conclusions. No old review or ledger edited.

No new accepted risk or architecture replacement is claimed. Existing external gesture ambiguity, irrecoverable upstream text/image loss, T3 notice caps, finite expiry not acknowledgement, arbitrary external provenance/containment limits remain unchanged and do not waive these defects. Independent original-scope re-review, actual P4 migration and the parent's full isolated joint gates are still required; this implementation receipt does not self-certify their acceptance.
