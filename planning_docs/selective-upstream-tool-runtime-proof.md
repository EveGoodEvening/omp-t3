# W15 — Installed OMP active-tool runtime proof

## Result and scope

Actual installed **OMP 18.20.0**, Bun **1.4.4**, Linux x64. Read D05, W03 and W13 before running. This replaces their modeled active-tool evidence, not their separate Stop findings. No implementation authorized or performed.

**Proved:** under a stable registry/mount partition, removing only `task` through the installed extension API preserves the other enabled names, exact top-level/mounted partition, and actual `xd://` listing/docs. Installed startup wiring and installed awaited lifecycle dispatch were exercised. Already-absent task produces no setter call or agent-tool write. A later extension really can re-enable task; installed `tool_call` dispatch honors an asynchronous routing guard. Explicit-only discovery accepts a trusted fixture with `--no-extensions` while excluding ambient/configured extensions.

**Also proved, negative evidence:** these public APIs do not provide atomic subtract-one semantics or a presentation snapshot. A concurrent activation can be lost by stale complete replacement; changed mount membership can move a previously mounted tool top-level. These are actual installed-method observations, not a reason to weaken AC4 silently.

Harness choice: import the installed `SessionTools`, `ExtensionRunner`, extension loader/API/runtime, `initializeExtensions`, and xdev renderers unchanged. No copied/reimplemented get/set logic; no module mocks or import rewrites. The agent storage sink (`state`, `setTools`), session manager and unused host services are controlled structural doubles. Settings are actual `Settings.isolated()` (in-memory). Synthetic registered tools represent plugin/MCP-like names; no plugin package, MCP transport/server, provider, auth store, paid prompt, native task execution, real gh, delegate, browser, or OMP CLI entrypoint was invoked. All installed-code processes were gated nevertheless.

### What each assertion covers

| Scenario | Executed installed code / observation | Boundary |
| --- | --- | --- |
| Startup | `initializeExtensions` binds API get/set through `ExtensionRunner.initialize`, then awaits real `session_start`; synthetic routing and observer extensions loaded using actual loader | Session shell is a double, not `createAgentSession` |
| Tree | Actual `runner.emit({type: "session_tree"})`, after re-enabling task using the real API | Event injection, not disk-backed tree navigation |
| Before-agent | Actual `emitBeforeAgentStart`, after re-enabling task | No agent/provider turn |
| Membership/presentation | Actual `SessionTools` mutation; exact enabled/top/mount arrays plus byte-equal installed `xdevListing` and `xdevDocs` before/after task removal | Prompt builder, provider schema rendering, UI and live MCP refresh not exercised |
| Awaiting | Routing handlers sleep, await real set, then mark done; subsequent registered observer asserts done for every lifecycle dispatch; initialization returns after observer | No timeout/error path proof |
| Task already absent | Compare whole snapshot plus setter and `agent.setTools` counters across a further tree event: both deltas zero | The no-mutation property belongs to the fixture's contains-task check, not unconditional OMP set |
| Later re-enable | Add actual extension with `runner.addExtensions`; its later before-agent handler restores task | Shows hooks alone cannot enforce routing |
| Call guard | Actual `emitToolCall` awaits synthetic async guard: task blocked; unrelated plugin call passes | Dispatch proof, not native execution/xd dispatch bypass proof or security boundary |
| Explicit fixture | Actual parseArgs + `discoverSessionExtensionPaths` + `loadExtensions` registers `trusted_probe`; no explicit path returns empty | CLI parse-to-session-options mapping is source-confirmed, not full CLI launch |
| Read/write race | Read names; activate late registered plugin through real set; apply old names minus task: plugin disappears | Deterministic interleaving, not timing-dependent test |
| Mount drift | Clear live mount subset after read; apply names: formerly mounted tool becomes top-level | Controlled out-of-band mount change |
| Exact restore | Internal `setActiveToolPresentation(names, mounted)` restores partition | Not exposed by extension public get/set API |

## Isolation and config reachability

Every launch had the **outermost** `~/.omp/bin/heavy-gate --` wrapper, then `unshare -Urn`, then `env -i`, then bwrap, then Bun importing installed OMP. Finite tool invocations used `async:true, timeout:0`, with no timeout wrapper. Isolation failure was corrected before any OMP import; no uncapped fallback.

