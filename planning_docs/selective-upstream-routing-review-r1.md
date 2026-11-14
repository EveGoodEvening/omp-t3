# W10 — Independent P4 implementation REVIEW-LOOP r1

## Verdict: FIX — three concrete findings

Two High findings and one Medium finding. Zero Replan, zero Discard. P4 is not independently converged; D16/G1 remains open. No acceptance reduction or new feature is requested.

Reviewed the uncommitted joint P3+P4 tree against `bd3344c`, with catalog checkpoint `eac8480`; ledger P4/AC4/D10/D16/D20; the complete routing-plan review; W15 installed-tool proof; W09 implementation receipt and its unchanged-generated-file installed-loader reproduction. Inspected full CLI, generated policy, launcher and proxy startup integration, relevant pipeline ordering, affected routing/launcher/model/cap fixtures, bridge adaptation and documentation. The findings below are independent production-launcher observations, not receipt-only objections.

Only this new review document is repository output. No implementation, tests, ledger, README, AGENTS, commits or subagents were changed. No installed OMP, T3, provider, gh, user-state access, browser or heavy runtime was used. No broad suite, parent gate, or historical 323/324 failure was rerun.

## Findings

### RR1 — High / Fix: exiting without acknowledgement cancels the only startup bound before pipes drain

**Locations:** `src/proxy.js:434–452,473–476`.

The direct child's `exit` clears `hookTimer` unconditionally. Missing-registration refusal then waits for ChildProcess `close`, which waits for inherited stdio handles. A child that exits without acknowledgement while a descendant retains stdout/fd 3 therefore leaves the launcher indefinitely waiting, without the promised ten-second refusal. An incomplete acknowledgement has the same lifetime problem. This is not fixed by `createProviderOwner`'s bounded failure path: that path is never entered.

**Independent observed reproduction:** a literal synthetic OMP launches one Node descendant with inherited stdout/stderr/fd 3, records both PIDs, and exits 7 without registering anything. After **10,600 ms**, the direct child is already reaped (`kill(pid,0)` fails), but the shim still has no exit, no output, and no diagnostic:

```json
{"mode":"retained-noack","exit":null,"mainAlive":false,"out":"","err":""}
```

The descendant's deliberately retained pipes last 30 seconds; the harness observes the failure before killing its own processes. No replacement OMP session is involved.

**Required correction:** keep a bounded post-exit acknowledgement-drain/refusal lifetime independent of `close`. Preserve the legitimate exit-before-ack-data ordering, but do not cancel the only bound until registration or terminal refusal has actually been decided. Retained unrelated descendant handles must not control launcher completion. Add deterministic no-ack/partial-ack retained-pipe coverage with observed direct-child exit before cleanup.

### RR2 — High / Fix: any generated policy file can acknowledge the required routing hook

**Locations:** `src/subagent_policy.js:105`; `src/proxy.js:409–445`; required-hook ownership passed as only a boolean in `bin/omp-t3:181–184`.

The acknowledgement is the same `guard-ready\n` for every generated hook. Every generated hook checks only the inherited fd environment variable, not whether it is the hook required for this launch. The parent accepts the first matching bytes and permanently opens RPC/output admission. Child-process ownership is established; required-extension identity is not.

**Independent observed reproduction:** generate a real policy-only file (`routingEnabled=false`) using the repository generator while policy is active. Pass that unchanged file as an earlier user extension in a new default-routing launch with model policy cleared. The earlier generated file reads the new empty policy environment, registers a nonblocking task handler, and emits the shared acknowledgement. Simulate the actual loader's permitted load-error-and-continue behavior by not loading the later required routing file. The production launcher forwards READY and admits a subsequent client `get_state` into the child despite no task guard:

```json
{"mode":"wrong-hook","exit":null,"mainAlive":true,"out":"{\"type\":\"ready\",\"protocolVersion\":1}\n","err":""}
```

Recorded child events include `requiredSkipped` for the actual required routing path, `taskBlocked:false`, the automatic subscription RPC, and the exact client `{"type":"get_state","id":"proof"}` RPC. The earlier extension is actual unchanged generated source, not a forged acknowledgement or malicious custom extension. The missing required load is the synthetic loader-failure boundary being tested, not an actual installed-loader claim.

This violates the approved distinction between filter failure with an established guard and load/registration failure without one. It also contradicts README's claimed refusal for a missing required hook.

