# W08 — Stop protocol/consumer REVIEW-LOOP round 3

## Verdict: PASS — zero Fix, zero Replan, zero Discard

Independent original-scope protocol/consumer review of uncommitted W07/W22 plus W23 against authorization `bd3344c`, not merely a review of the latest correction. Authority: ledger P3/AC3/D06–D19, approved Stop plan review r2, pinned consumer oracle, original PR1–PR4, protocol review r2, owner review r2's OR1-R2/OR2-R2 and `selective-upstream-stop-fix-r2.md`. The prior protocol PASS was re-evaluated across the changed writer lifetime, not presumed permanent.

No new protocol/consumer defect found. PR1/PR2/PR4 remain closed; PR3=OR4 remains closed once. W23 corrects the reviewed ordinary-owner notification and asynchronous-completion seams at source/component level. Independent deep actual-process acceptance remains the owner reviewer's responsibility; this report does not substitute for that verdict or the parent's joint gates.

Only this new report was written. No implementation, tests, existing docs, ledger, AGENTS or commits changed. No subagents, browser, installed OMP/T3, gh, providers or external user-state inspection/execution. LSP reported no configured servers. No broad suite or reported failure was rerun.

## Completion ownership and original lifecycle

- `src/proxy.js:58–102` keeps one actual client writer. `write(line, completed)` carries Node's completion callback; write admission is not settlement. All tracker batches, doctor notices/synthesis, native-child card prefixes and ordinary downstream output still enter `outputRecords`/`StopController.output`.
- `src/settlement.js:74–119,193–386,426–432` preserves the producer seam: idle abort, active agent-end prefix/terminal suffix, translated/raw settlement, fallback, local prompt response/terminal and doctor synthesis all reach the gate. Nonterminal prefixes remain prompt. No terminal producer acquired a direct-write bypass.
- `src/queue.js:54–64,252–283` captures the owning transaction for each admitted write. Release seals only after admitting retained records in original state/terminal order. Retirement and retained-terminal bookkeeping require successful completion of all transaction-owned writes, not `write(true)` or terminal `_write` entry. Callback error fails the still-owned Stop; fatal/disposed/identity guards prevent stale callbacks from reviving it.
- `src/queue.js:235–239,257–265` captures prompt generation for ordinary and retained-terminal completion. An accepted new prompt can forward after old output admission; successful old completion cannot settle/stop its doctor or clear its hold-open interval. Old failed output nevertheless remains process-owned until completion. There is no hidden user-input queue, retry, adapter replay or new output replay queue.
- `src/queue.js:101–115,144–159,252–256` makes another Stop during pending delivery an explicit overlap, not a second follower or a stale completed-clear association. Completed mutations admit the old retained output before forwarding. Unresolved mutation attempts still invalidate follower eligibility and reject before tracker reset, provenance disarm or child writes.
- `src/proxy.js:45–56,339–351` now calls the mandatory process owner for ordinary unrecoverable transport failure before retiring readers. Active Stop failure still uses its correlated failure path. Source owner behavior remains direct-child SIGKILL before delayed pipe closure, actual `exit` observation, fixed 250 ms nonzero finish, no inherited/global group signal, TERM grace, retry or restart (`368–383`).

### Deadlines, closure and storage

The 1,000 ms acceptance-origin restore timer is unchanged. Successful restore establishes the existing 500 ms fence; release does not renew it (`queue.js:181–195`). Pending release at that deadline fails closed. Missing-follower expiry diagnoses non-acknowledgement, starts ordered release and allows only a zero-delay observation turn for already-scheduled completion, not another drain grace. Saved callbacks capture transaction identity.

Real callback error, actual output destruction, disposal and never-ack completion are represented in `test/queue.test.js:848–917`. Successful state completion followed by retained terminal completion distinguishes `_write` entry from successful delivery. New-prompt error/success branches retain old failure ownership while suppressing new-turn bookkeeping; saved deadlines cannot fail a subsequent transaction. Earlier synchronous false/throw/closed-output, actual readable error, child-pressure and admission-cap regressions remain (`755–846`).

Frozen bounds remain: one transaction/follower/normalized terminal, terminal source at most 16 KiB, at most 16 retained state frames totaling 1 MiB, restore frame at most 1 MiB, UTF-8 JSON plus LF; Stop-owned client/child queued-plus-proposed writes at most 1 MiB. Callback tracking is a counter on the transaction, not an unbounded waiter/output list. Duplicate terminals coalesce; unrelated output is not copied into a global retention queue. Overflow is explicit failure, never truncation, eviction or fabricated success.

## Original protocol findings and consumer oracle