Bwrap starts with an empty root. Read-only mounts: `/usr`, the installed global `node_modules` dependency tree, Bun binary. Symlinks `/bin`, `/lib`, `/lib64`; fresh proc/dev and tmpfs `/tmp`; only the one scratch directory is writable/bind-mounted. Host `/root/.omp`, `/root/.t3`, `/root/.config`, `/etc`, repository and unrelated `/tmp` content are not exposed. Before OMP module evaluation, the primary fixture asserts the three user directories are absent, prints scratch cwd/HOME and the empty route table. This is filesystem namespace isolation in addition to config redirection; absolute paths or ancestor scans cannot find the real user config. Read-only runtime dependencies are trusted input, not a claim of a minimal hardened sandbox.

Environment allowlist: explicit PATH, scratch HOME, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_STATE_HOME, PI_CODING_AGENT_DIR, PI_CONFIG_DIR, OMP_AGENT_DIR and TMPDIR only. No inherited provider tokens, profile, user config or shell startup files. Wrapper creates scratch directories before entering the namespace; its shell is `/bin/bash` without interactive/login startup. First successful lifecycle run used `PI_CONFIG_DIR="$S/home/.omp"`; later discovery runs use the documented directory-name form `PI_CONFIG_DIR=.omp`. Both remain inside scratch and the physical namespace is the ultimate boundary. `OMP_AGENT_DIR` is set defensively, not asserted to be an OMP-supported selector.

Source resolution (installed package paths relative to `P` below):

- `src/config/settings.ts:833-840`: `Settings.isolated()` constructs with `inMemory:true`, no storage, and rebuilds in-memory layers; no persisted config loading invoked.
- `@oh-my-pi/pi-utils/src/dirs.ts:331-334,497-506,637-640`: config directory name from PI_CONFIG_DIR; no-profile agent override from PI_CODING_AGENT_DIR; getAgentDir reads this resolver. env -i removes profile selection.
- `src/config.ts:17-22,90-98,133-161,223-245`: user sources from agent dir / HOME / Claude resolver; project sources from cwd; nearest-project discovery walks ancestors. Actual printed discovery roots all reside under scratch. Even alternative discoverers cannot read physically hidden host user directories.
- `src/cli/args.ts:389-390` and `src/main.ts:1802-1809`: `--no-extensions` disables discovery without discarding explicit `--extension` inputs.
- `src/sdk.ts:1190-1205`: explicit-only uses only explicit paths, ignores configured/disabled lists, passes `ambient:false`.
- `src/extensibility/extensions/loader.ts:725-800`: ambient=false skips native capability/hook scans and installed plugins, retains explicit package/file inputs. Discovery fixture installs throwing ambient sentinels in scratch agent/project roots and an invalid configured extension path; none is selected/imported.

## Exact commands and outcomes

Preflight (no OMP CLI commands, including help/version):

```sh
free -m
~/.omp/bin/heavy-gate --status
command -v bun node unshare bwrap
ls /root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/{modes/runtime-init.ts,session/session-tools.ts,extensibility/extensions/runner.ts}
```

```text
               total        used        free      shared  buff/cache   available
Mem:           15985        8951        3033        2790        7125        7034
Swap:              0           0           0
MemAvailable 7034 MiB (need 4500), 2 slots in /tmp/heavy-gate
slot-0 free
slot-1 free
/root/.bun/bin/bun
/root/.nvm/versions/node/v24.22.3/bin/node
/usr/bin/unshare
/usr/bin/bwrap
```

`mktemp -d /tmp/omp-w15-XXXXXX` returned `/tmp/omp-w15-6j2lXb`. The two source listings below and wrapper were written there. No fan-out: each gated launch completed before the next.

All historical launch commands (cwd `/tmp/omp-w15-6j2lXb`):

```sh
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w15-6j2lXb/run.sh
# Attempt 1: exit 1 before Bun/OMP startup:
# bwrap: Can't create file at /usr/local/bin/bun: Read-only file system
# Corrected target mount and PATH to /runtime/bun and /runtime.
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w15-6j2lXb/run.sh
# Attempt 2: exit 0; lifecycle output below.
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w15-6j2lXb/run.sh extra.ts
# Attempt 3: exit 1; discovery/race/drift assertions completed, then
# TypeError: this.#host.emitNotice is not a function
# at session-tools.ts:1926 (#notifyXdevMountDelta)
# Scratch host double lacked required notice sink. Added logging emitNotice;
# installed source unchanged. Final extra.ts below includes that correction.
/root/.omp/bin/heavy-gate -- /bin/bash /tmp/omp-w15-6j2lXb/run.sh extra.ts
# Attempt 4: exit 0; complete edge/discovery output below.
```

