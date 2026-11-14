# W08 — Stop protocol/consumer REVIEW-LOOP round 2

## Verdict: PASS — zero Fix, zero Replan

Independent original-scope review of uncommitted W07 plus W22, against authorization `bd3344c` and catalog checkpoint `eac8480`. Reviewed P3/AC3 and ledger D06–D17, the original acceptance matrix, approved Stop plan review r2, pinned independent consumer oracle, both complete round-one reports, W22's corrective receipt and the corrected W07 implementation receipt. This is not a diff-only acceptance.

PR1, PR2 and PR4 are closed on source and behavioral-fixture evidence. PR3 is closed with OR4, not counted twice. OR1–OR3's protocol/transport seams and fixture isolation are corrected. The separate owner reviewer retains the deep actual-process-proof verdict; this report does not substitute for that review or the parent's D16 gates.

No Discards, new accepted risks, architecture changes or missing-proof waivers. D06 freezes architecture, not concrete defects.

## Review cut and execution

Read the complete Stop controller and proxy pipeline/owner, settlement lifecycle and explicit output-record seam, changed doctor lifetime handling, full queue Consumer/regressions, owner fixtures, doctor isolation, changed embedding/e2e assertions, README Atomic Stop contract and implementation accounting. Inspected tracked changes against `bd3344c`; read new queue/fixture files directly rather than assuming tracked diff includes them. No language server is configured.

Only this new report was written. No implementation/test/README/AGENTS/ledger changes, commits, subagents, installed OMP/T3, gh, provider, browser or external user-state inspection. No legacy probe-interrupt test or broad suite was run. The reported final gates are **270/270 remaining component tests and 22/22 owner tests, separately exit 0**, not a new reviewer execution and not a full-project gate. The earlier timed-out expanded attempt remains failed/incomplete historical evidence, not a pass.

One additional finite no-file Node probe addressed uncovered state-association bookkeeping edges, under newly created scratch HOME/XDG directories removed by shell trap. It reused only the pre-test synthetic `fixture` definition, not production doctor construction, real OMP or a test-suite invocation. Observed exit 0:

```json
{"uncoveredStateAssociationScenarios":2,"result":"PASS"}
```

The scenarios established:

1. Exactly 16 KiB UTF-8 of state ID is admitted outside Stop; another ID receives `STATE_REQUEST_LIMIT` without child forwarding or fatal teardown. A response mislabeled `get_commands` preserves that command and ordinary pending-count projection, retires capacity, and permits a replacement request.
2. Duplicate outstanding state IDs occupy one destination entry, matching the one-key waiter model rather than creating a hidden waiter queue. Response retirement permits reuse of that ID. The reused ID's failed response mislabeled `get_available_models` is fenced during Stop, then released with original error; disposal leaves count/bytes zero.

This does not promise distinction between multiple consumers deliberately sharing one live RPC ID. The pinned client allocates unique string IDs and removes its matching waiter on the first response. No additional response-history/tombstone map is needed or claimed.

## Round-one finding closure

| Finding | Independent disposition and evidence |
| --- | --- |
| **PR1: early follower loses recovered text** | **Closed.** `src/queue.js:175–188` emits the existing active-turn text notify for an early follower before clear/follower responses and retained finalizing output. `test/queue.test.js:659–674` drives the real pipeline through string-ID Consumer waiters/notice permit with a pre-issued failed probe and held idle terminal. It observes recovered text, notice first and subsequent active-turn nulling. The later awaited abort is completed as a fresh synthetic atomic operation, not hidden. Gesture ambiguity is not used as a loss waiver; early follower is not described as consumption acknowledgement. |
| **PR2: response command mistaken for waiter destination** | **Closed.** Exact string state IDs register at admission, including before Stop (`queue.js:123–132`). The proxy's matched-destination branch precedes catalog, command, doctor, settlement and subagent adapters (`proxy.js:235–242`), while private atomic interception remains first and strict. All 32 command/outcome/position/activity cases at `queue.test.js:599–624` retain matched failures/idle results and consume notice before actual finalization or final post-activity termination. Wrong recognized catalog/command labels cannot consume the frame first. Projection-induced busy wrong-command results and unrelated errors remain prompt. |
| **PR3 / OR4: nonhermetic doctor regression/embeddings** | **Closed once.** Real retired-watchdog construction is inside the temporary-state helper with controlled version and `issuesEnabled:false`; the helper retains state through Promise completion (`doctor.test.js:10–28,154–175`). Changed e2e/approval/usage/parity fixtures inject inert doctors; queue/owner/catalog/check-shell embeddings also supply controlled doctors. Production issue/version discovery is not required to exercise these synthetic paths. Outer scratch isolation is additional defense, not the test's sole protection. |
| **PR4: over-accounted consumer/lifecycle proof** | **Closed.** Separate parses with continuation opportunities now occur in the main split arm and the failed-probe split cases (`queue.test.js:132–142,693–706`). The blocked clear-notice permit cases replace the active object with a same-ID object or remove it, and suppress the old notice (`677–691`). Completed-clear disposal retains the existing single success, requests fatal ownership once, discards the held terminal and makes the saved timer inert (`738–747`). Matched null/scalar/malformed data and nonliteral success use actual Consumer waiter branches (`708–723`), and completed-fence unrelated error/tool/approval frames pass before follower (`725–736`). Corrected receipt distinguishes representative Consumer proof from wire classification and process proof. |