**Required correction:** correlate acknowledgement to the specific required generated hook/contract selected for this launch, not merely to its child fd or a shared string. Another explicit generated extension must not acknowledge it or prematurely close its channel. Preserve one final child and pre-admission gating. Cover an earlier policy-only generated file plus a missing required routing file, as well as ordinary valid registration and duplicate/fragmented acknowledgement handling. This is extension identity correlation, not a request for a sandbox against malicious extensions.

### RR3 — Medium / Fix: ordinary signal termination is converted to successful shim exit

**Locations:** `src/proxy.js:458–480`; `test/launcher.test.js:25,141–147`.

When the child terminates by signal, `close` sends that signal to the shim. Its still-installed forwarding listener catches the signal instead of letting the shim terminate by it. Because `child.killed` is already true, forwarding does nothing. With no remaining active work the shim exits **0**, losing the child's signal. The current test installs a child SIGTERM handler that calls `process.exit(42)`, so it exercises numeric exit forwarding, not ordinary signal termination.

**Independent observed reproduction:** start the real shim with a literal synthetic OMP that executes the unchanged required generated hook, emits READY and waits on stdin. Do not install a child signal handler. SIGTERM the shim after READY. The direct child is reaped, but the parent observes:

```json
{"mode":"natural-signal","exit":{"code":0,"signal":null},"mainAlive":false}
```

This forwarding code predates P4; the issue remains in the sole-final-child contract that D16 explicitly requires P4/W10 to validate. It is not presented as a newly introduced line regression.

**Required correction:** retire the forwarding handler before mirroring the terminating signal, or otherwise preserve truthful signal/failure status. Retain the useful existing exit-42/unrelated-sibling assertions; add default signal-termination coverage rather than replacing them. No replacement child, cleanup-assisted termination or successful status is acceptable proof of interrupted launch.

## Independent executable evidence

One finite synthetic command completed in **12.10 s**, exit **0**. Its three scenarios intentionally report counterexamples rather than assert that broken behavior should pass. It ran `node` from a shell heredoc, created a fresh `/tmp/w10-r1-*` root, and executed the production `bin/omp-t3` as a subprocess. No permanent test was added.

Reproduction algorithm, including all behaviorally significant inputs:

1. For each scenario create separate scratch HOME/XDG config/cache/state and a rejecting `gh` executable. Child environment is an allowlist: scratch paths, PATH limited to scratch plus Node and `/usr/bin:/bin`, literal `OMP_PATH`, `PI_CONFIG_DIR=.omp`, `OMPT3_DELEGATE_TASKS=1`, both model-policy variables empty, and scenario/log paths. No inherited secrets/settings.
2. Write a Node-shebang executable at the literal `OMP_PATH`. It records `process.pid` to a scratch JSONL file. Launch `node <repo>/bin/omp-t3 --mode rpc` with three piped streams and retain stdin open. Collect stdout/stderr and the actual `exit(code,signal)` event.
3. **retained-noack:** fake OMP executes `spawn(process.execPath,['-e','setTimeout(()=>{},30000)'],{stdio:['ignore',1,2,3]})`, records that descendant PID, then `process.exit(7)`. Observe after 10,600 ms; check the recorded direct PID with `process.kill(pid,0)` before cleanup.
4. **natural-signal:** fake OMP enumerates split `--extension` argv entries and imports the actual generated file with `await import(file)`. Call its default export with `on:(name,handler)=>handlers.set(name,handler)`, `getActiveTools:()=>['read','task']`, and `setActiveTools:async()=>{}`. Record the native-task handler's block result; emit `JSON.stringify({type:'ready',protocolVersion:1})`; keep stdin flowing with a data logger. After the harness observes READY, SIGTERM the shim and observe its exit for 900 ms. No child signal override.
5. **wrong-hook:** before launching, set the generator's XDG cache to this scenario's scratch cache and call `subagentPolicyArgs(createSubagentPolicy({OMPT3_SUBAGENT_ALLOWED_MODELS:'allowed'}),false)[1]`. Supply that returned file via the user's `--extension` argv. Fake OMP imports/calls that unchanged file exactly as above, but records and skips the later required routing path (loader-error continuation). After READY the harness writes `{"type":"get_state","id":"proof"}\n` to the shim and observes child-side receipt for 150 ms. The launch environment still has both model-policy variables empty.
6. In `finally`, SIGKILL only recorded harness-owned shim/main/descendant processes still alive, await shim exit, and delete the scratch root. No process-group kill or unrelated sibling is used. All reported exit/reap/admission observations precede that cleanup.

Production source and actual generated files were not patched, transformed or mocked for these three probes. The fake loader/API is explicitly synthetic; it is sufficient to exercise acknowledgement provenance, process ordering and signal status, not installed OMP lifecycle semantics.

