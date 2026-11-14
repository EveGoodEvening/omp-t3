'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough, Writable } = require('node:stream');
const { createProxyPipeline } = require('../src/proxy.js');
const { FRAME_BYTES, TERMINAL_BYTES } = require('../src/queue.js');

const line = (f) => JSON.stringify(f) + '\n';
const tick = () => new Promise((resolve) => setImmediate(resolve));
class Clock {
  constructor() { this.now = 0; this.timers = new Set(); }
  setTimeout(fn, ms) { const timer = { fn, at: this.now + ms }; this.timers.add(timer); return timer; }
  clearTimeout(timer) { this.timers.delete(timer); }
  advance(ms) {
    const end = this.now + ms;
    for (;;) {
      const next = [...this.timers].filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.now = next.at; this.timers.delete(next); next.fn();
    }
    this.now = end;
  }
}
function fixture(options = {}) {
  const clientIn = new PassThrough();
  const childIn = options.childIn || new PassThrough();
  const childOut = new PassThrough();
  const output = [], requests = [], failures = [];
  const clock = new Clock();
  let settled = 0;
  const doctor = { observeDownstream() {}, stop() {}, noteSettled() { settled++; } };
  const clientOut = options.clientOut || new Writable({ highWaterMark: 4 * FRAME_BYTES, write(chunk, _, done) {
    for (const s of chunk.toString().trimEnd().split('\n')) output.push(JSON.parse(s));
    done();
  } });
  // The ordinary deterministic fixture acknowledges its synchronous sink.
  // Completion/failure regressions below instead inject actual Node Writables.
  if (!options.clientOut) clientOut.write = (chunk, completed) => {
    clientOut._write(Buffer.from(chunk), 'utf8', (error) => completed?.(error));
    return true;
  };
  let input = '';
  if (!options.childIn) childIn.on('data', (chunk) => {
    input += chunk;
    const parts = input.split('\n'); input = parts.pop();
    for (const s of parts) requests.push(JSON.parse(s));
  });
  const pipeline = createProxyPipeline({ clientIn, clientOut, childIn, childOut, clock, doctor,
    onFatalStop(reason) { failures.push(reason); childIn.destroy(); } });
  pipeline.start();
  const send = (frame) => clientIn.write(line(frame));
  const receive = (...frames) => childOut.write(frames.map(line).join(''));
  const atomic = () => requests.filter((f) => f.type === 'abort_and_restore_queue').at(-1);
  const result = (data = { steering: [], followUp: [] }, extra = {}) => ({ type: 'response', command: 'abort_and_restore_queue', id: atomic().id, success: true, data, ...extra });
  return { pipeline, send, receive, atomic, result, output, requests, failures, clock, doctor, clientIn, childIn, childOut, clientOut,
    get settled() { return settled; }, close() { pipeline.stop(); } };
}

// Release-source predicate: adapter.ts t3.settle_probe uses recordField !== true
// and (recordNumber(pendingMessageCount) ?? 0) === 0. Failed pre-activity
// probes finalize; the last post-activity failure terminates the connection.
class Consumer {
  constructor(f, { activity = false, attempt = 3 } = {}) {
    this.f = f; this.activeTurn = { id: 'turn', generation: 1, activity, compaction: null };
    this.waiters = new Map(); this.notices = []; this.events = []; this.terminated = false;
    this.attempt = attempt; this.permit = Promise.resolve(); this.offset = 0;
  }
  request(frame) {
    assert.equal(typeof frame.id, 'string', 'T3 waiters use exact string IDs');
    const promise = new Promise((resolve, reject) => this.waiters.set(frame.id, { resolve, reject }));
    this.f.send(frame); return promise;
  }
  notice(message, turn) {
    this.permit = this.permit.then(() => {
      if (this.activeTurn === turn) { this.notices.push(message); this.events.push('notice'); }
    });
    return this.permit;
  }
  stop() {
    const turn = this.activeTurn;
    return this.request({ type: 'clear_queue', id: 'clear' }).then(async (data) => {
      const texts = [...data.steering, ...data.followUp].filter((x) => typeof x === 'string');
      if (texts.length) await this.notice(texts.filter((text) => text.length > 0).join('\n').slice(0, 2000), turn);
      await this.request({ type: 'abort', id: 'abort' });
    });
  }
  probe(id, post = this.activeTurn.activity, attempt = this.attempt) {
    const providerTurnId = this.activeTurn.id, generation = this.activeTurn.generation;
    const handle = (data, failed) => {
      this.permit = this.permit.then(() => {
        const turn = this.activeTurn;
        if (!turn || turn.id !== providerTurnId || generation !== turn.generation || turn.compaction || (!post && turn.activity)) return;
        if (failed && post) {
          if (attempt >= 3) { this.terminated = true; this.events.push('terminate'); }
          else this.f.clock.setTimeout(() => {
            if (this.activeTurn?.id === providerTurnId) this.probe(id + '-retry', true, attempt + 1);
          }, 100);
          return;
        }
        const number = typeof data?.pendingMessageCount === 'number' && Number.isFinite(data.pendingMessageCount) ? data.pendingMessageCount : undefined;
        if (failed || (data?.isStreaming !== true && data?.isCompacting !== true && (number ?? 0) === 0)) {
          this.activeTurn = null; this.events.push('finalize');
        }
      });
    };
    this.request({ type: 'get_state', id }).then((data) => handle(data, false), () => handle(undefined, true));
  }
  // Parse the entire available line batch before any awaited-clear continuation.
  parse() {
    for (const frame of this.f.output.slice(this.offset)) {
      if (frame.type === 'response' && typeof frame.id === 'string' && this.waiters.has(frame.id)) {
        const waiter = this.waiters.get(frame.id); this.waiters.delete(frame.id);
        if (frame.success === true) waiter.resolve(frame.data); else waiter.reject(Error(frame.error));
      } else if (frame.type === 'extension_ui_request' && frame.method === 'notify') {
        this.notice(frame.message, this.activeTurn);
      } else if (frame.type === 'agent_settled') {
        const turn = this.activeTurn;
        this.permit = this.permit.then(() => { if (turn && this.activeTurn === turn) { this.activeTurn = null; this.events.push('finalize'); } });
      }
    }
    this.offset = this.f.output.length;
  }
}