## Exact consumer oracle

The fixture and classifier agree with the pinned source-derived contract on the tested JSON surface:

- Only literal `true` streaming/compacting activity proves activity. A finite **nonzero** pending count proves busy, including negative and fractional values; no positivity/truthiness substitution.
- Missing/null/scalar data and invalid/missing counts can be idle. Existing null/string aliases are not overwritten. Shared ordinary queued-count/async-work projection runs before classification, including a matched response with the wrong recognized command.
- Literal `success:true` resolves a waiter with its actual data. Nonliteral success remains failure-sensitive even when its data looks busy. The original command, exact external ID, outcome and error survive; no successful-busy fabrication or Stop sentinel.
- RPC waiter matching is exact **string ID**, not command equality. Numeric/null/absent IDs do not acquire string destination entries. Private atomic ownership separately requires the exact private string ID, response type and atomic command; wrong private command fails closed, and retired private replies cannot resolve newer work.
- Eligible pre-activity failure directly finalizes. Final post-activity failure records transport termination without directly nulling the active turn; lower post-activity failure retains its 100 ms retry rather than retrying Stop. Turn/generation/activity/compaction guards remain represented.
- The awaited clear notice checks active-turn **object identity** at permit acquisition, not just turn-ID equality. Finalization is active-turn nulling, not later visible status rendering.

The Consumer uses native Promises as an adversarial ordered-batch/permit schedule. It is not Effect-fiber equivalence, installed T3 execution or visual rendering proof. The receipts now make that boundary explicit. Same-batch and genuine split evidence are complementary, not relabeled equivalents.

## Original full P3 lifecycle and bounds

### Admission, correlation and fidelity

One transaction and one eligible follower; explicit request objects preserve absent/null/zero/string ID forms independently. A random private namespace rejects client collisions before forwarding. Overlap is an explicit rejection, not another queue. Every mutating attempt invalidates follower eligibility; unresolved mutation rejects before tracker reset, provenance disarm or child write. Completed mutation releases/retires the old fence before forwarding; later abort is fresh.

State destination bookkeeping is a bounded Set plus byte count, not a response-wide map, expiring cache, waiter array or hidden replay queue. Limit: 16 outstanding string IDs / 16 KiB raw UTF-8 ID bytes. Outside Stop, overflow is explicit `STATE_REQUEST_LIMIT`; during Stop, overflow is fatal. Reply routing retires capacity even when the response is subsequently retained behind the fence; release does not re-run response adapters or bookkeeping. Failure/disposal clear the set and bytes. Duplicate live IDs do not allocate additional entries; retired IDs can be reused. Private-namespace collision rejection precedes state registration.

Restoration validates both arrays, every supported string/text-object item and loss flags rather than filtering malformed members. Text order, duplicates, whitespace, Unicode and empty values survive. Returned images imply text-only loss. Loss and lone-abort/early-follower text use notify independently of the doctor's issue ledger. Lone abort never fabricates clear success. Generic failure remains indeterminate after possible withdrawal, never an empty successful queue or replay.

### All emitters and lifecycle retirement

`outputRecords` separates nonterminal prefixes from terminal suffixes; every client output enters the same Stop writer. This includes synchronous upstream idle abort, active `agent_end` suffix, translated `session_settled`, raw settled, prompt-result fallback, local prompt response/settle and doctor synthesis. Prefix/card/tool traffic stays prompt. A single normalized aborted terminal coalesces duplicates and keeps its position relative to deferred states. Doctor settlement bookkeeping/hold-open cleanup occurs on emission, not retention.