## Original-scope accounting

### Routing and inheritance: no additional finding

- `src/cli.js:81–82` captures original launch intent once, including any split/equals tools token; malformed/empty/missing explicit tools remain explicit. There is no later routing environment read. Role guidance remains intact; routing and model-policy activation are independent.
- All 12 intended combinations are covered behaviorally in `test/delegate-enforcement.test.js:15–45`, with separate nonzero environment, appendices/session/cap and malformed explicit-tools coverage. This review read those assertions; it did not rerun that file or claim a new 12-row runtime pass.
- Generated filtering uses the latest enabled selection, exact `task` removal, immediate invocation/await of the complete-set setter, and no setter when task is absent. All three lifecycle hooks share the same awaited function. Missing APIs/getter/synchronous setter/rejected setter failures diagnose without removing the ordinary task guard. The handler-map fixtures exercise these outcomes, deferred setters and later re-enablement.
- `src/delegate_models.js` and `src/extension_compat.js` are unchanged against `bd3344c`. The retained model consumer matrix covers roles/frontmatter/layers, aliases, caller options/clears, Pi/local scoping, opt-out, unavailable settings and session inheritance. Adapted MCP performs fill → check → send, including direct client calls; the generated hook returns the approved filled input.
- Native cap implementation/edge tests are retained; offline consumption, mode rewriting, caller appendices and session flags remain. Shell-safe `execFileSync` check invocation, package version/update/URL ownership and adapted extension identity are preserved. No removed launch aliases or default-list/probe/fallback machinery remain in `src`, `bin` or tests.

### Actual installed proof: credible and correctly bounded, not launcher proof

W15 uses unchanged installed SessionTools/runner/startup/loader/xdev components under outer heavy-gate → unshare → env -i → bwrap. It demonstrates stable membership/partition/docs and real complete-selection race/mount-drift counterexamples. D10 honestly accepts that external API limit; it does not promise quiescence or universal preservation.

W09's reproduction generates the source with the repository generator and loads that same file through installed explicit-only discovery under `--no-extensions`. Its fixture does not rewrite the extension or copy get/set partition logic, and it checks fd-3 bytes, exact enabled/top/mounted sets, listing/docs, absent/no-write and later guard behavior. Its structural host/session doubles, injected tree event and synthetic registry entries are disclosed. No full installed CLI, actual provider, actual plugin/MCP transport, disk-backed restoration or live full-T3 claim is established. The receipt records removal of its scratch files, so this review assesses the included reproduction and attributed observations rather than claiming an independently rerun installed proof.

That installed evidence cannot close RR1–RR3: the production `spawnAndProxy` handshake/lifetime/signal integration is outside its runner/API harness.

### Launcher and joint P3 boundary

The obsolete probe algorithm and probe-specific test were removed together, not waived. The replacement launcher fixture proves single final launch, readiness after 1100 ms, unchanged invalid argv/natural exit 2, numeric startup exit 7, bounded spawn error, zero-child cache/active-bridge refusal, adaptation before launch, and the handled-signal exit-42/sibling case according to its source and attributed W09 results. Its omission of retained pipe ownership, required-hook identity and ordinary signal termination explains the independent counterexamples above.

The new startup path still constructs the mandatory direct-process owner and the existing proxy pipeline, passes `onFatalStop:owner.fail`, and uses the existing single output/admission path after accepted acknowledgement. Catalog dispatch remains behind state-destination correlation and ahead of unrelated adapters. Stop queue/controller, settlement/owner regression corpus and consumer evidence were not deleted by routing. The findings concern the newly inserted startup boundary and retained final-child signal completion; they do not reopen the accepted Stop algorithm or reinterpret its prior reviews as live-T3 proof.

Partial fd-3 chunks accumulate until the exact marker or invalid-length failure; live missing/EOF registration is bounded by the timer while the direct child remains alive. Pre-ack stdout is paused, so large startup output can exert backpressure; this review makes no successful-large-output runtime claim. Those observations do not rescue the demonstrated exit/retained-pipe cancellation of the bound or false admission by a different generated hook.

Parent owns the full isolated `npm test` and actual isolated npm diagnostic. This review neither duplicates nor predicts their results. Passing those gates does not erase these new counterexamples. Correct RR1–RR3, retain all original P4 and joint owner/consumer obligations, then perform original-scope re-review. **Accounting: 3 open Fix, 0 Replan, 0 Discard; no cosmetic/new-feature requests.**