for (const failed of [false, true]) for (const activity of [false, true]) for (const position of ['before', 'after', 'split']) {
  test(`consumer notice precedes ${failed ? 'failed' : 'idle'} ${activity ? 'post' : 'pre'}-activity probe (${position})`, async () => {
    const f = fixture();
    try {
      const consumer = new Consumer(f, { activity });
      consumer.probe('probe'); // independent already-issued waiter
      const stopped = consumer.stop();
      const probe = { type: 'response', command: 'get_state', id: 'probe', success: !failed,
        ...(failed ? { error: 'synthetic probe failure' } : { data: {} }) };
      const success = f.result({ steering: ['queued'], followUp: [] });
      const terminal = { type: 'agent_settled' };
      if (position === 'before') f.receive(probe, success, terminal);
      if (position === 'after') f.receive(success, terminal, probe);
      if (position === 'split') {
        f.receive(success); consumer.parse();
        await tick();
        f.receive(probe); consumer.parse();
        await tick();
        f.receive(terminal);
      }
      consumer.parse();
      await tick(); // clear continuation consumes notice permit, then sends follower
      consumer.parse();
      await tick(); await stopped; await consumer.permit;
      assert.equal(consumer.notices[0], 'queued');
      assert.equal(consumer.events[0], 'notice');
      assert.equal(f.requests.filter((r) => r.type === 'abort_and_restore_queue').length, 1);
      assert.equal(f.failures.length, 0);
      assert.ok(consumer.events.slice(1).some((event) => event === 'terminate' || event === 'finalize'));
    } finally { f.close(); }
  });
}

test('lone abort notifies text/loss before same-chunk failed probe or terminal without fabricated clear', async () => {
  const f = fixture();
  try {
    const c = new Consumer(f); c.probe('probe');
    const done = c.request({ type: 'abort', id: 'lone' });
    f.receive(f.result({ steering: ['', 'same', 'same', { text: ' 日 ', images: [{}] }], followUp: ['later'], truncated: true }),
      { type: 'response', command: 'get_state', id: 'probe', success: false, error: 'failure' }, { type: 'agent_settled' });
    c.parse(); await tick(); await done; await c.permit;
    assert.equal(c.events[0], 'notice');
    assert.ok(c.notices.some((s) => s.includes('Images')));
    assert.ok(c.notices.some((s) => s.includes('same')));
    assert.ok(!f.output.some((r) => r.command === 'clear_queue'));
    assert.deepEqual(f.output.find((r) => r.command === 'abort').data.steering, ['', 'same', 'same', ' 日 ']);
  } finally { f.close(); }
});

for (const position of ['before', 'after']) test(`eligible last post-activity failure terminates only after notice (${position})`, async () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    const c = new Consumer(f, { activity: true }); c.probe('probe');
    const stopped = c.stop();
    const probe = { type: 'response', command: 'get_state', id: 'probe', success: false, error: 'failure' };
    if (position === 'before') f.receive(probe, f.result({ steering: ['queued'], followUp: [] }));
    else f.receive(f.result({ steering: ['queued'], followUp: [] }), probe);
    c.parse(); await tick(); c.parse(); await tick(); await stopped; await c.permit;
    assert.deepEqual(c.events, ['notice', 'terminate']);
    assert.ok(c.activeTurn, 'post-activity failure branch is transport termination, not direct finalize');
  } finally { f.close(); }
});

test('consumer lower post-activity failures retain the 100 ms retry, not a Stop retry', async () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    const c = new Consumer(f, { activity: true, attempt: 2 }); c.probe('probe');
    const stopped = c.stop();
    f.receive(f.result({ steering: ['queued'], followUp: [] }),
      { type: 'response', command: 'get_state', id: 'probe', success: false, error: 'failure' });
    c.parse(); await tick(); c.parse(); await tick(); await stopped; await c.permit;
    f.clock.advance(99); assert.ok(!f.requests.some((r) => r.id === 'probe-retry'));
    f.clock.advance(1); assert.ok(f.requests.some((r) => r.id === 'probe-retry'));
    assert.equal(f.requests.filter((r) => r.type === 'abort_and_restore_queue').length, 1);
  } finally { f.close(); }
});

for (const id of [undefined, null, 0, '0']) test(`Stop identity ${String(id)} preserves presence and type`, () => {
  const f = fixture();
  try {
    const request = { type: 'abort' }; if (id !== undefined) request.id = id;
    f.send(request); f.receive(f.result());
    const response = f.output.find((r) => r.command === 'abort');
    assert.equal(Object.hasOwn(response, 'id'), id !== undefined); assert.equal(response.id, id);
    assert.equal(f.settled, 1);
  } finally { f.close(); }
});

test('overlap, mutation-attempt invalidation and namespace ownership are bounded', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: null });
    const id = f.atomic().id;
    f.send({ type: 'prompt', id: 0, message: 'not accepted' });
    f.send({ type: 'abort', id: 'follower' });
    f.send({ type: 'get_state', id });
    assert.equal(f.requests.length, 1);
    assert.ok(f.output.filter((r) => r.success === false).length === 3);
    assert.equal(f.pipeline.settlementTracker.sawAbort, true);
    f.receive(f.result(), { type: 'agent_settled' });
    f.clock.advance(499); assert.equal(f.settled, 0);
    f.clock.advance(1); assert.equal(f.settled, 1);
    f.send({ type: 'abort', id: 'new' });
    assert.notEqual(f.atomic().id, id);
    f.receive({ ...f.result(), id }); // retired private response cannot resolve new transaction
    assert.ok(!f.output.some((r) => r.id === 'new'));
    f.receive(f.result());
  } finally { f.close(); }
});