The first wrapper pointed Bun at `/usr/local/bin/bun` under read-only `/usr`; no OMP process ran in that failed attempt. The second wrapper used `/runtime/bun`, fixed filename `fixture.ts`, and the first-run PI_CONFIG_DIR value described above. Before attempt 3, wrapper gained `${1:-fixture.ts}` and `PI_CONFIG_DIR=.omp`. Final wrapper below reproduces both fixtures under the stricter corrected config-name form; the successful lifecycle transcript was obtained with the preceding wrapper revision, not rerun to conceal that distinction.

### Lifecycle output (verbatim)

```text
isolation {"cwd":"/tmp/omp-w15-6j2lXb/cwd","home":"/tmp/omp-w15-6j2lXb/home","net":"","userDirsVisible":false}
version 18.20.0
session_start {"enabled":["mcp__fixture__mounted","mcp__fixture__top","plugin_mounted","plugin_top","read","write"],"top":["mcp__fixture__top","plugin_top","read","write"],"mounted":["mcp__fixture__mounted","plugin_mounted"],"listing":"xd:// 2 mounted tool devices.\nxd://plugin_mounted Fixture plugin_mounted\nxd://mcp__fixture__mounted Fixture mcp__fixture__mounted\n\nRead xd://<tool> for docs + JSON schema; write the JSON args object to xd://<tool> to execute. Active top-level tools accept the same dispatch.","docs":[["plugin_mounted","# plugin_mounted — plugin_mounted\n\nFixture plugin_mounted\n\n## Schema\n```ts\ntype Args = {};\n```\nExecute by writing JSON to xd://plugin_mounted."],["mcp__fixture__mounted","# mcp__fixture__mounted — mcp__fixture__mounted\n\nFixture mcp__fixture__mounted\n\n## Schema\n```ts\ntype Args = {};\n```\nExecute by writing JSON to xd://mcp__fixture__mounted."]]}
session_tree {"top":["mcp__fixture__top","plugin_top","read","write"],"mounted":["mcp__fixture__mounted","plugin_mounted"]}
before_agent_start {"top":["mcp__fixture__top","plugin_top","read","write"],"mounted":["mcp__fixture__mounted","plugin_mounted"]}
already-absent {"writesDelta":0,"setCallsDelta":0}
later-reenable {"taskEnabled":true,"taskGuard":"blocked","pluginGuard":"passed"}
awaited-trace ["session_start:begin","session_start:done","session_start:observer","session_tree:begin","session_tree:done","session_tree:observer","before_agent_start:begin","before_agent_start:done","before_agent_start:observer","session_tree:begin","session_tree:done","session_tree:observer","before_agent_start:begin","before_agent_start:done","before_agent_start:observer"]
PASS actual installed SessionTools + ExtensionRunner + initializeExtensions; no provider or tool execution
```

### Explicit discovery and API edges (verbatim successful output)

```text
no-extensions {"parsed":true,"explicitOnly":["/tmp/omp-w15-6j2lXb/trusted.ts"],"registered":["trusted_probe"],"emptyExplicit":[],"ambientSentinelsNotLoaded":true,"roots":["/tmp/omp-w15-6j2lXb/agent/extensions","/tmp/omp-w15-6j2lXb/cwd/.omp/extensions","/tmp/omp-w15-6j2lXb/cwd/.claude/extensions","/tmp/omp-w15-6j2lXb/cwd/.codex/extensions","/tmp/omp-w15-6j2lXb/cwd/.gemini/extensions"]}
read-write-race late_plugin lost by stale complete replacement (expected API limitation)
partition-drift mounted becomes top-level when live mount membership disappears before set
host-notice ["info","xd://: mounted mounted","xdev"]
internal presentation restore restores snapshotted mounted subset; extension API exposes names only
unknown registry names ignored
PASS explicit-only trusted fixture discovery and real installed API limitation checks; no model
Wall time: 1.20 seconds
```

## Source-derived constraints and design consequence

