'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { createProxyPipeline, createProviderOwner } = require('../src/proxy.js');
const { mkdtempSync, readFileSync, existsSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// No installed OMP, shell, model, credentials or process-group signals. EOF
// deliberately drains queued work; TERM deliberately does nothing.
const PROGRAM = `
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const marker = process.argv[1], mode = process.argv[2];
process.on('SIGTERM', () => {});
const pipeHolder = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: ['ignore', 'inherit', 'ignore'] });
// Language-level hazard model: accepted serial work waits behind a blocked
// operation, then EOF drains it. This is not OMP's queue implementation.
const queued = [() => fs.appendFileSync(marker, 'QUEUED_WORK\\n')];
process.stdin.on('end', () => { for (const execute of queued) execute(); });
let buffer = '';
process.stdin.on('data', chunk => {
  buffer += chunk;
  const parts = buffer.split('\\n'); buffer = parts.pop();
  for (const s of parts) {
    const req = JSON.parse(s);
    if (req.type !== 'abort_and_restore_queue') continue;
    fs.appendFileSync(marker + '.accepted', 'accepted\\n');
    // Completion, unlike file existence, witnesses acceptance before an
    // externally injected fault can SIGKILL this process between open/write.
    process.send?.({ type: 'fixture_accepted' });
    process.stdout.write(JSON.stringify({type:'agent_start'}) + '\\n');
    if (mode === 'output-pressure') process.stdout.write(JSON.stringify({type:'message_update',text:'x'.repeat(512*1024)})+'\\n');
    const reply = { type: 'response', command: req.type, id: req.id, success: true, data: { steering: [], followUp: [] } };
    if (mode === 'unsupported') { reply.success = false; reply.error = 'Unknown command: abort_and_restore_queue'; }
    if (mode === 'partial') { fs.appendFileSync(marker + '.withdrawn', 'withdrawn\\n'); reply.success = false; reply.error = 'generic failure after withdrawal'; }
    if (mode === 'malformed') reply.data.followUp = [null];
    if (mode === 'overflow') reply.padding = 'x'.repeat(1024 * 1024);
    if (['unsupported', 'partial', 'malformed', 'overflow', 'release-pressure', 'release-throw', 'release-async-error', 'release-never-ack'].includes(mode)) {
      if (mode.startsWith('release-')) {
        process.stdout.write(JSON.stringify({type:'response',command:'get_state',id:'held',success:false,error:'x'.repeat(512*1024)})+'\\n');
        process.stdout.write(JSON.stringify({type:'agent_settled'})+'\\n');
      }
      process.stdout.write(JSON.stringify(reply) + '\\n');
    }
  }
});
process.stdout.write(JSON.stringify({type:'fixture_ready', pipeHolder:pipeHolder.pid}) + '\\n');
setInterval(() => {}, 1000);
`;

for (const mode of ['unsupported', 'partial', 'malformed', 'timeout', 'EOF', 'write', 'overflow',
  'client-EOF', 'client-error', 'readable-error', 'output-error', 'output-close',
  'output-pressure', 'release-pressure', 'release-throw', 'input-pressure', 'input-throw',
  'release-async-error', 'release-never-ack', 'ordinary-client-error', 'ordinary-readable-error',
  'ordinary-output-error', 'ordinary-stdin-error']) {
  test(`owned main process: ${mode} kills before EOF and bounds transport despite retained pipe/nonreader`, { timeout: 4000 }, async (t) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'omp-stop-owner-'));
    const marker = path.join(dir, 'queued');
    const child = spawn(process.execPath, ['-e', PROGRAM, marker, mode], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'], env: {} });
    const events = [], diagnostics = [];
    let actualExit;
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => { actualExit = { code, signal }; events.push('exit'); resolve(); }));
    child.once('close', () => events.push('close'));
    const kill = child.kill.bind(child);
    child.kill = (signal) => { events.push(signal); return kill(signal); };
    const destroy = child.stdin.destroy.bind(child.stdin);
    child.stdin.destroy = (...args) => { events.push('stdin-close'); return destroy(...args); };
    let finish;
    const finished = new Promise((resolve) => { finish = (code) => { events.push('finish'); resolve(code); }; });
    let expiry;
    const clock = { setTimeout(fn, ms) { expiry = ms; return setTimeout(fn, ms); } };
    let detectedAt;
    const owner = createProviderOwner(child, { finish: (code) => finish(code), diagnose: (message) => diagnostics.push(message), clock });
    // A client that never consumes or acknowledges output must not hold exit.
    let holder, holderAliveAtFinish = false;
    const clientIn = new PassThrough();
    const seen = [];
    let retainedCallback, settled = 0;
    const clientOut = new Writable({ highWaterMark: mode === 'release-async-error' || mode === 'release-never-ack' ? 1024 * 1024 : 1024, write(chunk, _, done) {
      const frame = JSON.parse(chunk);
      seen.push(frame);
      if (['release-async-error', 'release-never-ack'].includes(mode) && frame.id === 'held') {
        retainedCallback = done;
        if (mode === 'release-async-error') setImmediate(() => done(Error('asynchronous retained state')));
        return;
      }
      if (mode === 'output-pressure' || (mode === 'release-pressure' && frame.id === 'held')) return;
      done();
      if (mode.startsWith('release-') && frame.command === 'clear_queue') {
        clientIn.write('{"type":"abort","id":"follower"}\n');
      }
    } });
    const outputWrite = clientOut.write.bind(clientOut);
    clientOut.write = (chunk, completed) => {
      if (mode === 'release-throw' && JSON.parse(chunk).id === 'held') throw Error('release write');
      return outputWrite(chunk, completed);
    };
    const blockedInput = mode === 'input-pressure' ? new Writable({ highWaterMark: 1, write() {} }) : child.stdin;
    // End the proxy-facing readable independently of the descendant-held OS
    // pipe, so this tests EOF rather than accidentally waiting for timeout.
    const childOutput = mode === 'EOF' ? new PassThrough() : child.stdout;
    const pipeline = createProxyPipeline({ clientIn, clientOut, childIn: blockedInput, childOut: childOutput,
      doctor: { observeDownstream() {}, noteSettled() { settled++; }, stop() {} }, onFatalStop(reason) {
        detectedAt = performance.now(); events.push('detect');
        owner.fail(reason);
      } });
    const ownerFinish = finish;
    finish = (code) => {
      try { process.kill(holder, 0); holderAliveAtFinish = true; } catch {}
      assert.ok(!events.includes('close'), 'descendant still retains child output at finish');
      ownerFinish(code);
    };
    try {
      // Read startup readiness before constructing readline, without consuming
      // any real atomic output. Synthetic process is ready to model EOF drain.
      await new Promise((resolve, reject) => { child.once('error', reject); child.stdout.once('data', (chunk) => {
        holder = JSON.parse(chunk.toString().split('\n')[0]).pipeHolder; resolve();
      }); });
      if (mode === 'EOF') child.stdout.pipe(childOutput);
      pipeline.start();
      child.stdout.emit('data', Buffer.from('{"type":"agent_start"}\n'));
      // Subscribe before sending Stop; use a separate channel so output
      // backpressure/EOF injection cannot consume or block the witness.
      // The test's existing deadline also bounds this wait and its teardown.
      const needsAcceptance = ['EOF', 'write', 'client-EOF', 'client-error', 'readable-error', 'output-error', 'output-close',
        'output-pressure', 'input-throw'].includes(mode);
      const accepted = needsAcceptance ? once(child, 'message', { signal: t.signal }) : null;
      if (mode.startsWith('ordinary-')) {
        if (mode === 'ordinary-client-error') clientIn.emit('error', Error('ordinary client readable'));
        if (mode === 'ordinary-readable-error') child.stdout.emit('error', Error('ordinary child readable'));
        if (mode === 'ordinary-output-error') clientOut.emit('error', Error('ordinary client output'));
        if (mode === 'ordinary-stdin-error') child.stdin.emit('error', Error('ordinary child input'));
      } else clientIn.write('{"type":"clear_queue","id":0}\n');
      if (needsAcceptance) {
        const [witness] = await accepted;
        assert.deepEqual(witness, { type: 'fixture_accepted' });
        if (mode === 'write') child.stdin.emit('error', Error('synthetic write failure'));
        if (mode === 'EOF') childOutput.end();
        if (mode === 'client-EOF') clientIn.end();
        if (mode === 'client-error') clientIn.emit('error', Error('synthetic client readable'));
        if (mode === 'readable-error') child.stdout.emit('error', Error('synthetic child readable'));
        if (mode === 'output-error') clientOut.emit('error', Error('synthetic client output'));
        if (mode === 'output-close') clientOut.destroy();
        if (mode === 'output-pressure') child.stdout.emit('data', Buffer.from(JSON.stringify({type:'message_update',text:'x'.repeat(65536)})+'\n'));
        if (mode === 'input-throw') {
          child.stdin.write = () => { throw Error('synthetic input throw'); };
          clientIn.write('{"type":"get_messages","id":"trigger"}\n');
        }
      }
      const code = await finished;
      await exited;
      assert.equal(code, 1);
      assert.ok(performance.now() - detectedAt >= 200, 'observed grace, not callback-count evidence');
      assert.ok(performance.now() - detectedAt < 1500, 'qualified scheduler bound for 250 ms finish');
      assert.ok(holderAliveAtFinish, 'retained-pipe descendant survives through provider finish');
      assert.ok(events.indexOf('detect') < events.indexOf('SIGKILL'));
      assert.ok(events.indexOf('SIGKILL') < events.indexOf('exit'));
      assert.ok(events.indexOf('exit') < events.indexOf('finish'));
      assert.equal(expiry, 250);
      if (mode === 'release-async-error' || mode === 'release-never-ack') {
        assert.equal(typeof retainedCallback, 'function');
        assert.equal(settled, 0);
        assert.ok(!seen.some((frame) => frame.type === 'agent_settled'), 'queued terminal never entered _write');
        assert.ok(diagnostics.some((s) => s.includes(mode === 'release-async-error' ? 'asynchronous retained state' : 'release output deadline')));
      }
      if (mode === 'output-pressure' || mode === 'release-pressure') assert.ok(clientOut.writableNeedDrain);
      assert.equal(actualExit.signal, 'SIGKILL');
      assert.equal(owner.exited, true);
      assert.equal(events.filter((e) => e === 'SIGKILL').length, 1);
      assert.ok(events.indexOf('SIGKILL') < events.indexOf('stdin-close'));
      if (mode === 'EOF') assert.ok(diagnostics.some((s) => s.includes('OMP stdout EOF')));
      assert.ok(!events.includes('SIGTERM'));
      if (mode !== 'input-pressure' && !mode.startsWith('ordinary-')) assert.equal(readFileSync(marker + '.accepted', 'utf8'), 'accepted\n');
      assert.equal(existsSync(marker), false, 'modeled EOF-drained accepted work never executed');
      if (mode === 'partial') assert.ok(existsSync(marker + '.withdrawn'));
      assert.ok(diagnostics.some((s) => s.includes('exit observed')));
    } finally {
      pipeline.stop();
      if (!actualExit) { kill('SIGKILL'); await exited; }
      child.stdout.destroy(); child.stderr.destroy();
      if (holder) { try { process.kill(holder, 'SIGKILL'); } catch {} }
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('owner reports unconfirmed exit honestly and finishes at the fixed grace without waiting for close', () => {
  const { EventEmitter } = require('node:events');
  const child = new EventEmitter();
  const events = [];
  Object.assign(child, { exitCode: null, signalCode: null,
    kill(signal) { events.push(signal); return false; }, stdin: { destroy() { events.push('EOF'); } }, stdout: { destroy() {} } });
  let expire, delay, code;
  const messages = [];
  const owner = createProviderOwner(child, { finish: (value) => { code = value; }, diagnose: (s) => messages.push(s),
    clock: { setTimeout(fn, ms) { expire = fn; delay = ms; } } });
  owner.fail('synthetic'); owner.fail('duplicate');
  assert.deepEqual(events, ['SIGKILL']); assert.equal(delay, 250); assert.equal(code, undefined);
  child.emit('close'); assert.equal(owner.exited, false);
  expire(); assert.deepEqual(events, ['SIGKILL', 'EOF']); assert.equal(code, 1);
  assert.ok(messages[0].includes('termination unconfirmed'));
});

for (const mode of ['unsupported', 'timeout', 'output-pressure', 'release-pressure', 'release-async-error', 'release-never-ack',
  'ordinary-client-error', 'ordinary-readable-error', 'ordinary-output-error']) test(`provider subprocess exits nonzero with a non-reading client (${mode})`, { timeout: 5000 }, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'omp-provider-exit-'));
  const marker = path.join(dir, 'queued');
  const providerProgram = `
    const fs = require('node:fs');
    const { spawn } = require('node:child_process');
    const { createProxyPipeline, createProviderOwner } = require(${JSON.stringify(path.resolve('src/proxy.js'))});
    const { Writable } = require('node:stream');
    const marker = process.argv[1], mode = process.argv[2];
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(PROGRAM)}, marker, mode], {stdio:['pipe','pipe','ignore'],env:{}});
    const kill = child.kill.bind(child);
    child.kill = (signal) => { fs.appendFileSync(marker+'.events', signal+'\\n'); return kill(signal); };
    const destroy = child.stdin.destroy.bind(child.stdin);
    child.stdin.destroy = (...args) => { fs.appendFileSync(marker+'.events', 'EOF\\n'); return destroy(...args); };
    let holder;
    const owner = createProviderOwner(child, {finish: code => {
      process.kill(holder, 0);
      fs.writeFileSync(marker+'.alive-at-finish', 'alive');
      process.exit(code);
    }, diagnose: message => fs.appendFileSync(marker+'.diagnostic', message+'\\n')});
    child.stdout.once('data', (chunk) => {
      holder = JSON.parse(chunk.toString().split('\\n')[0]).pipeHolder;
      fs.writeFileSync(marker+'.holder', String(JSON.parse(chunk.toString().split('\\n')[0]).pipeHolder));
      const output = ['release-async-error', 'release-never-ack'].includes(mode) ? new Writable({
        highWaterMark: 1024 * 1024, write(chunk, _, done) {
          const frame = JSON.parse(chunk);
          if (frame.id === 'held') {
            fs.writeFileSync(marker+'.admitted', 'write-true');
            if (mode === 'release-async-error') setImmediate(() => done(Error('async retained state')));
            return;
          }
          if (frame.type === 'agent_settled') fs.writeFileSync(marker+'.terminal', 'unexpected terminal');
          done();
        }
      }) : process.stdout;
      const p = createProxyPipeline({clientIn:process.stdin,clientOut:output,childIn:child.stdin,childOut:child.stdout,
        doctor:{observeDownstream(){},noteSettled(){fs.writeFileSync(marker+'.settled', 'unexpected settle');},stop(){}},onFatalStop:owner.fail});
      p.start();
      // Put the terminal after the retained state, not the idle-abort terminal
      // synthesized at acceptance. The callback fault must block _write entry.
      if (['release-async-error', 'release-never-ack'].includes(mode)) child.stdout.emit('data', Buffer.from('{"type":"agent_start"}\\n'));
      process.stderr.write('READY\\n');
      if (mode.startsWith('ordinary-')) setImmediate(() => {
        const stream = mode === 'ordinary-client-error' ? process.stdin : mode === 'ordinary-readable-error' ? child.stdout : output;
        stream.emit('error', Error(mode));
      });
    });
  `;
  const provider = spawn(process.execPath, ['-e', providerProgram, marker, mode], { stdio: ['pipe', 'pipe', 'pipe'], env: {} });
  // This independent owned sibling proves no inherited/global process group
  // was signaled by the provider's failure policy.
  const sibling = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', env: {} });
  try {
    await new Promise((resolve, reject) => { provider.once('error', reject); provider.stderr.once('data', resolve); });
    const exit = new Promise((resolve) => provider.once('exit', (code, signal) => resolve({ code, signal })));
    if (!mode.startsWith('ordinary-')) provider.stdin.write('{"type":"clear_queue","id":"clear"}\n');
    if (mode.startsWith('release-')) provider.stdin.write('{"type":"abort","id":"early"}\n');
    // Deliberately never read provider.stdout or close provider.stdin.
    const observed = await exit;
    assert.deepEqual(observed, { code: 1, signal: null });
    const events = readFileSync(marker + '.events', 'utf8').trim().split('\n');
    assert.equal(events[0], 'SIGKILL');
    assert.ok(events.indexOf('EOF') > 0);
    assert.ok(readFileSync(marker + '.diagnostic', 'utf8').includes('exit observed'));
    assert.equal(existsSync(marker), false);
    assert.equal(readFileSync(marker + '.alive-at-finish', 'utf8'), 'alive');
    if (mode.endsWith('pressure')) assert.ok(readFileSync(marker + '.diagnostic', 'utf8').includes('backpressure'));
    if (['release-async-error', 'release-never-ack'].includes(mode)) {
      assert.equal(readFileSync(marker + '.admitted', 'utf8'), 'write-true');
      assert.equal(existsSync(marker + '.terminal'), false);
      assert.equal(existsSync(marker + '.settled'), false);
      assert.ok(readFileSync(marker + '.diagnostic', 'utf8').includes(mode === 'release-async-error' ? 'async retained state' : 'release output deadline'));
    }
    assert.equal(sibling.exitCode, null);
    assert.equal(sibling.signalCode, null);
  } finally {
    provider.kill('SIGKILL'); sibling.kill('SIGKILL');
    provider.stdin.destroy(); provider.stdout.destroy(); provider.stderr.destroy();
    if (existsSync(marker + '.holder')) {
      try { process.kill(Number(readFileSync(marker + '.holder', 'utf8')), 'SIGKILL'); } catch {}
    }
    await new Promise((resolve) => { if (sibling.exitCode !== null || sibling.signalCode !== null) resolve(); else sibling.once('exit', resolve); });
    rmSync(dir, { recursive: true, force: true });
  }
});