test('completed restore flushes old output before new mutation, and later abort is fresh', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'c' }); f.receive(f.result());
    assert.equal(f.settled, 0);
    f.send({ type: 'prompt', id: 'p', message: 'new' });
    assert.equal(f.settled, 1);
    assert.equal(f.requests.at(-1).type, 'prompt');
    f.send({ type: 'abort', id: 'a' }); assert.equal(f.requests.filter((r) => r.type === 'abort_and_restore_queue').length, 2);
    f.receive(f.result());
  } finally { f.close(); }
});

test('projected busy states, unrelated failures, stream, approval and tool frames pass promptly', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'c' });
    const frames = [
      { type: 'response', command: 'get_state', id: 'busy', success: true, data: { queuedMessageCount: 0, hasPendingAsyncWork: true } },
      { type: 'response', command: 'other', id: 'failure', success: false, error: 'untouched' },
      { type: 'message_update', text_delta: 'stream' }, { type: 'extension_ui_request', method: 'confirm', id: 'approval' },
      { type: 'tool_execution_update', toolName: 'read', toolCallId: 'r', partialResult: { content: [] } }
    ];
    f.receive(...frames);
    assert.equal(f.output.find((r) => r.id === 'busy').data.pendingMessageCount, 1);
    for (const id of ['failure', 'approval']) assert.ok(f.output.some((r) => r.id === id));
    assert.ok(f.output.some((r) => r.text_delta === 'stream'));
    assert.ok(f.output.some((r) => r.type === 'tool_execution_update'));
    f.receive(f.result()); f.send({ type: 'abort' });
  } finally { f.close(); }
});

for (const data of [undefined, null, {}, { isStreaming: null, isCompacting: 'bad', pendingMessageCount: null },
  { pendingMessageCount: '1' }, { pendingMessageCount: NaN }, { isStreaming: false }]) {
  test(`permissive/malformed probe stays fenced: ${JSON.stringify(data)}`, () => {
    const f = fixture();
    try {
      f.send({ type: 'clear_queue' });
      f.receive({ type: 'response', command: 'get_state', id: 's', success: true, data });
      assert.ok(!f.output.some((r) => r.id === 's'));
      f.receive(f.result()); assert.ok(!f.output.some((r) => r.id === 's'));
      f.send({ type: 'abort' }); assert.ok(f.output.some((r) => r.id === 's'));
    } finally { f.close(); }
  });
}

for (const source of ['agent_end', 'session_settled', 'agent_settled', 'fallback', 'local', 'doctor']) {
  test(`terminal producer ${source} shares the gate and prefixes remain prompt`, () => {
    const f = fixture();
    try {
      if (source === 'agent_end') f.receive({ type: 'agent_start' });
      f.send({ type: 'clear_queue', id: 'c' });
      if (source === 'fallback') {
        f.pipeline.settlementTracker.settledThisCycle = false;
        f.receive({ type: 'prompt_result', status: 'completed', agentInvoked: true });
      } else if (source === 'local') {
        f.receive({ type: 'response', command: 'prompt', success: true, id: 'prefix', data: { agentInvoked: false } });
        assert.ok(f.output.some((r) => r.id === 'prefix'));
      } else if (source === 'doctor') f.doctor.onSynth(line({ type: 'agent_settled' }));
      else f.receive({ type: source });
      assert.equal(f.settled, 0);
      f.receive(f.result()); assert.equal(f.settled, 0);
      f.send({ type: 'abort', id: 'f' }); assert.equal(f.settled, 1);
      f.receive({ type: 'agent_settled' }, { type: 'session_settled' });
      assert.equal(f.settled, 1);
    } finally { f.close(); }
  });
}

for (const bad of [null, {}, { steering: [], followUp: [null] }, { steering: [{ text: 3 }], followUp: [] },
  { steering: [], followUp: [], truncated: 'yes' }]) test(`malformed withdrawal fails without dropping items: ${JSON.stringify(bad)}`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 0 }); f.send({ type: 'abort', id: null });
    f.receive(f.result(bad));
    assert.equal(f.failures.length, 1); assert.equal(f.settled, 0);
    assert.ok(f.output.some((r) => r.command === 'clear_queue' && r.id === 0 && !r.success));
    assert.ok(f.output.some((r) => r.command === 'abort' && r.id === null && !r.success));
    f.receive(f.result()); f.send({ type: 'prompt', message: 'never' });
    assert.equal(f.requests.length, 1);
  } finally { f.close(); }
});

test('wrong private command fails; numeric/string lookalikes never match', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    f.receive({ ...f.result(), id: 0 }); assert.equal(f.failures.length, 0);
    f.receive({ ...f.result(), command: 'abort' }); assert.equal(f.failures.length, 1);
    assert.ok(!f.output.some((r) => r.id === f.atomic().id));
  } finally { f.close(); }
});

test('restore timer starts at acceptance including synchronous cancellation delay; traffic never resets it', () => {
  const f = fixture();
  try {
    f.pipeline.subagentBridge.abortSweep = () => ({ toClient: [], toOmp: [line({ type: 'cancel_subagent', subagentId: 'blocked' })] });
    f.childIn.on('data', () => f.clock.advance(1000));
    f.send({ type: 'clear_queue', id: 'c' });
    assert.deepEqual(f.requests.map((r) => r.type), ['cancel_subagent']); assert.equal(f.failures.length, 1);
    assert.ok(f.output.some((r) => r.command === 'clear_queue' && !r.success));
  } finally { f.close(); }
});

test('success near restore deadline transitions to exactly 500 ms follower fence; expiry is finite', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' }); f.clock.advance(999); f.receive(f.result());
    f.clock.advance(499); assert.equal(f.settled, 0);
    f.clock.advance(1); assert.equal(f.settled, 1); assert.equal(f.failures.length, 0);
    f.send({ type: 'abort' }); assert.equal(f.requests.length, 2); f.receive(f.result());
  } finally { f.close(); }
});

