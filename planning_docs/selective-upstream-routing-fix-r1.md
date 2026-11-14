# W24 — registration, signal and catalog corrective implementation

## Scope and disposition

Implemented the four unique concrete Fix findings under AC1–6, reviewed P3/P4 and D10/D16/D21/D22. RR1 includes WP1/WA1; they are not separate fixes. Prior uncommitted Stop/routing work is preserved. No subagents, commits, branches, pushes, ledger/old-review edits, user-cache changes, provider calls, real RPC chat, external plugin/MCP/server changes or browser. LSP reported no configured servers. This receipt is implementation evidence, not independent review, full-project approval or G1/ledger closure.

| Finding | Correction and evidence |
| --- | --- |
| RR1 / WP1 / WA1 | Registration's original 10,000 ms deadline stays armed after direct-child `exit`; neither descendant-held stdout/fd3 nor `close` owns refusal liveness. Complete acknowledgement cancels it. Close-time judgment allows one event-loop turn for queued bytes without renewing the deadline. Missing/partial retained-pipe launcher regressions observe main exit, nonzero shim exit, no output/RPC admission and live unrelated sibling/holder before cleanup. Valid immediate registration/exit and deliberately exit-before-data delivery both preserve exit 7. |
| RR2 | Generated source embeds SHA-256 identity of its canonical source template; final source is independently content-addressed for the existing cache filename. Generator returns argv and `{file, identity}` together; CLI/bin pass the selected requirement to proxy, which expects that exact contract acknowledgement. New private `OMPT3_HOOK_REGISTRATION` replaces the old field; proxy deletes inherited old/new fields before setting the selected identity. Earlier real unchanged policy-only generated source cannot acknowledge the routing contract. Other generated sources do not close fd3. Legacy-field close hazard, correct required source, duplicate/fragmented delivery and existing routing/model matrices pass. No compatibility alias, second registration mechanism, cache migration or external plugin update. |
| RR3 | Proxy retains named owned forwarding callbacks and removes only those callbacks before mirroring child termination. Default SIGTERM and SIGHUP remain shim signal exits, not code 0; existing child-handled SIGTERM → exit 42 and natural numeric exits remain. One launch, main ESRCH and sibling survival precede cleanup. |
| WP2 | All generated catalog errors measure final UTF-8 JSON + LF, including original ID/type/escaping. Try original detail, short detail, empty detail, then an envelope without optional detail; preserve correlation whenever representable. If even the minimal correlated failure cannot fit, return an explicit fatal disposition to the existing mandatory owned-transport failure path. No oversized/uncorrelated pseudo-response, truncation, fallback catalog, unhandled throw or silent wait. Real upstream failures remain raw passthrough. Exact/near-limit legal long-ID successes, escaped/multibyte IDs and messages, minimal-envelope exact/one-over, pipeline retirement and actual-launcher owner termination pass. |

## Files

- `src/proxy.js`: registration deadline/contract matching/close-drain decision; owned signal-listener retirement; catalog fatal-result handoff to existing `transportFailure`. No Stop-controller/settlement/doctor/owner algorithm or bound changes.
- `src/subagent_policy.js`: embedded contract identity, final-source content-keyed cache, generator result carrying argv plus selected requirement.
- `src/cli.js`, `bin/omp-t3`: migrate selected requirement end to end, not a boolean.
- `src/model_catalog.js`: bounded correlated error serialization and explicit unrepresentable-envelope disposition.
- `test/launcher.test.js`: actual production-entrypoint process regressions, delivery-order instrumentation, earlier actual generated source, legacy channel-consumer hazard, signal and catalog owner cases; timestamps/reaping/sibling/holder observations before cleanup.
- `test/model_catalog.test.js`: ID/error-envelope UTF-8 boundaries, minimal representability and fatal pipeline retirement.
- `test/subagent_policy.test.js`, `test/delegate_models.test.js`: migrate generator result consumers; retain behavioral matrices. `test/generated-hook.js` was temporarily adapted for the rejected import-meta implementation, then restored to its original ESM-only VM adapter.
- `README.md`: permanent launch/catalog contracts and Unreleased; repository `AGENTS.md`: reusable loader/registration/signal/error-budget lessons.
- This receipt. No ledger or earlier receipt/review rewritten.