Unsolicited `agent_start` during restoration preserves Stop intent. The accepted new-prompt boundary retires old ownership and suppresses old cycle-end/settled output before new-turn evidence. Captured transaction identities protect restore/follower callbacks; captured doctor-announcement identity protects an already-queued watchdog callback. No arbitrary external lifecycle provenance is invented.

Native-child sweep remains before the atomic write, once per accepted Stop; follower does not sweep twice. Rejected prompts do not disarm provenance cancellation; accepted plain prompts do. Existing fleet/unattributed/late-child e2e coverage remains, without a claim that arbitrary external tools or remote delegates are contained.

### Finite storage and liveness

The deadline is armed before cancellation: **1,000 ms from acceptance**, not atomic write, and unrelated traffic cannot reset it. Clear success transitions to a **500 ms** completed fence, not another restoration attempt. Expiry diagnoses incomplete handshake, releases ordered old output and retires the latch; it is not acknowledgement.

Retained storage remains one transaction/follower/normalized terminal, terminal source admission at **16 KiB**, at most **16** state frames totaling **1 MiB**, restore frame **1 MiB**, serialized UTF-8 plus LF. Exact/one-over and aggregate boundaries remain in the fixtures, including multibyte text. State and restore budgets are separate. Duplicate terminals do not accumulate payloads; sustained unrelated traffic is forwarded, not retained. Overflow fails explicitly, never evicts/truncates into success.

## Cross-seam owner/failure review

**OR1:** Both readline Interfaces and both readable inputs now have error handling. Real PassThrough error tests exercise the previously escaping seam, with one fatal handoff, correlated error and no clean terminal. Ordinary non-Stop readable errors diagnose and retire the pipeline explicitly; they are not swallowed by an uncaught-exception suppressor.

**OR2:** `release()` retains its transaction through every output write and checks fatal/identity before continuing or recording terminal emission. Closed/destroyed output, thrown writes and real Writable backpressure reach failure; the retained terminal is not emitted/bookkept after an earlier release failure. Clear/follower answered flags prevent duplicate answers. Completed-fence disposal has separate coverage rather than being inferred from unresolved disposal.

**OR3:** Cancellation, atomic and permitted read/control child writes share bounded admission during Stop. Proposed line plus queued writable bytes cannot exceed **1 MiB**; false writes fail immediately. The same bound covers client output through release and finite fatal diagnostics. Fatal handoff first requests the owner, then pauses/closes client admission; already-queued callbacks are fatal-guarded, so subsequent requests cannot generate an unbounded error stream. No retry/drain/replay queue is added.

The source owner immediately requests **direct-owned-child SIGKILL**, never an inherited/global group signal or TERM grace. It observes `exit`, not `killed`/`close`, and finishes nonzero at the fixed **250 ms** observation timer without waiting for output drain or descendant-held pipes. Unconfirmed exit is diagnosed honestly. The expanded owner fixture source represents active Stop, the previously missing transport/release/input paths, retained holders and actual pressure; deep execution-proof acceptance belongs to the other reviewer. The receipt correctly distinguishes its language-level accepted-work/EOF model from OMP queue implementation and its qualified elapsed observations from hard-real-time guarantees.

## Preservation and checkpoint accounting

Catalog/thinking pruning, role/model/thinking selection, opt-in policy, offline compatibility, command/skill menus, version/install/update and routing/launcher implementations are not changed by the Stop slice. Matched-state destination routing intentionally precedes those adapters; ordinary unrelated traffic still follows the existing adapters. Changed embedding assertions migrate atomic responses and mandatory owners, not weaker catalog/native-child contracts. The targeted reported component gate includes settlement/compaction, subagents/provenance, approvals, usage, parity, catalogs and shell safety; it is not complete routing/model-policy/launcher coverage.

D16's legacy launcher failure remains ground truth, not rerun or waived. The parent must complete reviewed P4 migration, independent owner/routing/union review and full outer-scratch project/diagnostic gates before the joint green checkpoint. This PASS closes the protocol/consumer review scope, not those separate obligations.

Accepted limitations remain exactly the supplied ones: absent shared gesture identity, irreversible upstream text/image loss, T3 display truncation/empty-text omission, finite expiry not acknowledgement under stalls, and non-universal external provenance/containment. None is used to excuse a concrete loss, escaping probe, unsafe teardown or missing required consumer evidence.

**Round-two accounting: zero open protocol/consumer Fix, zero Replan, zero Discard; PR1/PR2/PR4 closed, PR3=OR4 closed.**
