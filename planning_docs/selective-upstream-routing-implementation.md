# W09 — P4 live-tool routing implementation

## Scope and status

Implemented P4 only under D10/D16/D20 and the complete approved routing-plan and joint-checkpoint reviews. No subagents, commits, ledger/old-review edits, installs, global configuration, real model, plugin, MCP transport, auth access, T3 restart or browser.

P4 focused behavior and the actual generated extension on installed OMP 18.20.0 passed the checks below. This receipt is not independent W10/union approval or a full project gate. **G1 remains open pending the parent's full isolated combined gates.** The authoritative historical 323/324 legacy-probe failure was not rerun. Its obsolete algorithm and mechanism tests were removed together; stronger final-main-child evidence replaces them.

## Exact changed files

- `src/cli.js`: capture `routingEnabled` once from original argv and environment; any split/equals tools occurrence disables routing, even missing/empty/invalid values. Preserve explicit argv bytes, offline-hint consumption, mode rewrite, appendices, sessions and native cap overlay. Append the existing generated extension after user extension arguments. Remove fixed tools/export, fallback argv and injected-tools state.
- `src/subagent_policy.js`: extend the existing content-keyed/atomic generated extension, enabled for routing OR active model policy. Routing flag is literal generated content/cache identity. Three awaited lifecycle hooks synchronously read latest enabled names and immediately invoke/await replacement minus exact task; no setter when absent. Missing APIs, getter throw, setter throw and rejection diagnose on stderr without removing the independent routing-only task-call guard. Model defaults still apply before opt-in policy and approved replacement input is returned. Registering the required hook acknowledges through child fd 3; registration exceptions diagnose and exit nonzero.
- `bin/omp-t3`: remove all probe/prune/retry/stock-fallback launches; finish adaptation before the sole final child. Pass captured required-hook ownership to the process launcher. Update help without changing version/URL/updater/install/check ownership or safe `execFileSync`.
- `src/proxy.js`: **concrete necessary integration only** in `spawnAndProxy`: owned-child registration acknowledgement channel and ten-second registration deadline. Do not start the proxy/readiness/RPC admission before acknowledgement. Missing registration/load failure refuses and calls the existing direct-child failure owner. Drain acknowledgement bytes even after process exit before judging missing registration. Existing Stop pipeline, queue, settlement, doctor and owner implementations were not edited.
- `test/launcher.test.js`: replace obsolete probe tests with isolated single-final-session subprocess contracts and actual natural exit observations before cleanup.
- `test/delegate-enforcement.test.js`: twelve routing/explicit/policy combinations, generated-handler behavior, nonzero env, both user appendix forms, session/cap retention, empty/invalid tools unchanged.
- `test/subagent_policy.test.js`: actual generated handler-map execution, latest selections, exact task versus task_extra, custom/MCP-like tools, absent/no setter, deferred setter awaiting, headless filter failures, later re-enable guard.
- `test/delegate_models.test.js`: migrate generated factory fixture to handler-map execution; preserve the full existing consumer matrix and filled allowed/denied/unresolved behavior. Remove obsolete unused VM source locals in both hook fixtures.
- `test/generated-hook.js` (new): VM adapter for executing the generated factory; only ESM import/export syntax is adapted, not routing/model implementation. Installed proof below uses the unchanged file.
- `test/cli.test.js`: delete obsolete fallback argv assertion; preserve all existing cap edge cases.
- `README.md`, launcher help, `AGENTS.md`: routing/guard/refusal behavior and explicit limits, Unreleased and lessons.
- This new receipt.

No implementation change to `src/delegate_models.js` or `src/extension_compat.js`; adapted MCP fill-before-policy and direct client/execute coverage remain. No catalog source/test contracts or Stop owner/consumer regression files were changed. No scheduler, four-task rule or default model policy was introduced. No implementation aliases/shims remain for the deleted launch algorithm.

## Routing truth table — all twelve combinations passed

Each row ran with model policy OFF and ON. `blocked` means shim rejection through ordinary tool_call dispatch, not a sandbox or a guarantee task is registered.

| Launch routing env | Original tools | Filter / routing guidance / routing task guard | Native task policy OFF | Native task policy ON |
| --- | --- | --- | --- | --- |
| unset | absent | on | blocked | blocked |
| unset | split | off | allowed | blocked |
| unset | equals | off | allowed | blocked |
| 0 | absent | off | allowed | blocked |
| 0 | split | off | allowed | blocked |
| 0 | equals | off | allowed | blocked |

