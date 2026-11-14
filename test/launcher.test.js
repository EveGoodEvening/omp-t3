'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { GET_COMMANDS_MARKER, MCP_CLIENT_MARKER } = require('../src/extension_compat.js');
const { createSubagentPolicy, subagentPolicyArgs } = require('../src/subagent_policy.js');

// Each fixture owns a scratch environment, literal fake OMP and rejecting gh.
// Observe natural process exit and assert ownership before cleanup can kill it.
async function runLauncher(t, scenario, args = [], overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-launch-'));
  const log = path.join(dir, 'launches.jsonl');
  const events = path.join(dir, 'events.jsonl');
  const fake = path.join(dir, 'omp');
  fs.writeFileSync(path.join(dir, 'gh'), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
  if (scenario.startsWith('earlier-')) {
    const oldCache = process.env.XDG_CACHE_HOME;
    try {
      process.env.XDG_CACHE_HOME = path.join(dir, 'earlier-cache');
      args = [...subagentPolicyArgs(createSubagentPolicy({ OMPT3_SUBAGENT_ALLOWED_MODELS: 'allowed' }), false).args, ...args];
    } finally {
      if (oldCache === undefined) delete process.env.XDG_CACHE_HOME;
      else process.env.XDG_CACHE_HOME = oldCache;
    }
  }
  if (scenario === 'legacy-channel') {
    const legacy = path.join(dir,'subagent-policy-legacy.ts');
    fs.writeFileSync(legacy, 'import {writeSync,closeSync} from "node:fs"; export default function(){if(process.env.OMPT3_REQUIRED_HOOK_FD==="3"){writeSync(3,"guard-ready\\n");closeSync(3);}}');
    args = ['--extension',legacy,...args];
  }
  const preload = path.join(dir,'exit-before-data.cjs');
  if (scenario === 'exit-before-data') fs.writeFileSync(preload, `
const cp = require('node:child_process'), original = cp.spawn;
cp.spawn = (...args) => {
 const child = original(...args), ack = child.stdio[3];
 if (!ack) return child;
 const emit = ack.emit, chunks = []; let exited = false;
 ack.emit = function(name,...values) {
   if (name === 'data' && !exited) { chunks.push(values); return true; }
   return emit.call(this,name,...values);
 };
 child.once('exit',()=>{exited=true;process.stderr.write('fixture: exit-before-ack-delivery\\n');queueMicrotask(()=>{for(const values of chunks) emit.call(ack,'data',...values);});});
 return child;
};`);
  fs.writeFileSync(fake, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const event = value => fs.appendFileSync(process.env.EVENT_LOG, JSON.stringify({...value,at:Date.now()})+'\\n');
fs.appendFileSync(process.env.LAUNCH_LOG, JSON.stringify(args)+'\\n');
event({type:'start',pid:process.pid});
process.on('exit', code => event({type:'exit',pid:process.pid,code}));
if (process.env.SCENARIO === 'interrupt') process.on('SIGTERM', () => {event({type:'signal',signal:'SIGTERM'});process.exit(42);});
(async () => {
 const scenario = process.env.SCENARIO;
 process.stdin.on('data', data => event({type:'rpc',data:String(data)}));
 if (scenario.startsWith('retained-')) {
   const holder = require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:['ignore',1,'ignore',3]});
   event({type:'holder',pid:holder.pid});
   if (scenario === 'retained-partial') fs.writeSync(3, '{"contract":');
   console.log(JSON.stringify({type:'ready',protocolVersion:1}));
   process.exit(7);
 }
 const originalWrite = fs.writeSync;
 if (scenario === 'fragmented-duplicate') fs.writeSync = (fd, bytes) => {
   if (fd !== 3) return originalWrite(fd,bytes);
   originalWrite(fd,bytes.slice(0,5));
   setTimeout(()=>{originalWrite(fd,bytes.slice(5));originalWrite(fd,bytes);},20);
   return bytes.length;
 };
 require('node:module').syncBuiltinESMExports();
 if (args.includes('--offline')) {console.error('Unexpected offline flag');process.exit(2);}
 const idx = args.indexOf('--tools');
 const list = idx < 0 ? args.find(a=>a.startsWith('--tools='))?.slice(8) : args[idx+1];
 if (scenario === 'invalid') {console.error('Unknown tools in --tools: '+list);process.exit(2);}
 for (let i=0;i<args.length;i++) {
   if (args[i] !== '--extension') continue;
   const file = args[++i];
   if (!file.includes('subagent-policy-')) {
     if (file.endsWith('.compat.ts')) {
       if (!fs.existsSync(file) || process.env.T3_PI_MCP_EXTENSION_PATH !== file) process.exit(91);
       event({type:'adapted',file});
     }
     continue;
   }
   if (scenario === 'earlier-missing' && !file.includes('earlier-cache')) continue;
   if (scenario === 'missing-hook') continue; // OMP can report load errors and continue.
   if (scenario === 'load-failure') fs.unlinkSync(file);
   const extension = await import(file);
   extension.default({on(){if(scenario === 'registration-failure') throw Error('registration rejected');},
     getActiveTools:()=>['read','task','custom'],setActiveTools:async()=>{}});
   event({type:'registered'});
 }
 if (['early-exit','immediate-exit','exit-before-data'].includes(scenario)) process.exit(7);
 setTimeout(()=>{
   console.log(JSON.stringify({type:'ready',protocolVersion:1}));
   if (!['interrupt','default-SIGTERM','default-SIGHUP','catalog-impossible'].includes(scenario)) setTimeout(()=>process.exit(0),80);
 }, scenario==='slow' ? 1100 : 10);
 if (scenario === 'catalog-impossible') {
   const frame={type:'response',command:'get_available_models',success:true,id:''};
   frame.id='界"\\\\\\n'+'i'.repeat(1048576-Buffer.byteLength(JSON.stringify({...frame,id:'界"\\\\\\n'})+'\\n'));
   process.stdout.write(JSON.stringify(frame)+'\\n');
   return;
 }
 process.stdin.resume();
})().catch(error=>{console.error(error);process.exit(2);});
`, { mode: scenario === 'non-executable' ? 0o644 : 0o755 });
  const child = spawn(process.execPath, [path.resolve('bin/omp-t3'), '--mode', 'rpc', ...args], {
    env: { PATH: `${dir}:${path.dirname(process.execPath)}:/usr/bin:/bin`,
      HOME: dir, XDG_CACHE_HOME: path.join(dir, 'cache'), XDG_CONFIG_HOME: path.join(dir, 'config'),
      XDG_STATE_HOME: path.join(dir, 'state'), PI_CONFIG_DIR: '.omp', PI_CODING_AGENT_DIR: path.join(dir, 'agent'),
      OMP_PATH: fake, OMPT3_DELEGATE_TASKS: '1', OMPT3_MAX_SUBAGENTS: '',
      OMPT3_SUBAGENT_ALLOWED_MODELS: '', OMPT3_SUBAGENT_DISALLOWED_MODELS: '',
      LAUNCH_LOG: log, EVENT_LOG: events, SCENARIO: scenario,
      ...(scenario === 'exit-before-data' ? {NODE_OPTIONS:'--require='+preload} : {}), ...overrides },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const started = Date.now();
  child.stdin.on('error', () => {}); // Queued input can race spawn refusal.
  child.stdin.write('{"type":"get_state","id":"proof"}\n');
  let stdout = '', stderr = '', signalled = false;
  const sibling = spawn(process.execPath, ['-e', 'process.stdin.resume()'], {
    env: { PATH: path.dirname(process.execPath), HOME: dir }, stdio: ['pipe','ignore','ignore']
  });
  const siblingExit = sibling && new Promise(resolve => sibling.once('exit', resolve));
  let shimExitMs;
  const exited = new Promise(resolve => child.once('exit', (code, signal) => {
    shimExitMs = Date.now() - started;
    resolve({ code, signal });
  }));
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stdout.on('data', data => {
    stdout += data;
    if (['interrupt','default-SIGTERM','default-SIGHUP'].includes(scenario) && !signalled && stdout.includes('"type":"ready"')) {
      signalled = true;
      child.kill(scenario.startsWith('default-') ? scenario.slice(8) : 'SIGTERM');
    }
  });
  child.stderr.on('data', data => { stderr += data; });
  let timer;
  t.after(async () => {
    clearTimeout(timer);
    child.kill('SIGKILL');
    await closed;
    if (sibling) { sibling.kill('SIGKILL'); await siblingExit; }
    if (fs.existsSync(events)) for (const row of fs.readFileSync(events,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)) {
      if (row.type === 'holder') { try { process.kill(row.pid, 'SIGKILL'); } catch {} }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const status = await Promise.race([exited, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error('Launcher exit timed out: ' + stderr)), 13000);
  })]);
  clearTimeout(timer);
  await closed;
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const history = read(events);
  // No harness termination has occurred at this point.
  for (const { pid } of history.filter(e => e.type === 'start')) {
    if (!scenario.startsWith('default-') && scenario !== 'catalog-impossible') assert(history.some(e => e.type === 'exit' && e.pid === pid), 'child exit event recorded before cleanup');
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }, 'owned final child reaped before cleanup');
  }
  if (sibling) { assert.equal(sibling.exitCode, null); assert.equal(sibling.signalCode, null); process.kill(sibling.pid, 0); }
  const elapsed = Date.now() - started;
  for (const row of history.filter(e => e.type === 'holder')) process.kill(row.pid, 0);
  const mainExitMs = history.find(e => e.type === 'exit')?.at - started;
  if (Number.isFinite(mainExitMs)) assert(mainExitMs <= shimExitMs, 'main exit precedes shim exit and cleanup');
  return { stdout, stderr, launches: read(log), history, status, elapsed, mainExitMs, shimExitMs };
}

test('sole final child reaches readiness beyond the former 900ms cutoff', async t => {
  const r = await runLauncher(t, 'slow', ['--append-system-prompt', 'USER RULE']);
  assert.match(r.stdout, /"type":"ready"/);
  assert.equal(r.launches.length, 1);
  assert(!r.launches[0].includes('--tools'));
  assert(r.launches[0].some(a => a.startsWith('USER RULE\n\n')));
  assert.equal(r.status.code, 0);
});

for (const [label, flags, env] of [
  ['routing', [], {}], ['opt-out', [], { OMPT3_DELEGATE_TASKS: '0' }],
  ['explicit', ['--tools=task'], {}]
]) test('offline discovery reaches ready on ' + label, async t => {
  const r = await runLauncher(t, 'normal', ['--no-session', '--offline', ...flags], env);
  assert.match(r.stdout, /"type":"ready"/);
  assert.equal(r.launches.length, 1);
  assert(r.launches[0].includes('--no-session'));
  assert(!r.launches[0].includes('--offline'));
  assert.equal(r.status.code, 0);
});

for (const flags of [['--tools','read,missing'], ['--tools=read,missing'], ['--tools',''], ['--tools=']]) {
  test('explicit invalid tools retain argv and natural exit: ' + JSON.stringify(flags), async t => {
    const r = await runLauncher(t, 'invalid', [...flags, '--append-system-prompt=USER RULE']);
    assert.deepEqual(r.launches, [['--mode','rpc-ui',...flags,'--append-system-prompt=USER RULE']]);
    assert.equal(r.status.code, 2);
    assert.match(r.stderr, /Unknown tools/);
  });
}

test('final-child spawn error is bounded and handled', async t => {
  const r = await runLauncher(t, 'non-executable');
  assert.equal(r.launches.length, 0);
  assert.equal(r.status.code, 1);
  assert.match(r.stderr, /OMP process error/);
  assert.doesNotMatch(r.stderr, /Unhandled 'error' event/);
});

test('signal exits the sole final child naturally without replacement or sibling damage', async t => {
  const r = await runLauncher(t, 'interrupt');
  assert.equal(r.launches.length, 1);
  assert(r.history.some(e => e.type === 'signal' && e.signal === 'SIGTERM'));
  assert(r.history.some(e => e.type === 'exit' && e.code === 42));
  assert.equal(r.status.code, 42);
});

test('child startup failure keeps its natural status, without retry', async t => {
  const r = await runLauncher(t, 'early-exit');
  assert.equal(r.status.code, 7);
  assert.equal(r.launches.length, 1);
});

for (const scenario of ['load-failure', 'registration-failure', 'missing-hook']) {
  test('required generated-hook ' + scenario + ' refuses unguarded readiness', async t => {
    const r = await runLauncher(t, scenario);
    assert.equal(r.launches.length, 1);
    assert.equal(r.status.code, 1);
    assert.doesNotMatch(r.stdout, /"type":"ready"/);
    assert.match(r.stderr, /Launch refused/);
  });
}

test('active-policy incompatible bridge refuses before any OMP launch', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-drift-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'pi-t3-mcp-extension.ts');
  fs.writeFileSync(file, 'export default function changedUpstream() {}');
  const r = await runLauncher(t, 'normal', ['--extension', file], { OMPT3_SUBAGENT_ALLOWED_MODELS: 'allowed' });
  assert.equal(r.launches.length, 0);
  assert.equal(r.status.code, 1);
  assert.match(r.stderr, /Launch refused/);
});

test('adaptation finishes before sole final child and preserves original extension', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-adapt-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'pi-t3-mcp-extension.ts');
  const source = `function setup(pi) { ${GET_COMMANDS_MARKER}\n${MCP_CLIENT_MARKER}\n}`;
  fs.writeFileSync(file, source);
  const r = await runLauncher(t, 'normal', ['--extension', file]);
  assert.equal(r.status.code, 0);
  assert.equal(r.launches.length, 1);
  assert(r.history.some(e => e.type === 'adapted'));
  assert.equal(fs.readFileSync(file, 'utf8'), source);
});

test('malformed policy refuses before OMP', async t => {
  const r = await runLauncher(t, 'normal', [], { OMPT3_SUBAGENT_ALLOWED_MODELS: 'allowed,' });
  assert.equal(r.launches.length, 0);
  assert.equal(r.status.code, 1);
});

for (const active of [false, true]) test('required cache failure refuses before OMP; policy=' + active, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-cache-failure-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const blocker = path.join(dir, 'file');
  fs.writeFileSync(blocker, 'not a directory');
  const r = await runLauncher(t, 'normal', [], { XDG_CACHE_HOME: blocker, OMPT3_SUBAGENT_ALLOWED_MODELS: active ? 'allowed' : '' });
  assert.equal(r.launches.length, 0);
  assert.equal(r.status.code, 1);
});

test('routing opt-out and cleared policy retain stock launch', async t => {
  const r = await runLauncher(t, 'normal', ['--tools=task', '--append-system-prompt', 'USER RULE'], { OMPT3_DELEGATE_TASKS: '0' });
  assert.deepEqual(r.launches, [['--mode','rpc-ui','--tools=task','--append-system-prompt','USER RULE']]);
  assert.equal(r.status.code, 0);
});

for (const scenario of ['retained-noack','retained-partial','earlier-missing']) {
  test('required identity refuses with no admission before cleanup: ' + scenario, async t => {
    const r = await runLauncher(t, scenario);
    assert.equal(r.status.code, 1);
    assert.equal(r.launches.length, 1);
    assert.equal(r.stdout, '');
    assert(!r.history.some(e => e.type === 'rpc'));
    assert.match(r.stderr, /Launch refused.*owned OMP exit observed/);
    if (scenario.startsWith('retained-')) {
      assert(r.elapsed >= 10000 && r.elapsed < 12000, '10s registration plus 250ms owner observation');
    }
    console.log(JSON.stringify({scenario,elapsed:r.elapsed,mainExitMs:r.mainExitMs,shimExitMs:r.shimExitMs,status:r.status,mainReaped:true,siblingAlive:true,holdersAlive:r.history.filter(e=>e.type==='holder').length}));
  });
}

for (const scenario of ['earlier-correct','fragmented-duplicate','immediate-exit','exit-before-data','legacy-channel']) {
  test('exact required source registration succeeds: ' + scenario, async t => {
    const r = await runLauncher(t, scenario, [], scenario === 'legacy-channel' ? {OMPT3_REQUIRED_HOOK_FD:'3'} : {});
    assert.equal(r.status.code, ['immediate-exit','exit-before-data'].includes(scenario) ? 7 : 0, r.stderr);
    assert.equal(r.launches.length, 1);
    assert.doesNotMatch(r.stderr, /Launch refused/);
    if (!['immediate-exit','exit-before-data'].includes(scenario)) assert.match(r.stdout, /"type":"ready"/);
    if (scenario === 'exit-before-data') assert.match(r.stderr,/fixture: exit-before-ack-delivery/);
  });
}

for (const signal of ['SIGTERM','SIGHUP']) {
  test('default child ' + signal + ' remains non-success and reaped', async t => {
    const r = await runLauncher(t, 'default-' + signal);
    assert.deepEqual(r.status, {code:null,signal});
    assert.equal(r.launches.length, 1);
  });
}

test('unrepresentable catalog failure terminates owned main nonzero before cleanup', async t => {
  const r = await runLauncher(t,'catalog-impossible');
  assert.equal(r.status.code,1);
  assert.equal(r.launches.length,1);
  assert.doesNotMatch(r.stdout, /get_available_models/);
  assert.match(r.stderr,/correlated error exceeds.*owned OMP exit observed/);
  console.log(JSON.stringify({scenario:'catalog-impossible',elapsed:r.elapsed,status:r.status,mainReaped:true,siblingAlive:true}));
});