function sized(frame, bytes) {
  const base = Buffer.byteLength(line({ ...frame, padding: '' }));
  assert.ok(bytes >= base);
  const n = bytes - base;
  return { ...frame, padding: '日'.repeat(Math.floor(n / 3)) + 'x'.repeat(n % 3) };
}
for (const delta of [0, 1]) test(`state count cap ${16 + delta} is exact including failures`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    for (let i = 0; i < 16 + delta; i++) f.receive({ type: 'response', command: 'get_state', id: i, success: false, error: 'probe' });
    assert.equal(f.failures.length, delta);
    if (!delta) { f.receive(f.result()); f.send({ type: 'abort' }); assert.equal(f.output.filter((r) => r.command === 'get_state').length, 16); }
  } finally { f.close(); }
});
for (const kind of ['state', 'restore', 'terminal']) for (const delta of [0, 1]) test(`${kind} UTF-8 including LF cap ${delta ? 'one over' : 'exact'}`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    if (kind === 'state') f.receive(sized({ type: 'response', command: 'get_state', id: 'bytes', success: false, error: 'probe' }, FRAME_BYTES + delta));
    if (kind === 'restore') f.receive(sized(f.result(), FRAME_BYTES + delta));
    if (kind === 'terminal') f.receive(sized({ type: 'agent_settled' }, TERMINAL_BYTES + delta));
    assert.equal(f.failures.length, delta);
    if (!delta) { if (kind !== 'restore') f.receive(f.result()); f.send({ type: 'abort' }); }
  } finally { f.close(); }
});

test('sustained unrelated traffic is immediate, duplicate terminals coalesce and timeout is absolute', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    for (let i = 0; i < 10000; i++) f.receive({ type: 'message_update', text_delta: 'x' }, { type: 'agent_settled' });
    assert.equal(f.output.filter((r) => r.type === 'message_update').length, 10000);
    f.clock.advance(999); assert.equal(f.failures.length, 0);
    f.clock.advance(1); assert.equal(f.failures.length, 1); assert.equal(f.settled, 0);
  } finally { f.close(); }
});

test('early follower is acknowledged once, no second sweep or atomic request', () => {
  const f = fixture();
  try {
    let sweeps = 0;
    const sweep = f.pipeline.subagentBridge.abortSweep.bind(f.pipeline.subagentBridge);
    f.pipeline.subagentBridge.abortSweep = () => { sweeps++; return sweep(); };
    f.send({ type: 'clear_queue', id: 'c' }); f.send({ type: 'abort', id: 'a' }); f.send({ type: 'abort', id: 'extra' });
    f.receive(f.result());
    assert.equal(sweeps, 1); assert.equal(f.requests.length, 1); assert.equal(f.settled, 1);
    assert.equal(f.output.filter((r) => r.command === 'abort' && r.id === 'a').length, 1);
    assert.ok(f.output.some((r) => r.id === 'extra' && !r.success));
  } finally { f.close(); }
});

for (const mode of ['EOF', 'write', 'unsupported', 'partial', 'dispose']) test(`${mode} fails closed once and late callbacks are inert`, () => {
  const f = fixture();
  f.send({ type: 'clear_queue', id: 'c' });
  const response = f.result();
  if (mode === 'EOF') f.childOut.emit('end');
  if (mode === 'write') f.childIn.emit('error', Error('synthetic write'));
  if (mode === 'unsupported') f.receive({ ...response, success: false, error: 'Unknown command: abort_and_restore_queue' });
  if (mode === 'partial') f.receive({ ...response, success: false, error: 'failed after withdrawal' });
  if (mode === 'dispose') f.close();
  assert.equal(f.failures.length, 1); assert.equal(f.settled, 0);
  f.receive(response); f.clock.advance(2000); f.doctor.onSynth(line({ type: 'agent_settled' }));
  assert.equal(f.failures.length, 1); assert.equal(f.settled, 0);
  f.close();
});

for (const count of [-1, 0.5, -0.5, 1]) test(`finite nonzero pending count ${count} passes immediately on both sides of restore`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    const state = (id) => ({ type: 'response', command: 'get_state', id, success: true, data: { pendingMessageCount: count } });
    f.receive(state('before'));
    assert.equal(f.output.find((r) => r.id === 'before').data.pendingMessageCount, count);
    f.receive(f.result(), state('after'));
    assert.equal(f.output.find((r) => r.id === 'after').data.pendingMessageCount, count);
    f.send({ type: 'abort' });
  } finally { f.close(); }
});

for (const success of [undefined, null, 0, 'true', false]) test(`nonliteral success ${String(success)} remains failure sensitive despite busy data`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    f.receive({ type: 'response', command: 'get_state', id: 's', success, data: { isStreaming: true } });
    assert.ok(!f.output.some((r) => r.id === 's'));
    f.receive(f.result()); f.send({ type: 'abort' });
    assert.equal(f.output.find((r) => r.id === 's').success, success);
  } finally { f.close(); }
});

for (const data of [[], 'scalar', 1, false, { queuedMessageCount: 2, pendingMessageCount: null },
  { queuedMessageCount: 2, pendingMessageCount: '1' }]) test(`consumer idle defaults preserved after projection: ${JSON.stringify(data)}`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    f.receive({ type: 'response', command: 'get_state', id: 's', success: true, data });
    assert.ok(!f.output.some((r) => r.id === 's'));
    f.receive(f.result()); f.send({ type: 'abort' });
    assert.deepEqual(f.output.find((r) => r.id === 's').data, data);
  } finally { f.close(); }
});