Separate nonzero `yes` check retains default routing, both caller appendix spellings, session/fork and cap overlay. Missing, empty and invalid split/equals tools remain explicit. No default tools argument is synthesized. Policy is independently opt-in. The full delegate-model matrix passed: roles/frontmatter, settings layers, aliases/fallbacks, model/thinking inheritance, explicit caller model/options/clears, Pi/local scoping, opt-out and unavailable settings. Both adapted-client policy-off defaults and filled-policy checks passed.

## Commands and exits

No actual OMP CLI (including help/version) was invoked. All installed OMP module evaluation was under the outer gate and isolated namespace below.

Initial focused command (exit **1**, **96/97**):

```sh
S=$(mktemp -d /tmp/omp-w09-tests-XXXXXX)
trap 'rm -rf -- "$S"' EXIT
env -i PATH="$PATH" HOME="$S/home" XDG_CONFIG_HOME="$S/config" \
  XDG_CACHE_HOME="$S/cache" XDG_STATE_HOME="$S/state" \
  PI_CODING_AGENT_DIR="$S/agent" PI_CONFIG_DIR=.omp OMP_AGENT_DIR="$S/agent" \
  node --test test/cli.test.js test/launcher.test.js test/subagent_policy.test.js \
  test/delegate-enforcement.test.js test/delegate_models.test.js \
  test/extension_compat.test.js test/extension_compat_ledger.test.js \
  test/cli_version.test.js test/commands.test.js
```

Only failure: the new cap-retention assertion incorrectly parsed the existing YAML overlay as JSON. Corrected the test to inspect the YAML concurrency field; no production cap change. Added the missing-ack/continued-ready refusal scenario. Reran only affected files (exit **0**, **34/34**, zero skips):

```sh
S=$(mktemp -d /tmp/omp-w09-tests-fix-XXXXXX)
trap 'rm -rf -- "$S"' EXIT
env -i PATH="$PATH" HOME="$S/home" XDG_CONFIG_HOME="$S/config" \
  XDG_CACHE_HOME="$S/cache" XDG_STATE_HOME="$S/state" \
  PI_CODING_AGENT_DIR="$S/agent" PI_CONFIG_DIR=.omp OMP_AGENT_DIR="$S/agent" \
  node --test test/delegate-enforcement.test.js test/launcher.test.js
```

Launcher evidence: one final child reaches READY after 1100 ms; routing/opt-out/explicit offline discovery all reach READY; invalid split/equals including empty values preserve exact argv and natural exit 2; startup exit 7 stays 7 without replacement; unspawnable final child exits 1 without unhandled error; signal fixture receives SIGTERM, records its own natural exit 42, parent observes 42, child is reaped before cleanup and an unrelated sibling remains alive. Load failure, registration throw and missing-hook despite continued READY all refuse with exit 1 and no forwarded readiness. Active-policy incompatible bridge and required cache failure (routing-only and policy-active) launch zero OMP children. Successful adapted copy and identity already exist when final child begins; original user extension bytes remain unchanged.

Fixtures use scratch HOME/XDG/Pi directories, an allowlisted environment, literal-path fake OMP, rejecting fake gh, no prompt/model/tool execution and the controlled fake version/otherwise inactive doctor. Cleanup happens after observed exit and assertions; cleanup killing is not the signal proof.

After documentation: `env -i PATH="$PATH" node bin/omp-t3 --help` exited **0** and displayed updated routing/explicit-tools/stable-membership/concurrent-change/filter-failure/guard/refusal limitations. This invokes the shim helper only, not OMP. Removed two unused test locals afterwards; no behavioral change.

No `npm test`, `npm run check`, broad suite or legacy-failure rerun. Parent owns the joint full isolated gate.

## Actual generated-file installed-API proof

Preflight (exit 0):

```sh
free -m
~/.omp/bin/heavy-gate --status
command -v bun bwrap unshare
```

Observed MemAvailable 7644 MiB, both gate slots free, installed Bun/bwrap/unshare present. One serial installed-runtime launch, no browser/fan-out.

Scratch creation: `mktemp -d /tmp/omp-w09-runtime-XXXXXX` returned `/tmp/omp-w09-runtime-7Lkiue`. Save the exact fixture and wrapper below there. Generation command (exit 0) used the actual repository generator:

```sh
env -i PATH="$PATH" XDG_CACHE_HOME=/tmp/omp-w09-runtime-7Lkiue/cache node -e '
const fs=require("node:fs");
const {createSubagentPolicy,subagentPolicyArgs}=require("./src/subagent_policy.js");
const file=subagentPolicyArgs(createSubagentPolicy({}),true)[1];
fs.writeFileSync("/tmp/omp-w09-runtime-7Lkiue/generated-path",file); console.log(file);'
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w09-runtime-7Lkiue/run.sh
```