- `runtime-init.ts:127-130,213-214`: extension API uses enabled names (not just model-visible top-level tools), complete replacement setter, and awaited session_start. `runner.ts:927-933` also awaits pending registration before applying a selection; that barrier does not recompute a previously captured name array.
- `session-tools.ts:865-881,2336-2347,2415-2440`: get unions enabled names with live mounts; set serializes the mutation but accepts a complete selection, pinning names outside the current mounted subset. `2350-2384` documents the separate internal exact-presentation API. `1487-1504` ignores unknown registry entries and needs read/write transports for mounting.
- `runner.ts:2077-2078,2657-2675`: ordinary lifecycle and before-agent handlers await in registration order. Later re-enablement was demonstrated, not merely inferred. Native task declares `loadMode="essential"` at `src/task/index.ts:768`; the primary fixture uses that actual presentation mode without constructing/executing TaskTool.
- [SOURCE-DERIVED] Tool-call handlers short-circuit at the first block (`runner.ts:2332-2379`). The fixture verifies ordinary task block and unrelated pass; it does not establish every internal/native/xd invocation passes the same guard. Do not advertise a security sandbox.

[DESIGN, not implemented] Candidate routing extension: only install when default delegation routing is enabled and no explicit `--tools` (either CLI spelling); preserve opt-out and existing independent opt-in model-policy guards. At startup/tree/before-agent, read the live enabled set, skip set entirely when task absent, otherwise immediately await set of that set minus task. Add a routing-only native-task call guard for later re-enablement. Keep it independent of model-policy/concurrency/model inheritance. Hooks alone cannot promise task stays absent throughout a turn.

**AC4 must not be declared unconditionally satisfied by this spike.** Stable-set presentation preservation is now real installed-code proof. Interleaving preservation is demonstrably not guaranteed by public extension get/set. A design review must either establish/enforce a quiescent registry boundary for the read/await-set operation and every relevant restoration/refresh path, or provide an authoritative mutation-time subtract/filter operation that sees the current selection; a call guard prevents execution but does not repair lost unrelated membership/presentation. Blind retries and extra fixed lists cannot make this atomic. A new wrapper that silently rebuilds from an old snapshot would reproduce the demonstrated bug. Internal exact-presentation restore requires two snapshots and is not exposed by public ExtensionAPI; exporting/porting a new upstream API is a separate decision, not something this no-implementation spike did.

Limits kept explicit: no real plugin/MCP transport activation, session restore from disk, full provider prompt/visual surface, actual native task execution, extension timeout/error policy, or opt-out/explicit-tools integration tests. These were not silently substituted with mocked get/set; they remain design/integration obligations. No external missing-tool blocker was found: user+network namespaces, bwrap, Bun and the gate worked. No server restart/settings/plugin change occurred.

## Reproduction sources

Create a fresh directory with `mktemp -d /tmp/omp-w15-XXXXXX`, save these three files there, and replace only the wrapper's `S=` with the returned path. The fixtures derive scratch paths from HOME or cwd. Do not run Bun or OMP outside the outer gate. Installed package root `P` must match the fingerprinted installation below. Source files themselves contain no model request. Run the two successful commands above with the new scratch path; clean up after both complete using `rm -rf -- "$S"` (only your generated scratch directory).

### run.sh (final)

```sh
#!/bin/bash
set -eu
S=/tmp/omp-w15-6j2lXb
mkdir -p "$S"/{home,config,cache,state,agent,cwd,tmp}
exec /usr/bin/unshare -Urn /usr/bin/env -i PATH=/runtime:/usr/bin:/bin HOME="$S/home" XDG_CONFIG_HOME="$S/config" XDG_CACHE_HOME="$S/cache" XDG_STATE_HOME="$S/state" PI_CODING_AGENT_DIR="$S/agent" PI_CONFIG_DIR=.omp OMP_AGENT_DIR="$S/agent" TMPDIR="$S/tmp" /usr/bin/bwrap --die-with-parent --ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib64 /lib64 --proc /proc --dev /dev --tmpfs /tmp --bind "$S" "$S" --ro-bind /root/.bun/install/global/node_modules /root/.bun/install/global/node_modules --ro-bind /root/.bun/bin/bun /runtime/bun --chdir "$S/cwd" /runtime/bun "$S/${1:-fixture.ts}"
```

### fixture.ts