for (const delta of [0, 1]) test(`aggregate state UTF-8 budget is exact across frames (${delta ? 'one over' : 'exact'})`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    const probe = { type: 'response', command: 'get_state', id: 's', success: false, error: 'failure' };
    f.receive(sized(probe, FRAME_BYTES / 2), sized({ ...probe, id: 'second' }, FRAME_BYTES / 2 + delta));
    assert.equal(f.failures.length, delta);
    if (!delta) { f.receive(f.result()); f.send({ type: 'abort' }); assert.ok(f.output.some((r) => r.id === 'second')); }
  } finally { f.close(); }
});

test('unsolicited agent_start retains active Stop intent; a new prompt rejects stale old lifecycle output', () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    f.send({ type: 'clear_queue', id: 'c' });
    f.receive({ type: 'agent_start' }, { type: 'agent_end' }, f.result());
    assert.equal(f.settled, 0);
    f.send({ type: 'prompt', message: 'new' });
    assert.equal(f.output.filter((r) => r.type === 'agent_settled' && r.aborted === true).length, 1);
    f.receive({ type: 'session_settled' }, { type: 'agent_settled' }, { type: 'agent_end' });
    assert.equal(f.output.filter((r) => r.type === 'agent_settled').length, 1);
    f.receive({ type: 'agent_start' }, { type: 'agent_end' }, { type: 'session_settled' });
    assert.equal(f.output.filter((r) => r.type === 'agent_settled').length, 2);
    assert.equal(f.output.filter((r) => r.type === 'agent_settled').at(-1).aborted, false);
  } finally { f.close(); }
});

test('rejected prompt does not disarm provenance cancellation; accepted prompt does', () => {
  const f = fixture();
  try {
    f.receive({ type: 'tool_execution_start', toolName: 'task', toolCallId: 'old' });
    f.send({ type: 'clear_queue' });
    f.send({ type: 'prompt', id: 'rejected', message: 'not accepted' });
    f.receive({ type: 'subagent_lifecycle', payload: { parentToolCallId: 'old', id: 'late', index: 0, status: 'running', agent: 'scout' } });
    assert.ok(f.requests.some((r) => r.type === 'cancel_subagent' && r.subagentId === 'late'));
    assert.ok(!f.requests.some((r) => r.type === 'prompt'));
    f.receive(f.result()); f.send({ type: 'prompt', message: 'accepted' });
    f.receive({ type: 'subagent_lifecycle', payload: { parentToolCallId: 'old', id: 'legitimate', index: 0, status: 'running', agent: 'scout' } });
    assert.ok(!f.requests.some((r) => r.type === 'cancel_subagent' && r.subagentId === 'legitimate'));
  } finally { f.close(); }
});

for (const guard of ['turn', 'generation', 'compaction', 'activity']) test(`consumer probe eligibility guard ${guard} prevents stale finalization`, async () => {
  const f = fixture();
  try {
    const c = new Consumer(f); c.probe('probe', false);
    if (guard === 'turn') c.activeTurn = { ...c.activeTurn, id: 'different-turn' };
    if (guard === 'generation') c.activeTurn.generation++;
    if (guard === 'compaction') c.activeTurn.compaction = {};
    if (guard === 'activity') c.activeTurn.activity = true;
    f.receive({ type: 'response', command: 'get_state', id: 'probe', success: false, error: 'failure' });
    c.parse(); await tick(); await c.permit;
    assert.ok(c.activeTurn); assert.equal(c.terminated, false); assert.deepEqual(c.events, []);
  } finally { f.close(); }
});

test('library refuses atomic Stop without a termination owner before writing child work', () => {
  const clientIn = new PassThrough(), clientOut = new PassThrough(), childIn = new PassThrough(), childOut = new PassThrough();
  assert.throws(() => createProxyPipeline({ clientIn, clientOut, childIn, childOut,
    doctor: { observeDownstream() {}, noteSettled() {}, stop() {} } }), /actual process owner/);
});

test('queued restore/follower timer callbacks cannot fail or release a newer Stop', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'first' });
    const restoreCallback = [...f.clock.timers][0].fn;
    f.receive(f.result());
    const followerCallback = [...f.clock.timers][0].fn;
    f.send({ type: 'prompt', message: 'new' });
    f.send({ type: 'abort', id: 'second' });
    restoreCallback(); followerCallback();
    assert.equal(f.failures.length, 0);
    assert.ok(!f.output.some((r) => r.id === 'second'));
    f.receive(f.result());
    assert.ok(f.output.some((r) => r.id === 'second' && r.success));
  } finally { f.close(); }
});

test('empty truncated withdrawal is successful available text, not a claim of an empty queue', () => {
  const f = fixture();
  try {
    f.send({ type: 'abort', id: 'empty-loss' });
    f.receive(f.result({ steering: [], followUp: [], truncated: true }));
    const notice = f.output.findIndex((r) => r.method === 'notify');
    const terminal = f.output.findIndex((r) => r.type === 'agent_settled');
    assert.ok(notice >= 0 && notice < terminal);
    assert.match(f.output[notice].message, /omitted withdrawn text/);
    const response = f.output.find((r) => r.id === 'empty-loss');
    assert.deepEqual(response.data, { steering: [], followUp: [], truncated: true, imagesDropped: false });
  } finally { f.close(); }
});

for (const activity of ['isStreaming', 'isCompacting']) test(`literal ${activity} true is prompt even with invalid count`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue' });
    f.receive({ type: 'response', command: 'get_state', id: 'busy', success: true, data: { [activity]: true, pendingMessageCount: null } });
    assert.ok(f.output.some((r) => r.id === 'busy'));
    f.receive(f.result()); f.send({ type: 'abort' });
  } finally { f.close(); }
});