Installed launch used finite `bash async:true, timeout:0`, no timeout wrapper; exit **0**, 1.52 s. Generated file was `cache/omp-t3/subagent-policy-4b6277609f22aac4.ts`; it was neither rewritten nor replaced with W15's synthetic route fixture.

The fixture asserts hidden host user directories and empty route table **before** installed module evaluation. Outermost heavy-gate → unshare user/network namespaces → env -i → bwrap empty-root/read-only dependency mounts, fresh proc/dev/tmp and only writable scratch. Actual installed parseArgs/discovery under explicit `--no-extensions` excludes throwing ambient/configured sentinels and loads the generated source. Actual loader registers its real handlers and writes the production fd-3 acknowledgement. Actual initializeExtensions/ExtensionRunner/SessionTools exercise startup, injected tree dispatch and before-agent lifecycle. Agent storage/host/session-manager are structural doubles as in W15, not copied get/set or mounted-presentation implementations.

Observed output:

```text
isolation: cwd/home inside scratch; net empty; userDirsVisible false
version 18.20.0
generated-explicit-only: actual generated path; ack guard-ready; ambientExcluded true
session_start enabled: mcp__fixture__mounted,mcp__fixture__top,plugin_mounted,plugin_top,read,task_extra,write
session_start top: mcp__fixture__top,plugin_top,read,task_extra,write
session_start mounted: mcp__fixture__mounted,plugin_mounted
session_tree: same expected non-task top/mount partition
before_agent_start: same expected non-task top/mount partition
already-absent: writesDelta 0, setCallsDelta 0
later-reenable: taskEnabled true, taskGuard blocked, taskExtraGuard passed, pluginGuard passed
PASS actual generated hook + installed explicit loader/runner/initializeExtensions/SessionTools; no CLI/model/plugin/MCP transport
```

Assertions compare complete enabled/top/mounted arrays and byte-identical actual xdev listing/documentation after task removal. Disabled registered plugin remains disabled; task_extra remains ordinary. A later real loaded extension re-enables task; installed ordinary tool_call dispatch honors the actual generated guard. Installed runtime error collection is empty. No source-substring or registration-count assertion substitutes for these observations.

Fingerprints:

```text
9a5e296a13a0464f6e82091eaffb061b25b254df04ec14d66c7478306cf27dc3 fixture.ts
a44e971408b72ac1747b4e0857e4325cc633ead4ff4ec730f6b67f193e46824f run.sh
4b6277609f22aac45aaa2fd25836f52282af35de35f8f830ec90b8c9262ad4d7 generated extension
e145cd286ddee6c71c5fe07eef55aad0146f8163898fea54967f98fe77b1020c installed package.json
b617b459ce64c86844434198bdc42c75ffaa5a9d2811e6b8355ee026b2efb526 runtime-init.ts
0ebf14fb84b7b8debd7ee3057c45f6db3fb57cfd861370d7ff669cf0ad79fe84 session-tools.ts
0184a53dcbf9a5b543289bc84a8f32a8429b65c12489be17750c3256c7105b3a runner.ts
5dd1c072d34ae6f7e7154a9e2f025a8d72143c36f1bf0900d8a62ab3455c5e8c loader.ts
03973feef2ec1cdea04e0a79a6afc28e037fc16cfb07e0d039ebb710dde52fde xdev.ts
```

## Limits and checkpoint accounting

- D10/W15's real full-selection race/mount-drift counterexamples remain the supported limitation. Stable registry and mount membership is a condition, not a lock this shim establishes. Concurrent changes can lose unrelated membership and presentation; immediate get→set is not atomic.
- Filtering failure may leave task advertised; its routing guard remains. A load/registration failure cannot establish that guard, so admission refuses rather than calling the launch guarded. The ten-second deadline is for required registration only, not a readiness probe or compatibility promise.
- Guard proof covers ordinary installed tool_call dispatch, not a security sandbox, all internal/xd paths or arbitrary later malicious extensions. Mounted/custom/MCP-like names are synthetic registry entries, not real plugins/MCP transports. No provider schema rendering/full prompt UI, paid model or native task execution was tested.
- Tree events were injected, not restored from a disk-backed session. Installed loader/runner integration is not a full actual OMP CLI/T3 launch. Launcher process/ownership evidence uses literal fake OMP with the production shim and generated factory. No every-future-OMP guarantee.
- Stronger single-child signal/exit/no-orphan/no-replacement/unrelated-sibling-survival evidence is complete here. **G1 is not closed by this worker**: independent routing/original-scope union review and parent full isolated combined tests/check remain required by D16.