| Obligation | Round-three disposition |
| --- | --- |
| PR1 early follower | Existing active-turn recovered-text notify still precedes early clear/follower responses and retained finalizing output (`queue.js:196–213`). The Consumer regression still observes text before active-turn nulling (`queue.test.js:665–680`). Early follower is not called notice acknowledgement. |
| PR2 state destination | Private atomic ownership remains first and strict. Exact string state-ID destination routing precedes catalog/command/doctor/settlement adapters (`proxy.js:244–250`), including missing/wrong recognized commands. Ordinary projection precedes the gate; original command, ID, outcome and error survive. Destination entries retire on response and failure/disposal. |
| PR3 / OR4 isolation | Doctor regression constructs its controlled-version, issue-disabled doctor inside the scratch-state helper; Promise cleanup preserves that state lifetime. Synthetic pipeline embeddings inject inert doctors. No ambient doctor construction was needed for this review's probe. |
| PR4 required evidence | Same-batch adversarial parsing, genuinely separate parses with continuation opportunities, same-ID object replacement/absence at the notice permit, permissive matched outcomes, completed-fence traffic and completed-clear disposal remain present (`queue.test.js:125–202,605–753`). The synchronous sink's callback acknowledgement does not remove or relax these assertions. |

The classifier still uses literal activity `true` or any finite nonzero pending count, including negative/fractional values. Invalid/missing counts default to potentially idle; nonliteral success remains separately failure-sensitive. Existing pending aliases are not overwritten, projection-induced busy results pass, and no Stop sentinel or fabricated busy response exists. State correlation remains at most 16 exact string IDs / 16 KiB UTF-8; numeric/null/absent IDs are not coerced into Consumer waiters. Private namespace collisions, exact atomic command/type/ID ownership and retired replies remain separate from public waiter correlation.

The Consumer still matches exact string ID without command equality, serializes its notice permit, checks clear-notice active-turn object identity and models pre-activity failure versus final post-activity transport termination separately. Lower post-activity failures retain their 100 ms probe retry, not a Stop retry. Turn/generation/activity/compaction guards remain. Its ordinary fixture now explicitly acknowledges a controlled synchronous sink (`queue.test.js:24–41`); genuine Node Writables are independently injected for actual asynchronous completion/error/closure cases. This is not a callback-count substitute for real Writable failure proof.

Native-Promise batch/permit scheduling is adversarial component evidence, not Effect-fiber scheduling equivalence, live T3 execution or visual rendering proof.

## Independent narrow verification

One finite no-file Node probe, exit **0**, reused only the pre-test `fixture` definitions from `test/queue.test.js`, injected genuine Node Writables and inert doctors, and ran inside newly created scratch HOME/XDG state/config/cache directories removed by shell trap. It did not invoke a test suite or duplicate the reported component/owner gates. Observed output:

```json
{"uncoveredCompletionScenarios":3,"result":"PASS"}
```

Previously unobserved combinations exercised once:

1. **Ordinary successful terminal callback after a replacement prompt:** retained the real terminal `_write` callback, admitted a new prompt and its background hold-open notice, then completed the old terminal. Settlement remained zero; the new doctor's stop counter remained zero; a repeated pending-work signal did not emit another notice, demonstrating that old completion had not cleared the replacement hold-open signature.
2. **Follower at 499 ms, additional Stop and accepted prompt while release is pending:** retained a real state callback before the terminal. The additional abort received `STOP_IN_PROGRESS`, with only one atomic request. The new prompt forwarded after retained terminal admission. Advancing the original clock by one millisecond caused exactly one fatal owner request and no settlement; later successful state completion could not reverse failure. The late follower did not renew the fence.
3. **Missing follower with never-ack release:** no failure at 499 ms; expiry began release into a retained real state callback, then failed within that deadline's zero-delay observation turn, without clean settlement or another 500 ms allowance.

Existing real-Writable component cases and actual-main/provider fixture source were also inspected statically. `test/stop-owner.test.js:51–181,200–285` retains actual SIGKILL/exit-before-finish, kill-before-EOF, retained-pipe and non-reading-output assertions, including async retained-state error and never-ack modes. Deep process-proof execution was not duplicated here.

## Preservation and gate accounting

W23's **277 component passes** and final **33/33 owner passes** are attributed implementation evidence, not reviewer executions or a full-project PASS. Its failed expanded fixture attempt and subsequent setup correction remain historical evidence; this review does not erase them. Parent's known **323/324 legacy launcher failure** remains ground truth, not rerun, excused or waived. D16's actual P4 migration and full outer-scratch project/diagnostic gates remain required before the joint green checkpoint.

No routing/launcher/model-policy/CLI/bin/catalog implementation change was made by this Stop correction. Original native-child sweep/provenance, rejected-prompt disarm prevention, accepted plain-prompt disarm and unrelated catalog/menu/approval/usage behavior remain represented by the retained implementation and fixtures; no broad preservation gate is claimed here.

D06 limitations remain unchanged: no shared gesture identity, irrecoverable upstream text/image loss, T3 display truncation/empty-text omission, finite expiry not consumption acknowledgement, and non-universal external lifecycle provenance/containment. None excuses a concrete output-loss, teardown, cap or consumer-ordering defect. No Discard, scope shrink, new accepted risk or architecture substitution.

**Round-three protocol accounting: zero open Fix, zero Replan, zero Discard. Independent owner verdict and parent joint green gates remain separate obligations.**
