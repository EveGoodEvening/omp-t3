# W08 — Stop protocol/consumer REVIEW-LOOP round 1

## Verdict: FIX — 4 Fix, 0 Replan

Independent review of W07's current uncommitted implementation against `bd3344c` / catalog checkpoint `eac8480`. Authority: ledger P3/AC3, D06–D09/D14–D15; initial Stop review's required matrix; approved review-r2; pinned independent consumer oracle. The implementation receipt is accounting, not proof of acceptance.

Reviewed `src/queue.js`, `src/proxy.js`, `src/settlement.js`, changed doctor behavior, new queue/owner fixtures, changed embedding/doctor/e2e test portions, README and implementation accounting. Tracked changes were inspected against `bd3344c`; new queue/test/receipt files were read directly (they are not included by ordinary `git diff` before staging). Process-owner review remains independently assigned; this review makes no owner-safety PASS claim.

No code, tests, existing docs, ledger, AGENTS, or commits changed. Only this new file was written. No delegates, installed OMP, gh, provider, browser, credentials, or real user-state access was used for runtime evidence. No broad suite or parent's ongoing union/check gate was duplicated.

## PR1 — High / Fix: an early follower releases finalization before clear consumption

**Paths:** `src/queue.js:174–179,215–226`; `test/queue.test.js:56–117,378–390`.

The early-follower branch emits clear success, follower success and the held terminal synchronously, then retires the transaction. Unlike the ordinary awaited follower, the early follower does not establish that the clear continuation acquired the notice permit. The existing early-follower test checks sweep/write/response counts, not consumption while active.

**Observed counterexample using the existing real-pipeline fixture and unchanged adversarial Consumer:**

1. `Consumer.stop()` requests clear; before atomic success, send an independent `abort` (`early-abort`). This is admitted as the one early follower.
2. Deliver atomic success containing `steering:['recover me']` to an idle Stop (its synchronous terminal is already held).
3. Parse the entire available output batch before Promise continuations, as the required consumer schedule permits.
4. The terminal obtains the permit before the awaited clear continuation's notice. The active turn is cleared and the text notice is discarded.

Observed output:

```json
{"case":"early-follower","events":["finalize"],"notices":[],"atomicRequests":2}
```

The second atomic request is the ordinary awaited abort arriving after retirement; it is **not a separate finding** because independent same-generation gesture association is an accepted D06 ambiguity. The lost recovered-text notice is the finding. Accepting that ambiguity does not waive the early-follower required matrix's notice-before-finalization obligation.

**Required correction/evidence:** preserve active-turn text observability in the early-follower release path within the frozen bounded design (the existing notify channel is available). Add an early-follower consumer regression, including held finalizing probes, which observes the recovered text before `activeTurn = null`, not just clear/abort wire ordering. Do not solve this with a global output queue, retry, fake busy state or fabricated clear.

## PR2 — High / Fix: state fencing trusts response command, but T3 waiter matching does not

**Paths:** `src/queue.js:205–210`; `src/proxy.js:124–131,205–210,289–290`; `test/queue.test.js:99–117,119–145`. Oracle §3 explicitly records string-ID-only waiter matching with **no command-equality requirement**.

The fence recognizes a state result only through `frame.command === 'get_state'`. No upstream request identity association catches a response that resolves an already-issued state waiter but has missing/wrong command. T3 still consumes such a string-ID response; nonliteral success enters the failure path. A pre-activity failure therefore finalizes during withdrawal, before any result/text/loss notice. The current Consumer already models this ID-only matching correctly, but all supplied probe records have the expected command.

**Observed counterexample:** issue `get_state` with string ID `probe`, start clear, then deliver:

```json
{"type":"response","id":"probe","success":false,"error":"probe failed without command"}
```

Before delivering atomic success:

```json
{"case":"missing-command-probe-before-restore","events":["finalize"],"activeTurn":null}
```

Delivering successful restoration of `recover me` afterward produces:

```json
{"case":"missing-command-probe-after-restore","events":["finalize"],"notices":[]}
```

**Required correction/evidence:** account for actual state-request/waiter identity rather than assuming the response command authenticates its consumer destination; preserve the bounded, selective barrier. Cover missing and wrong command with matched string probe IDs, failed and successful-idle outcomes, on both sides of atomic success. Preserve prompt unrelated failures and exact external IDs. Do not weaken the Consumer into matching by command: that would contradict the pinned oracle. Private atomic command validation is correctly separate and must remain strict.

## PR3 — Medium / Fix: the new doctor regression is not independently hermetic

**Paths:** `test/doctor.test.js:154–174`; `src/doctor.js:19–28,48–54`.

The new retired-watchdog test constructs `ContractDoctor` outside `withTempStateHome`, unlike the preceding doctor tests. Its constructor immediately reads the ambient `XDG_STATE_HOME`/HOME contract-state file. `issuesEnabled:false` prevents issue creation, not that read. The parent's outer scratch gate protects that invocation only; it does not make the committed test hermetic under ordinary `npm test` or a focused test command.

**Required correction:** put the new test inside the existing temporary-state helper, preserving its async lifetime rule if the test becomes asynchronous. Assert no user-state access by construction; do not inspect or repair external user state. This is a static finding: no real state read/write or gh invocation was executed to demonstrate it. The implementation receipt properly discloses the earlier inherited-HOME uncertainty; that disclosure does not isolate the new test.