Scratch fixtures/cache/sentinels/home/state were deleted after recording this evidence. No owned service or browser was started.

## Exact installed-runtime reproduction sources

Replace only the scratch root consistently for a fresh run; use the generator command above, never a hand-copied route implementation. Keep the gate outermost and stop on any isolation failure.

### run.sh

```sh
#!/bin/bash
set -eu
S=/tmp/omp-w09-runtime-7Lkiue
mkdir -p "$S"/{home,config,cache,state,agent,cwd,tmp}
exec /usr/bin/unshare -Urn /usr/bin/env -i PATH=/runtime:/usr/bin:/bin HOME="$S/home" XDG_CONFIG_HOME="$S/config" XDG_CACHE_HOME="$S/cache" XDG_STATE_HOME="$S/state" PI_CODING_AGENT_DIR="$S/agent" PI_CONFIG_DIR=.omp OMP_AGENT_DIR="$S/agent" TMPDIR="$S/tmp" OMPT3_REQUIRED_HOOK_FD=3 /usr/bin/bwrap --die-with-parent --ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib64 /lib64 --proc /proc --dev /dev --tmpfs /tmp --bind "$S" "$S" --ro-bind /root/.bun/install/global/node_modules /root/.bun/install/global/node_modules --ro-bind /root/.bun/bin/bun /runtime/bun --chdir "$S/cwd" /bin/bash -c 'exec /runtime/bun "$1" 3>"$2"' bash "$S/fixture.ts" "$S/ack"

```

### fixture.ts