## Verification commands and results

All synthetic test commands used this exact allowlisted outer environment, a fresh scratch root per invocation, and removed it afterward:

```sh
S=$(mktemp -d /tmp/omp-w24-tests-XXXXXX)
trap 'rm -rf -- "$S"' EXIT
env -i PATH="$PATH" HOME="$S/home" XDG_CONFIG_HOME="$S/config" \
  XDG_CACHE_HOME="$S/cache" XDG_STATE_HOME="$S/state" \
  PI_CODING_AGENT_DIR="$S/agent" PI_CONFIG_DIR=.omp OMP_AGENT_DIR="$S/agent" \
  node --test <files/options below>
```

1. Initial corrected-tree command: `test/launcher.test.js test/model_catalog.test.js test/cli.test.js test/subagent_policy.test.js test/delegate-enforcement.test.js test/delegate_models.test.js`. **Exit 1: 90/91 pass**, no skips/cancellations; 28,638.546792 ms Node duration. Forced exit-before-data still refused (1 rather than 7). Corrected close-time decision to drain queued acknowledgements one turn before judgment; did not suppress or narrow the assertion.
2. Alongside that attempt, the first gated installed proof failed: selected file URL did not equal generated `import.meta.url` under installed loader execution, leaving acknowledgement empty. Replaced this rejected identity mechanism with embedded canonical-source contract identity. No generated source is patched for the final proof.
3. Corrected affected command: `--test-name-pattern='exit-before-data|earlier-|fragmented-duplicate|legacy-channel' test/launcher.test.js`. **Exit 0: 5/5 pass**, no skips/cancellations; 1,578.700604 ms.
4. Expanded narrow command: `test/launcher.test.js test/model_catalog.test.js test/cli.test.js test/subagent_policy.test.js test/delegate-enforcement.test.js test/delegate_models.test.js test/queue.test.js test/stop-owner.test.js test/check-shell.test.js`. **Exit 1: 284/285 pass**, no skips/cancellations; 18,564.178664 ms. Only failure was the retained-partial fixture still writing the rejected `{file` prefix after production acknowledgement moved to `{contract`; the new parser correctly refused those invalid bytes and could kill before the fixture's natural exit marker. Corrected the fixture to send a proper incomplete contract acknowledgement, preserving its 10-second bound/main-exit/no-cleanup assertions. Added explicit inherited-old-field coverage to the legacy consumer scenario and process-order timestamps. All **254 non-launcher cases passed**, including the unchanged Stop queue/33-case actual-owner corpus, final catalog/minimal-envelope cases, generator/routing/defaults matrices and isolated standalone diagnostic tests. No production code changed after this command.
5. Final affected command: `test/launcher.test.js`. **Exit 0: 31/31 pass**, no skips/cancellations; 28,385.531555 ms Node duration, 28.47 s wall. This includes the complete launcher corpus, not only the fixed partial-ack case. Combined final narrow evidence is 254 non-launcher passes plus this final 31-case launcher pass, not a claim of a single fresh full-project green gate.

No reported reviewer failure was rerun merely to confirm it. No `npm test`, bare real-HOME `npm run check`, installed OMP CLI, actual model or live T3 session was used. `test/check-shell.test.js` invokes controlled literal-path fake OMP/gh; standalone discovery behavior remains covered. Parent owns fresh full-project union gates and independent reviews.

### Process ordering and bounds before cleanup

Final launcher observations (milliseconds from harness launch):

| Scenario | Main exit marker | Shim exit | Observation completed | Shim result | Holder / sibling |
| --- | ---: | ---: | ---: | --- | --- |
| retained-noack | 77 | 10,313 | 10,314 | code 1 | both alive |
| retained-partial | 95 | 10,318 | 10,318 | code 1 | both alive |
| earlier real policy-only source, missing required routing source | 253 | 529 | 529 | code 1 | sibling alive |
| unrepresentable catalog envelope | SIGKILL: no JS exit callback | observed before 422 | 422 | code 1 | sibling alive |