```ts
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
const P='/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent';
assert(!existsSync('/root/.omp')); assert(!existsSync('/root/.t3')); assert(!existsSync('/root/.config'));
console.log('isolation', JSON.stringify({cwd:process.cwd(),home:process.env.HOME,net:readFileSync('/proc/net/route','utf8').trim(),userDirsVisible:false}));
console.log('version',JSON.parse(readFileSync(P+'/package.json','utf8')).version);
// Import boundary is intentional: assert isolation before evaluating installed OMP modules.
const {SessionTools}=await import(P+'/src/session/session-tools.ts');
const {Settings}=await import(P+'/src/config/settings.ts');
const {ExtensionRunner}=await import(P+'/src/extensibility/extensions/runner.ts');
const {ExtensionRuntime,loadExtensionFromFactory,loadExtensions}=await import(P+'/src/extensibility/extensions/loader.ts');
const {EventBus}=await import(P+'/src/utils/event-bus.ts');
const {initializeExtensions}=await import(P+'/src/modes/runtime-init.ts');
const {xdevListing,xdevDocs}=await import(P+'/src/tools/xdev.ts');
const settings=Settings.isolated();
const tool=(name,loadMode='essential')=>({name,label:name,description:'Fixture '+name,parameters:{type:'object',properties:{}},loadMode,execute:async()=>{throw Error('No tools may execute')}});
const names=['read','write','task','plugin_top','mcp__fixture__top','plugin_mounted','mcp__fixture__mounted'];
const registry=new Map(names.map(n=>[n,tool(n,n.endsWith('mounted')?'discoverable':'essential')]));
let writes=0, runner;
const agent={state:{tools:names.filter(n=>!n.endsWith('mounted')).map(n=>registry.get(n)),messages:[],systemPrompt:[]},setTools(tools){writes++;this.state.tools=tools;},setSystemPrompt(p){this.state.systemPrompt=p;}};
const manager={getCwd:()=>process.cwd(),getSessionId:()=> 'scratch',getBranch:()=>[],getEntries:()=>[]};
const host={agent,sessionManager:manager,settings,modelRegistry:{},extensionRunner:()=>runner,clientBridge:()=>undefined,agentKind:()=> 'main',isDisposed:()=>false,isStreaming:()=>false,queuedMessageCount:()=>0,planModeEnabled:()=>false,model:()=>undefined,evalPreludes:()=>[],sessionAgents:()=>[],emitNotice(){},notifyCommandMetadataChanged(){}};
const xdev={tools:registry,mountedNames:new Set(names.filter(n=>n.endsWith('mounted'))),builtInNames:new Set(['read','write','task']),isActive:n=>agent.state.tools.some(t=>t.name===n)};
const tools=new SessionTools(host,{toolRegistry:registry,builtInToolNames:['read','write','task'],baseSystemPrompt:[],xdev,skillsReloadable:false});
const runtime=new ExtensionRuntime();const bus=new EventBus();const trace=[];const errors=[];
const snap=()=>({enabled:tools.getEnabledToolNames().sort(),top:tools.getActiveToolNames().sort(),mounted:tools.getMountedXdevToolNames().sort(),listing:xdevListing(xdev),docs:tools.getMountedXdevToolNames().map(n=>[n,xdevDocs(xdev,n)])});
const expected=snap(); expected.enabled=expected.enabled.filter(n=>n!=='task');expected.top=expected.top.filter(n=>n!=='task');
let setCalls=0;
const route=await loadExtensionFromFactory(api=>{
 for(const event of ['session_start','session_tree','before_agent_start'])api.on(event,async()=>{
  trace.push(event+':begin'); await Bun.sleep(5);
  const active=api.getActiveTools();if(active.includes('task'))await api.setActiveTools(active.filter(n=>n!=='task'));
  trace.push(event+':done');
 });
 api.on('tool_call',async e=>{await Bun.sleep(5);if(e.toolName==='task')return {block:true,reason:'Use T3 delegation'};});
},process.cwd(),bus,runtime,'scratch-routing');
const observer=await loadExtensionFromFactory(api=>{for(const event of ['session_start','session_tree','before_agent_start'])api.on(event,()=>{assert.equal(trace.at(-1),event+':done');trace.push(event+':observer');});},process.cwd(),bus,runtime,'scratch-observer');
runner=new ExtensionRunner([route,observer],runtime,process.cwd(),manager,{},undefined,settings);
const session={extensionRunner:runner,agent,sessionManager:manager,getEnabledToolNames:()=>tools.getEnabledToolNames(),getAllToolInfos:()=>[],setActiveToolsByName:async n=>{setCalls++;await tools.setActiveToolsByName(n);},model:undefined,isStreaming:false,queuedMessageCount:0,systemPrompt:[]};
await initializeExtensions(session,{reportSendError:(...e)=>errors.push(e),reportRuntimeError:e=>errors.push(e)});
assert.deepEqual(snap(),expected);console.log('session_start',JSON.stringify(snap()));
for(const event of ['session_tree','before_agent_start']){
 await runtime.setActiveTools([...runtime.getActiveTools(),'task']);
 if(event==='session_tree')await runner.emit({type:event,targetId:'fixture'});else await runner.emitBeforeAgentStart('no-model inspection',undefined,[]);
 assert.deepEqual(snap(),expected); console.log(event,JSON.stringify({top:snap().top,mounted:snap().mounted}));
}
const before={writes,setCalls,snapshot:snap()};await runner.emit({type:'session_tree',targetId:'absent'});assert.deepEqual({writes,setCalls,snapshot:snap()},before);console.log('already-absent',JSON.stringify({writesDelta:0,setCallsDelta:0}));
const later=await loadExtensionFromFactory(api=>api.on('before_agent_start',async()=>{await api.setActiveTools([...api.getActiveTools(),'task']);}),process.cwd(),bus,runtime,'scratch-later');
await runner.addExtensions([later]);await runner.emitBeforeAgentStart('no-model inspection',undefined,[]);assert(runtime.getActiveTools().includes('task'));
assert.deepEqual(await runner.emitToolCall({type:'tool_call',toolName:'task',toolCallId:'scratch',input:{}}),{block:true,reason:'Use T3 delegation'});
assert.equal(await runner.emitToolCall({type:'tool_call',toolName:'plugin_top',toolCallId:'scratch',input:{}}),undefined);
console.log('later-reenable',JSON.stringify({taskEnabled:true,taskGuard:'blocked',pluginGuard:'passed'}));
assert.deepEqual(errors,[]);console.log('awaited-trace',JSON.stringify(trace));runner.clearManagedTimers();runner.disposeFileFallbacks();
console.log('PASS actual installed SessionTools + ExtensionRunner + initializeExtensions; no provider or tool execution');
```