```ts
import assert from 'node:assert/strict';
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
const P='/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent';
assert(!existsSync('/root/.omp')); assert(!existsSync('/root/.t3')); assert(!existsSync('/root/.config'));
assert.equal(readFileSync('/proc/net/route','utf8').trim(),'');
const S=process.env.HOME!.replace(/\/home$/,'');
console.log('isolation',JSON.stringify({cwd:process.cwd(),home:process.env.HOME,net:'',userDirsVisible:false}));
console.log('version',JSON.parse(readFileSync(P+'/package.json','utf8')).version);
// Dynamic imports intentionally place installed-module evaluation after namespace assertions.
const {SessionTools}=await import(P+'/src/session/session-tools.ts');
const {Settings}=await import(P+'/src/config/settings.ts');
const {ExtensionRunner}=await import(P+'/src/extensibility/extensions/runner.ts');
const {loadExtensionFromFactory,loadExtensions}=await import(P+'/src/extensibility/extensions/loader.ts');
const {initializeExtensions}=await import(P+'/src/modes/runtime-init.ts');
const {xdevListing,xdevDocs}=await import(P+'/src/tools/xdev.ts');
const {EventBus}=await import(P+'/src/utils/event-bus.ts');
const {parseArgs}=await import(P+'/src/cli/args.ts');
const {discoverSessionExtensionPaths}=await import(P+'/src/sdk.ts');
for(const dir of [S+'/agent/extensions',process.cwd()+'/.omp/extensions']){
 mkdirSync(dir,{recursive:true});writeFileSync(dir+'/ambient.ts','throw Error("AMBIENT MUST NOT LOAD");');
}
const settings=Settings.isolated({extensions:[S+'/not-allowed.ts']});
const generated=readFileSync(S+'/generated-path','utf8').trim();
const args=parseArgs(['--no-extensions','--extension',generated]);
assert.equal(args.noExtensions,true);
const paths=await discoverSessionExtensionPaths({disableExtensionDiscovery:args.noExtensions,additionalExtensionPaths:args.extensions},process.cwd(),settings);
assert.deepEqual(paths,[generated]);
assert.deepEqual(await discoverSessionExtensionPaths({disableExtensionDiscovery:true},process.cwd(),settings),[]);
const eventBus=new EventBus();
const loaded=await loadExtensions(paths,process.cwd(),eventBus);
assert.deepEqual(loaded.errors,[]);assert.equal(loaded.extensions.length,1);
assert.equal(readFileSync(S+'/ack','utf8'),'guard-ready\n');
console.log('generated-explicit-only',JSON.stringify({paths,ack:'guard-ready',ambientExcluded:true}));
const tool=(name,loadMode='essential')=>({name,label:name,description:'Fixture '+name,parameters:{type:'object',properties:{}},loadMode,execute:async()=>{throw Error('No tools may execute');}});
const names=['read','write','task','task_extra','disabled_plugin','plugin_top','mcp__fixture__top','plugin_mounted','mcp__fixture__mounted'];
const enabled=names.filter(n=>n!=='disabled_plugin');
const registry=new Map(names.map(n=>[n,tool(n,n.endsWith('mounted')?'discoverable':'essential')]));
let writes=0,runner;
const agent={state:{tools:enabled.filter(n=>!n.endsWith('mounted')).map(n=>registry.get(n)),messages:[],systemPrompt:[]},setTools(tools){writes++;this.state.tools=tools;},setSystemPrompt(p){this.state.systemPrompt=p;}};
const manager={getCwd:()=>process.cwd(),getSessionId:()=> 'scratch',getBranch:()=>[],getEntries:()=>[]};
const host={agent,sessionManager:manager,settings,modelRegistry:{},extensionRunner:()=>runner,clientBridge:()=>undefined,agentKind:()=> 'main',isDisposed:()=>false,isStreaming:()=>false,queuedMessageCount:()=>0,planModeEnabled:()=>false,model:()=>undefined,evalPreludes:()=>[],sessionAgents:()=>[],emitNotice(){},notifyCommandMetadataChanged(){}};
const xdev={tools:registry,mountedNames:new Set(enabled.filter(n=>n.endsWith('mounted'))),builtInNames:new Set(['read','write','task']),isActive:n=>agent.state.tools.some(t=>t.name===n)};
const tools=new SessionTools(host,{toolRegistry:registry,builtInToolNames:['read','write','task'],baseSystemPrompt:[],xdev,skillsReloadable:false});
const snap=()=>({enabled:tools.getEnabledToolNames().sort(),top:tools.getActiveToolNames().sort(),mounted:tools.getMountedXdevToolNames().sort(),listing:xdevListing(xdev),docs:tools.getMountedXdevToolNames().map(n=>[n,xdevDocs(xdev,n)])});
const expected=snap();expected.enabled=expected.enabled.filter(n=>n!=='task');expected.top=expected.top.filter(n=>n!=='task');
const {runtime}=loaded;
let setCalls=0;const errors=[];
runner=new ExtensionRunner(loaded.extensions,runtime,process.cwd(),manager,{},undefined,settings);
const session={extensionRunner:runner,agent,sessionManager:manager,getEnabledToolNames:()=>tools.getEnabledToolNames(),getAllToolInfos:()=>[],setActiveToolsByName:async n=>{setCalls++;await tools.setActiveToolsByName(n);},model:undefined,isStreaming:false,queuedMessageCount:0,systemPrompt:[]};
await initializeExtensions(session,{reportSendError:(...e)=>errors.push(e),reportRuntimeError:e=>errors.push(e)});
assert.deepEqual(snap(),expected);console.log('session_start',JSON.stringify(snap()));
for(const event of ['session_tree','before_agent_start']){
 await runtime.setActiveTools([...runtime.getActiveTools(),'task']);
 if(event==='session_tree')await runner.emit({type:event,targetId:'fixture'});else await runner.emitBeforeAgentStart('no-model inspection',undefined,[]);
 assert.deepEqual(snap(),expected);console.log(event,JSON.stringify({top:snap().top,mounted:snap().mounted}));
}
const before={writes,setCalls,snapshot:snap()};await runner.emit({type:'session_tree',targetId:'absent'});assert.deepEqual({writes,setCalls,snapshot:snap()},before);
console.log('already-absent',JSON.stringify({writesDelta:0,setCallsDelta:0}));
// The loaded file is the production generated source; only this later extension is synthetic.
const later=await loadExtensionFromFactory(api=>api.on('before_agent_start',async()=>{await api.setActiveTools([...api.getActiveTools(),'task']);}),process.cwd(),eventBus,runtime,'scratch-later');
await runner.addExtensions([later]);await runner.emitBeforeAgentStart('no-model inspection',undefined,[]);assert(runtime.getActiveTools().includes('task'));
const block=await runner.emitToolCall({type:'tool_call',toolName:'task',toolCallId:'scratch',input:{}});assert.equal(block?.block,true);
assert.equal(await runner.emitToolCall({type:'tool_call',toolName:'task_extra',toolCallId:'scratch',input:{}}),undefined);
assert.equal(await runner.emitToolCall({type:'tool_call',toolName:'plugin_top',toolCallId:'scratch',input:{}}),undefined);
console.log('later-reenable',JSON.stringify({taskEnabled:true,taskGuard:'blocked',taskExtraGuard:'passed',pluginGuard:'passed'}));
assert.deepEqual(errors,[]);runner.clearManagedTimers();runner.disposeFileFallbacks();
console.log('PASS actual generated hook + installed explicit loader/runner/initializeExtensions/SessionTools; no CLI/model/plugin/MCP transport');

```