Each actual-main PID was ESRCH before fixture cleanup; every launchable scenario launched exactly one main. Refusal cases have empty forwarded stdout and no child-side client-RPC receipt. Retained cases retain both downstream stdout and fd3, while holder stderr is ignored so harness shim-close observation is not itself descendant-held. Main exit precedes shim exit; the holder is still alive after shim failure. Catalog refusal diagnoses `owned OMP exit observed`, emits no catalog response, and proves main reaping/sibling survival before cleanup. Direct SIGTERM/SIGHUP preserve `{code:null, signal:<same signal>}`; child-handled SIGTERM still records exit 42. Valid immediate and forced exit-before-delivery acknowledgements retain code 7 without replacement.

The forced-order case runs the actual `bin/omp-t3` with a scratch preload that holds fd3 data events until the actual child `exit`, then delivers them in a microtask. It does not replace generated source, fake child exit, or implement another launcher. Fragmented/duplicate delivery wraps builtin `writeSync` and synchronizes Node builtin ESM exports; actual generated source executes unchanged. The earlier policy-only case also executes actual unchanged generator output. The legacy consumer is a synthetic old-field reader/writer/closer proving channel cutover with an inherited `OMPT3_REQUIRED_HOOK_FD=3`, not a claim to execute every historical cached file. No user caches are read or modified.

Production registration remains **10,000 ms**, owner observation **250 ms**; neither is traffic-renewed. Tests assert retained-case elapsed >=10,000 and <12,000 ms; observed ~10.31 s includes shim startup and scheduling, not a hard-real-time guarantee under stalls. One-turn close draining does not create another registration interval. Existing Stop restore/follower/completion/correlation/output-callback/doctor/generation semantics and caps remain intact; their focused cases passed.

## Actual unchanged generated-file installed proof

Preflight: `free -m; ~/.omp/bin/heavy-gate --status; command -v bun bwrap unshare` exited 0. MemAvailable 8,169 MiB; both shared slots free. One serial installed-runtime proof, no browser. Both installed attempts ran through the mandatory outer gate with finite Bash `async:true, timeout:0`, no timeout wrapper; scope isolation was available.

Final command:

```sh
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w24-runtime-U4XF36/run.sh
```

**Exit 0, 1.29 s wall.** Actual installed version **18.20.0**. Generated file:

```text
/tmp/omp-w24-runtime-U4XF36/cache/omp-t3/subagent-policy-ff342d3476329ce9.ts
contract 86841bd671a458f5b5aa38b3d4d2fe1b62e3c55092538dd75b4ef0c17d18a1e2
ack {"contract":"86841bd671a458f5b5aa38b3d4d2fe1b62e3c55092538dd75b4ef0c17d18a1e2"}\n
```

Final-source SHA-256 `ff342d3476329ce934fdaf6da769faa3c2ca7a852c010f5869973a754b79b164` matches its cache filename prefix. No copied mock replaces this source. Actual explicit-only discovery under `--no-extensions`, loader, runner, initializeExtensions, SessionTools and xdev renderers were exercised. Before installed evaluation the fixture asserted invisible host user directories and an empty network route table. Wrapper remains outer heavy-gate → unshare user/network → env -i → bwrap fresh root/proc/dev/tmp, read-only dependencies and writable scratch only.

Observed complete enabled names after startup: `mcp__fixture__mounted,mcp__fixture__top,plugin_mounted,plugin_top,read,task_extra,write`; top: `mcp__fixture__top,plugin_top,read,task_extra,write`; mounted: `mcp__fixture__mounted,plugin_mounted`. Actual listing/docs remained byte-identical to the non-task baseline. Startup, injected tree and before-agent hooks were awaited and preserved these complete arrays/partition/docs; disabled registered tool stayed disabled. Already-absent task produced writesDelta=0/setCallsDelta=0. A later loaded extension re-enabled task; installed tool_call blocked it while task_extra/plugin calls passed. Runtime errors were empty. Synthetic deferred-setter unit cases separately retain all three hooks' awaiting behavior.

### Exact reproduction from the existing receipt

Use `selective-upstream-routing-implementation.md`'s **Exact installed-runtime reproduction sources** as the base. The following creates new scratch copies of its wrapper/fixture and uses the current real generator; it does not edit the generated extension:

```sh
S=$(mktemp -d /tmp/omp-w24-runtime-XXXXXX)
env -i PATH="$PATH" XDG_CACHE_HOME="$S/cache" node - "$S" <<'JS'
const fs = require('node:fs');
const S = process.argv[2];
const receipt = fs.readFileSync('planning_docs/selective-upstream-routing-implementation.md','utf8');
const blocks = [...receipt.matchAll(/```(?:sh|ts)\n([\s\S]*?)```/g)].map(x=>x[1]);
const wrapper = blocks[4].replaceAll('/tmp/omp-w09-runtime-7Lkiue', S)
  .replace('OMPT3_REQUIRED_HOOK_FD=3', 'OMPT3_HOOK_REGISTRATION="$(cat "$S/generated-identity")"');
const fixture = blocks[5]
  .replace("assert.equal(readFileSync(S+'/ack','utf8'),'guard-ready\\n');",
    "assert.equal(readFileSync(S+'/ack','utf8'),JSON.stringify({contract:process.env.OMPT3_HOOK_REGISTRATION})+'\\n');")
  .replace("ack:'guard-ready'", "ack:readFileSync(S+'/ack','utf8').trim()");
const {createSubagentPolicy,subagentPolicyArgs} = require('./src/subagent_policy.js');
const generated = subagentPolicyArgs(createSubagentPolicy({}),true);
fs.writeFileSync(S+'/generated-path',generated.requiredHook.file);
fs.writeFileSync(S+'/generated-identity',generated.requiredHook.identity+'\n');
fs.writeFileSync(S+'/run.sh',wrapper);
fs.writeFileSync(S+'/fixture.ts',fixture);
console.log(generated);
JS
free -m
~/.omp/bin/heavy-gate --status
# Run as a finite async Bash call with timeout:0; stop if isolation fails.
~/.omp/bin/heavy-gate -- /bin/bash "$S/run.sh"
# Remove only this owned scratch root after recording observations.
rm -rf -- "$S"
```

Recorded final scratch fingerprints:

```text
2de4509d3282fb8a8a70dd4b67cb180519d4a77cfe2e7c1aae320c38213ed4f4 run.sh
1667f1792a0c1fdf79dd8f4c9e277c6c5704206a00210778bb84c6f662f2e12e fixture.ts
ff342d3476329ce934fdaf6da769faa3c2ca7a852c010f5869973a754b79b164 generated extension
e145cd286ddee6c71c5fe07eef55aad0146f8163898fea54967f98fe77b1020c installed package.json
b617b459ce64c86844434198bdc42c75ffaa5a9d2811e6b8355ee026b2efb526 runtime-init.ts
0ebf14fb84b7b8debd7ee3057c45f6db3fb57cfd861370d7ff669cf0ad79fe84 session-tools.ts
0184a53dcbf9a5b543289bc84a8f32a8429b65c12489be17750c3256c7105b3a runner.ts
5dd1c072d34ae6f7e7154a9e2f025a8d72143c36f1bf0900d8a62ab3455c5e8c loader.ts
03973feef2ec1cdea04e0a79a6afc28e037fc16cfb07e0d039ebb710dde52fde xdev.ts
```

Installed-component hashes match the earlier receipt. Wrapper hash includes the concrete scratch path. Scratch wrapper/fixture/cache/metadata/state were removed after recording proof.

## Limits and residual acceptance

No known uncorrected RR1/RR2/RR3/WP2 finding is left by this implementation; independent original-scope reviews must decide closure. Ledger/G1 remain parent-owned, as do fresh full-project gates. No accepted-risk waiver, architecture replacement or acceptance reduction is claimed.

The installed proof uses structural agent/host/session-manager doubles, synthetic registered tool names and an injected tree event, not a full actual OMP CLI, disk-backed restore, real plugin/MCP transport, provider schema/UI, paid model or live T3 run. Synthetic launcher/API and Node delivery scheduling are process/contract evidence, not live OMP/T3 scheduling equivalence. Registration identifies the selected generated contract, not a sandbox against an extension forging arbitrary process I/O. The deadline bounds unregistered startup, not arbitrary post-registration descendants. D10's concurrent full-selection/mount membership/presentation limitation remains unchanged. Existing Stop gesture/provenance/text-loss/finite-expiry limitations remain unchanged and are not excuses for these fixes. Real upstream failure passthrough may itself exceed local limits; this change bounds shim-generated catalog frames, not upstream transport negotiation.