### extra.ts

```ts
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
const P='/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent';
assert(!existsSync('/root/.omp'));
// Exercise module-loading boundaries only after checking the filesystem namespace.
const {parseArgs}=await import(P+'/src/cli/args.ts');
const {discoverSessionExtensionPaths}=await import(P+'/src/sdk.ts');
const {loadExtensions}=await import(P+'/src/extensibility/extensions/loader.ts');
const {Settings}=await import(P+'/src/config/settings.ts');
const {getConfigDirPaths}=await import(P+'/src/config.ts');
const {SessionTools}=await import(P+'/src/session/session-tools.ts');
const S=process.env.HOME!.replace(/\/home$/,'');
for(const dir of [S+'/agent/extensions',process.cwd()+'/.omp/extensions']){mkdirSync(dir,{recursive:true});writeFileSync(dir+'/ambient.ts','throw new Error("AMBIENT MUST NOT LOAD");');}
const explicit=S+'/trusted.ts';writeFileSync(explicit,'export default function(api) { api.registerTool({name:"trusted_probe",label:"Trusted",description:"scratch",parameters:{type:"object",properties:{}},execute:async()=>{throw new Error("NO EXECUTION");}}); }');
const settings=Settings.isolated({extensions:[S+'/not-allowed.ts']});
const args=parseArgs(['--no-extensions','--extension',explicit]);assert.equal(args.noExtensions,true);assert.deepEqual(args.extensions,[explicit]);
const paths=await discoverSessionExtensionPaths({disableExtensionDiscovery:args.noExtensions,additionalExtensionPaths:args.extensions},process.cwd(),settings);assert.deepEqual(paths,[explicit]);
const loaded=await loadExtensions(paths,process.cwd());assert.deepEqual(loaded.errors,[]);assert.equal(loaded.extensions.length,1);assert(loaded.extensions[0].tools.has('trusted_probe'));
assert.deepEqual(await discoverSessionExtensionPaths({disableExtensionDiscovery:true},process.cwd(),settings),[]);
const roots=getConfigDirPaths('extensions',{cwd:process.cwd()});assert(roots.every(p=>p.startsWith(S+'/')));
console.log('no-extensions',JSON.stringify({parsed:true,explicitOnly:paths,registered:[...loaded.extensions[0].tools.keys()],emptyExplicit:[],ambientSentinelsNotLoaded:true,roots}));
const registry=new Map(['read','write','task','mounted'].map(name=>[name,{name,label:name,description:'scratch',parameters:{type:'object',properties:{}},loadMode:name==='mounted'?'discoverable':'essential'}]));
const agent={state:{tools:['read','write','task'].map(n=>registry.get(n)),messages:[]},setTools(t){this.state.tools=t;}};
const host={agent,settings,modelRegistry:{},sessionManager:{},model:()=>undefined,evalPreludes:()=>[],sessionAgents:()=>[],planModeEnabled:()=>false,isDisposed:()=>false,clientBridge:()=>undefined,extensionRunner:()=>undefined,emitNotice(...args){console.log('host-notice',JSON.stringify(args));}};
const xdev={tools:registry,mountedNames:new Set(['mounted']),builtInNames:new Set(['read','write','task']),isActive:n=>agent.state.tools.some(t=>t.name===n)};
const tools=new SessionTools(host,{toolRegistry:registry,builtInToolNames:['read','write','task'],xdev,baseSystemPrompt:[],skillsReloadable:false});
const stale=tools.getEnabledToolNames().filter(n=>n!=='task');
registry.set('late_plugin',{...registry.get('task'),name:'late_plugin'});await tools.setActiveToolsByName([...tools.getEnabledToolNames(),'late_plugin']);assert(tools.getEnabledToolNames().includes('late_plugin'));
await tools.setActiveToolsByName(stale);assert(!tools.getEnabledToolNames().includes('late_plugin'));console.log('read-write-race late_plugin lost by stale complete replacement (expected API limitation)');
xdev.mountedNames.clear();await tools.setActiveToolsByName(stale);assert(tools.getActiveToolNames().includes('mounted'));assert.deepEqual(tools.getMountedXdevToolNames(),[]);console.log('partition-drift mounted becomes top-level when live mount membership disappears before set');
await tools.setActiveToolPresentation(stale,['mounted']);assert.deepEqual(tools.getMountedXdevToolNames(),['mounted']);console.log('internal presentation restore restores snapshotted mounted subset; extension API exposes names only');
await tools.setActiveToolsByName([...tools.getEnabledToolNames(),'unknown']);assert(!tools.getEnabledToolNames().includes('unknown'));console.log('unknown registry names ignored');
console.log('PASS explicit-only trusted fixture discovery and real installed API limitation checks; no model');
```