test('completed active restore with no terminal retires before a new prompt; late old lifecycle cannot settle it', () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    f.send({ type: 'clear_queue', id: 'c' }); f.receive(f.result());
    f.send({ type: 'prompt', id: 'p', message: 'new' });
    f.receive({ type: 'agent_end' }, { type: 'session_settled' }, { type: 'agent_settled' });
    assert.ok(!f.output.some((r) => r.type === 'agent_settled'));
    assert.ok(!f.output.some((r) => r.type === 'agent_end'), 'old cycle end must not leak into the new prompt');
    f.receive({ type: 'agent_start' }, { type: 'agent_end' }, { type: 'session_settled' });
    assert.deepEqual(f.output.filter((r) => r.type === 'agent_settled'), [{ type: 'agent_settled', aborted: false }]);
    f.send({ type: 'abort', id: 'fresh' });
    assert.equal(f.requests.filter((r) => r.type === 'abort_and_restore_queue').length, 2);
    f.receive(f.result());
  } finally { f.close(); }
});

for (const pair of [[0, '0'], [undefined, null], [null, 0]]) test(`paired IDs retain independent presence/types ${JSON.stringify(pair)}`, () => {
  const f = fixture();
  try {
    const [clearId, abortId] = pair;
    const clear = { type: 'clear_queue' }, abort = { type: 'abort' };
    if (clearId !== undefined) clear.id = clearId;
    if (abortId !== undefined) abort.id = abortId;
    f.send(clear); f.send(abort); f.receive(f.result());
    const clearResponse = f.output.find((r) => r.command === 'clear_queue');
    const abortResponse = f.output.find((r) => r.command === 'abort');
    assert.equal(Object.hasOwn(clearResponse, 'id'), clearId !== undefined); assert.equal(clearResponse.id, clearId);
    assert.equal(Object.hasOwn(abortResponse, 'id'), abortId !== undefined); assert.equal(abortResponse.id, abortId);
    assert.equal(f.requests.filter((r) => r.type === 'abort_and_restore_queue').length, 1);
  } finally { f.close(); }
});

test('tree reads remain immediate during restoring and completed-clear fencing', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'c' });
    f.send({ type: 'get_entries', id: 'before' });
    assert.equal(f.requests.at(-1).type, 'get_entries');
    f.receive(f.result());
    f.send({ type: 'get_entries', id: 'after' });
    assert.equal(f.requests.at(-1).id, 'after');
    assert.ok(!f.output.some((r) => (r.id === 'before' || r.id === 'after') && r.success === false));
    f.send({ type: 'abort' });
  } finally { f.close(); }
});

for (const command of [undefined, 'wrong', 'get_available_models', 'get_commands'])
for (const failed of [false, true]) for (const position of ['before', 'after'])
for (const activity of [false, true])
test(`state destination precedes adapters: ${command}/${failed}/${position}/${activity}`, async () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    const c = new Consumer(f, { activity }); c.probe('destination');
    const stopped = c.stop();
    const probe = { type: 'response', id: 'destination', success: !failed,
      ...(command === undefined ? {} : { command }),
      ...(failed ? { error: 'preserve error' } : { data: { queuedMessageCount: 0 } }) };
    if (position === 'before') f.receive(probe);
    f.receive(f.result({ steering: ['destination text'], followUp: [] }));
    if (position === 'after') f.receive(probe);
    assert.ok(!f.output.some((r) => r.id === 'destination'));
    c.parse(); await tick(); c.parse(); await tick(); await stopped; await c.permit;
    assert.deepEqual(c.events, ['notice', activity && failed ? 'terminate' : 'finalize']);
    const delivered = f.output.find((r) => r.id === 'destination');
    assert.equal(delivered.command, command);
    assert.equal(delivered.success, !failed);
    if (failed) assert.equal(delivered.error, 'preserve error');
    else assert.deepEqual(delivered.data, { queuedMessageCount: 0, pendingMessageCount: 0 });
    assert.equal(f.pipeline.stopController.stateRequests.size, 0);
  } finally { f.close(); }
});

test('recognized wrong state command preserves projected busy outcome and unrelated failure promptly', () => {
  const f = fixture();
  try {
    f.send({ type: 'get_state', id: 'busy' });
    f.send({ type: 'clear_queue' });
    f.receive({ type: 'response', command: 'get_available_models', id: 'busy', success: true,
      data: { queuedMessageCount: 0, hasPendingAsyncWork: true } },
    { type: 'response', command: 'get_messages', id: 'other', success: false, error: 'unrelated' });
    assert.equal(f.output.find((r) => r.id === 'busy').data.pendingMessageCount, 1);
    assert.equal(f.output.find((r) => r.id === 'other').error, 'unrelated');
  } finally { f.close(); }
});

for (const limit of ['count', 'bytes']) test(`pending state destination ${limit} admission is bounded and retires`, () => {
  const f = fixture();
  try {
    if (limit === 'count') {
      for (let i = 0; i < 16; i++) f.send({ type: 'get_state', id: String(i) });
      f.send({ type: 'get_state', id: 'excess' });
      assert.equal(f.requests.length, 16);
      assert.equal(f.output.find((r) => r.id === 'excess').success, false);
      f.receive({ type: 'response', id: '0', success: true, data: {} });
      f.send({ type: 'get_state', id: 'replacement' });
      assert.equal(f.requests.length, 17);
    } else {
      f.send({ type: 'get_state', id: '日'.repeat(5461) + 'x' });
      f.send({ type: 'clear_queue' });
      f.send({ type: 'get_state', id: 'over' });
      assert.equal(f.failures.length, 1);
    }
  } finally { f.close(); }
});

test('early follower notify preserves active text before held probe and terminal consumption', async () => {
  const f = fixture();
  try {
    const c = new Consumer(f); c.probe('early-probe');
    const stopped = c.stop();
    const early = c.request({ type: 'abort', id: 'independent-early' });
    f.receive({ type: 'response', id: 'early-probe', success: false, error: 'probe' },
      f.result({ steering: ['recover me'], followUp: [] }));
    c.parse(); await tick(); await early; await c.permit;
    assert.ok(c.notices.some((text) => text.includes('recover me')));
    assert.equal(c.events[0], 'notice');
    assert.equal(c.activeTurn, null);
    // The later awaited abort can be a new gesture (accepted ambiguity), but
    // cannot undo the text already consumed while the original turn was active.
    f.receive(f.result()); c.parse(); await tick(); await stopped;
  } finally { f.close(); }
});