## PR4 — Medium / Fix: required consumer/lifecycle evidence is over-accounted

**Paths:** `test/queue.test.js:119–145,239–270,392–405,420–440,486–499`; implementation receipt matrix rows 6–8 and 19 / concluding consumer-guard claim.

Concrete missing acceptance coverage, independent of PR1/PR2:

- **Split delivery:** the `split` arm calls three synchronous `receive()` writes, then invokes `consumer.parse()` only once. The consumer sees one combined batch with no clear continuation/event-pump boundary between those writes. Keep the adversarial same-batch case, but add actual separate consumer parses with continuation opportunities between delivered batches, including failed pre-activity and final post-activity probes.
- **Notice object identity:** the guard tests change provider turn ID, probe generation, activity or compaction for a probe. None replaces the active-turn object while retaining its ID between clear resolution and notice-permit acquisition. A broken ID-only clear-notice guard would pass the current suite. Exercise replacement and absence of an active turn at the actual notice boundary, not merely the presence of an identity check in fixture source.
- **Completed-fence disposal:** the disposal mode closes while restoration is unresolved. It does not dispose after clear success while terminal/state frames are held for a missing follower. Verify no duplicate clear response, held clean settlement discarded, correct owner handoff and inert saved follower callback at this second lifetime boundary.
- **Exact permissive consumer outcomes:** scalar/null/malformed data and nonliteral-success cases mostly assert wire retention/release, without driving their matched string-ID Consumer waiter through the actual idle versus failure branches. The normal consumer matrix uses `{}` or literal failed success only. Extend a representative malformed-data/nonliteral-success set through that Consumer and assert notice while the original turn is active; otherwise these are classifier wire tests, not the claimed end-to-end permissive-consumer proof.
- **Prompt traffic during the completed fence:** projected-busy/unrelated-failure/stream/tool/approval passthrough is tested together only during restoration. Negative/fractional state counts and tree reads separately cover both phases, but do not establish the other required completed-fence traffic paths. Exercise representative unrelated failure and tool/approval traffic after clear success and before the follower.

These are requiredmatrix Fixes, not requests for live T3, exhaustive schema enumeration, Effect equivalence, broader suites, new architecture or source-text tests. Consumer-visible assertions should distinguish correct versus incorrect eligibility/order/cleanup. Correct receipt claims when updating the evidence.

## Evidence that does hold under static review

- Private namespace is random per pipeline; upstream collisions are rejected; exact private ID/type/atomic command is required; retired private replies cannot complete newer work. Original Stop response ID presence/types and command are preserved.
- Mutation admission precedes tracker reset, native-child disarm and child writes. An unresolved mutation attempt invalidates follower eligibility without accepting/replaying the mutation. Completed mutations release/retire before forwarding.
- Ordinary pending-count projection runs before the Stop writer. The classifier matches literal activity / finite nonzero count semantics, including negative and fractional numbers; invalid counts and nonliteral success are not invented busy states. PR2 concerns request destination, not this value predicate.
- Restored arrays/items are validated, not silently filtered. Text order, duplicates, empties and supported text objects survive; loss and lone-abort text use active-turn notify. No plain-abort fallback, fake sentinel, retry or shim input queue was added.
- Upstream idle, active-end suffix, translated/raw settled, fallback/local-command and doctor terminal output share the writer. Nonterminal prefixes remain immediate; doctor settlement bookkeeping/hold-open clearing moved to emission. Timer callbacks capture transaction/announcement identity. Limits and timer-origin code agree with D09; no unbounded deferred-state list or retired-ID set was introduced.
- Native-child sweep/provenance implementation remains existing behavior, with admission guarding rejected prompts. Catalog/thinking/role/opt-in/offline/menus/version implementation files were not changed in this slice; embedding tests migrate owner injection rather than weakening their catalog assertions.
- The Consumer uses exact string-ID waiters, async clear continuation and a serialized permit; pre-activity failure finalizes, final post-activity failure records transport termination, and lower failures schedule a 100 ms retry. It is explicitly a native-Promise adversarial schedule, **not Effect/live-T3 equivalence**. Those limits are honestly documented; they do not excuse the observed PR1/PR2 failures.

## Execution and accounting

One successful no-file counterexample script reused only the pre-test `fixture`/`Consumer` definitions from `test/queue.test.js` with synthetic streams and the injected doctor. It exercised the two previously unobserved races above and printed the exact records quoted. Harness setup required correcting fixture-relative module resolution; an intermediate invocation exited with no output because it awaited the newly created atomic follower without supplying its synthetic result. The corrected invocation observed the race before awaiting that request, then completed it synthetically. No observed failure was rerun for confirmation and no worker/parent-reported failure was duplicated.

No broad tests/checks were run; parent union/check results are outside this receipt. No claim of installed T3 scheduling, visual notice rendering, arbitrary external lifecycle attribution or process containment is made.

**Accounting:** PR1 High Fix; PR2 High Fix; PR3 Medium Fix; PR4 Medium required-evidence Fix. Zero Replan, zero Discard. No accepted-risk expansion. D06 architecture stays frozen; same-gesture ambiguity, irreversible upstream loss, T3 display cap, finite expiry not acknowledgement and non-universal lifecycle provenance remain accepted exactly as supplied. P3 is not protocol/consumer green until these findings and required evidence are resolved.