## Input fingerprints

Command: `sha256sum "$P"/{package.json,src/modes/runtime-init.ts,src/session/session-tools.ts,src/extensibility/extensions/runner.ts,src/tools/xdev.ts}` with `P=/root/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`.

```text
e145cd286ddee6c71c5fe07eef55aad0146f8163898fea54967f98fe77b1020c  package.json
b617b459ce64c86844434198bdc42c75ffaa5a9d2811e6b8355ee026b2efb526  src/modes/runtime-init.ts
0ebf14fb84b7b8debd7ee3057c45f6db3fb57cfd861370d7ff669cf0ad79fe84  src/session/session-tools.ts
0184a53dcbf9a5b543289bc84a8f32a8429b65c12489be17750c3256c7105b3a  src/extensibility/extensions/runner.ts
03973feef2ec1cdea04e0a79a6afc28e037fc16cfb07e0d039ebb710dde52fde  src/tools/xdev.ts
```

Fixture SHA-256 (final source embedded above):

```text
c7424104ec935ea81e2389fc35f46f0f4ae54d090dfa4cdde2ccd65f5ba17ecf  fixture.ts
164d448327de3ee7a5378aefed3f636c637a0f76cda9ff9f6fa48ca447f832c1  extra.ts
```

Scratch cleanup: after recording evidence, `rm -rf -- /tmp/omp-w15-6j2lXb` removed the fixtures, sentinels and scratch agent/home/cache/config/state/cwd. Only this new planning document is repository output. No implementation, permanent tests, README, AGENTS, ledger, commit or subagent changes.