for (const replacement of ['same-id', 'absent']) test(`clear notice permit rejects ${replacement} active turn`, async () => {
  const f = fixture();
  try {
    const c = new Consumer(f);
    let unlock;
    c.permit = new Promise((resolve) => { unlock = resolve; });
    const original = c.activeTurn;
    const stopped = c.stop();
    f.receive(f.result({ steering: ['old turn only'], followUp: [] }));
    c.parse(); await Promise.resolve(); // clear continuation queues behind permit
    c.activeTurn = replacement === 'same-id' ? { ...original } : null;
    unlock(); await tick(); c.parse(); await tick(); await stopped;
    assert.deepEqual(c.notices, []);
  } finally { f.close(); }
});

for (const activity of [false, true]) test(`actual split parse boundaries preserve failed ${activity ? 'post' : 'pre'} notice`, async () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    const c = new Consumer(f, { activity }); c.probe('split');
    const stopped = c.stop();
    f.receive({ type: 'response', id: 'split', success: false, error: 'split failure' });
    c.parse(); await tick(); assert.deepEqual(c.events, []);
    f.receive(f.result({ steering: ['split text'], followUp: [] }));
    c.parse(); await tick(); assert.deepEqual(c.events, ['notice']);
    c.parse(); await tick(); await stopped; await c.permit;
    assert.deepEqual(c.events, ['notice', activity ? 'terminate' : 'finalize']);
  } finally { f.close(); }
});

for (const reply of [{ success: true, data: null }, { success: true, data: 'scalar' },
  { success: true, data: { isStreaming: 'true', pendingMessageCount: '1' } },
  { success: 'true', data: { isStreaming: true } }])
test(`matched consumer permissive outcome ${JSON.stringify(reply)}`, async () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    const c = new Consumer(f); c.probe('permissive');
    const stopped = c.stop();
    f.receive(f.result({ steering: ['visible'], followUp: [] }),
      { type: 'response', id: 'permissive', command: 'get_commands', ...reply });
    c.parse(); await tick(); c.parse(); await tick(); await stopped; await c.permit;
    assert.deepEqual(c.events, ['notice', 'finalize']);
    assert.equal(c.notices[0], 'visible');
  } finally { f.close(); }
});

test('completed fence passes unrelated failure, tool and approval before follower', () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'clear' }); f.receive(f.result());
    const frames = [{ type: 'response', command: 'get_messages', id: 'unrelated', success: false, error: 'detail' },
      { type: 'tool_execution_start', toolName: 'bash', toolCallId: 't' },
      { type: 'extension_ui_request', method: 'confirm', id: 'approval', message: 'continue?' }];
    f.receive(...frames);
    for (const frame of frames) assert.ok(f.output.some((r) => JSON.stringify(r) === JSON.stringify(frame)));
    assert.equal(f.settled, 0);
  } finally { f.close(); }
});

test('dispose after clear success discards fence without duplicate response; saved timer inert', () => {
  const f = fixture();
  f.send({ type: 'clear_queue', id: 'clear' }); f.receive(f.result());
  const callback = [...f.clock.timers][0].fn;
  f.close(); callback();
  assert.equal(f.failures.length, 1);
  assert.equal(f.output.filter((r) => r.command === 'clear_queue').length, 1);
  assert.equal(f.output.find((r) => r.command === 'clear_queue').success, true);
  assert.equal(f.settled, 0);
});

for (const mode of ['backpressure', 'throw', 'destroyed', 'close'])
test(`release retains fatal output ownership through ${mode}`, () => {
  let failWrite = false;
  const seen = [];
  const clientOut = new Writable({ highWaterMark: 1024, write(chunk, _, done) {
    seen.push(JSON.parse(chunk));
    if (failWrite && mode === 'backpressure') return;
    done();
  } });
  const f = fixture({ clientOut });
  try {
    f.receive({ type: 'agent_start' });
    f.send({ type: 'clear_queue', id: 'clear' });
    f.receive({ type: 'response', command: 'get_state', id: 'held', success: false, error: 'x'.repeat(2048) },
      { type: 'agent_settled' }, f.result());
    const write = clientOut.write.bind(clientOut);
    clientOut.write = (chunk, completed) => {
      if (failWrite && mode === 'throw') throw Error('release write');
      return write(chunk, completed);
    };
    failWrite = true;
    if (mode === 'destroyed') clientOut.destroy();
    if (mode === 'close') clientOut.emit('close');
    f.send({ type: 'abort', id: 'follower' });
    assert.equal(f.failures.length, 1);
    assert.equal(f.settled, 0);
    assert.ok(!seen.some((r) => r.type === 'agent_settled'));
    assert.equal(seen.filter((r) => r.command === 'clear_queue').length, 1);
    if (mode === 'backpressure') assert.ok(clientOut.writableNeedDrain);
    const bytes = clientOut.writableLength;
    for (let i = 0; i < 32; i++) f.send({ type: 'prompt', id: 'x'.repeat(65536) });
    assert.equal(clientOut.writableLength, bytes, 'fatal input generates no unbounded error output');
  } finally { f.close(); }
});

for (const first of ['atomic', 'cancel', 'read']) test(`Stop bounds real nonreading child input at ${first} admission`, () => {
  const childIn = new Writable({ highWaterMark: first === 'read' ? 1024 : 1, write() {} });
  const f = fixture({ childIn });
  try {
    if (first === 'cancel') f.pipeline.subagentBridge.abortSweep = () =>
      ({ toClient: [], toOmp: [line({ type: 'cancel_subagent', subagentId: 'blocked' })] });
    f.send({ type: 'clear_queue', id: 'clear' });
    if (first === 'read') f.send({ type: 'get_messages', id: 'read', payload: 'x'.repeat(65536) });
    assert.equal(f.failures.length, 1);
    assert.ok(childIn.writableNeedDrain || childIn.destroyed);
    const admitted = childIn.writableLength;
    for (let i = 0; i < 32; i++) f.send({ type: 'get_messages', payload: 'x'.repeat(65536) });
    assert.equal(childIn.writableLength, admitted);
  } finally { f.close(); }
});

for (const source of ['childOut', 'clientIn']) test(`actual PassThrough ${source} error reaches fatal owner once`, () => {
  const f = fixture();
  try {
    f.receive({ type: 'agent_start' });
    f.send({ type: 'clear_queue', id: 'clear' });
    f[source].emit('error', Error('synthetic readable'));
    f[source].emit('error', Error('duplicate readable'));
    assert.equal(f.failures.length, 1);
    assert.equal(f.settled, 0);
    assert.ok(f.output.some((r) => r.id === 'clear' && r.success === false));
  } finally { f.close(); }
});

for (const source of ['childOut', 'clientIn']) test(`ordinary ${source} error requests process ownership once without Stop replies`, () => {
  const f = fixture();
  const original = console.error, diagnostics = [];
  console.error = (message) => diagnostics.push(message);
  try {
    f[source].emit('error', Error('ordinary readable'));
    f[source].emit('error', Error('duplicate readable'));
    f.send({ type: 'prompt', id: 'after-error' });
    assert.deepEqual(f.requests, []);
    assert.equal(f.failures.length, 1);
    assert.ok(diagnostics.some((message) => message.includes('ordinary readable')));
    assert.ok(!f.output.some((frame) => frame.command === 'clear_queue' || frame.command === 'abort'));
  } finally { console.error = original; f.close(); }
});

for (const destination of ['child', 'client']) test(`Stop rejects over-budget ${destination} write before buffering it`, () => {
  const f = fixture();
  try {
    f.send({ type: 'clear_queue', id: 'clear' });
    if (destination === 'child') f.send({ type: 'get_messages', payload: 'x'.repeat(FRAME_BYTES) });
    else f.receive({ type: 'message_update', text: 'x'.repeat(FRAME_BYTES) });
    assert.equal(f.failures.length, 1);
    assert.ok(!f.requests.some((r) => r.type === 'get_messages'));
    assert.ok(!f.output.some((r) => r.type === 'message_update'));
    assert.equal(f.childIn.writableLength, 0);
    assert.equal(f.clientOut.writableLength, 0);
  } finally { f.close(); }
});

for (const mode of ['error', 'close', 'never-ack', 'terminal-success', 'new-prompt-error', 'new-prompt-success', 'dispose'])
test(`real admitted release completion owns ${mode}`, async () => {
  const seen = [];
  let stateDone, terminalDone;
  const clientOut = new Writable({ highWaterMark: 1024 * 1024, write(chunk, _, done) {
    const frame = JSON.parse(chunk);
    seen.push(frame);
    if (frame.id === 'held') { stateDone = done; return; }
    if (frame.type === 'agent_settled') { terminalDone = done; return; }
    done();
  } });
  const f = fixture({ clientOut });
  try {
    f.receive({ type: 'agent_start' });
    f.send({ type: 'clear_queue', id: 'clear' });
    f.receive({ type: 'response', command: 'get_state', id: 'held', success: false, error: 'held failure' },
      { type: 'agent_settled' }, f.result());
    const deadline = [...f.clock.timers][0].fn;
    f.send({ type: 'abort', id: 'follower' });
    assert.equal(clientOut.writableNeedDrain, false, 'real write returned true, not backpressure');
    assert.ok(f.pipeline.stopController.transaction?.releasing);
    assert.equal(f.settled, 0);
    assert.equal(typeof stateDone, 'function');
    assert.ok(!seen.some((frame) => frame.type === 'agent_settled'));
    if (mode.startsWith('new-prompt')) {
      f.send({ type: 'prompt', id: 'new', message: 'new turn' });
      assert.ok(f.requests.some((frame) => frame.id === 'new'), 'mutation is forwarded after old output admission');
      assert.ok(f.pipeline.stopController.transaction, 'old delivery still owns failure');
    }
    if (mode === 'dispose') {
      f.close();
      stateDone(Error('after disposal'));
      await tick();
      deadline();
      assert.equal(f.failures.length, 1);
      assert.equal(f.settled, 0);
      return;
    }
    if (mode === 'error' || mode === 'new-prompt-error') stateDone(Error('asynchronous retained state'));
    else if (mode === 'close') clientOut.destroy();
    else if (mode === 'never-ack') {
      f.clock.advance(499);
      assert.equal(f.failures.length, 0);
      f.clock.advance(1);
    } else {
      stateDone();
      await tick();
      assert.equal(typeof terminalDone, 'function');
      assert.equal(f.settled, 0, 'terminal _write entry alone is not completion');
      terminalDone();
      await tick();
      assert.equal(f.settled, mode === 'terminal-success' ? 1 : 0, 'old callback cannot settle new prompt doctor');
      assert.equal(f.pipeline.stopController.transaction, null);
      f.send({ type: 'clear_queue', id: 'next' });
      const next = f.pipeline.stopController.transaction;
      deadline();
      assert.equal(f.pipeline.stopController.transaction, next, 'old completion deadline cannot fail next Stop');
      assert.equal(f.failures.length, 0);
      return;
    }
    await tick();
    assert.equal(f.failures.length, 1);
    assert.equal(f.settled, 0);
    assert.ok(!seen.some((frame) => frame.type === 'agent_settled'), 'failed state prevents queued terminal _write');
    assert.equal(seen.filter((frame) => frame.command === 'clear_queue').length, 1);
    assert.equal(seen.filter((frame) => frame.command === 'abort').length, 1);
    deadline();
    assert.equal(f.failures.length, 1);
  } finally { f.close(); }
});
