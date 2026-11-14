'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ModelCatalogManager } = require('../src/model_catalog.js');
const { createProxyPipeline } = require('../src/proxy.js');
const { createMockStreams, collectLines } = require('./helpers.js');

const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const mapFor = (advertised = []) => Object.fromEntries(levels.map((k) => [k, advertised.includes(k) ? k : null]));
const response = (models, extra = {}) => ({
  type: 'response', command: 'get_available_models', success: true, data: { models }, ...extra
});

function pipeline(t) {
  const { stdin: clientIn, stdout: clientOut } = createMockStreams();
  const { stdin: childIn, stdout: childOut } = createMockStreams();
  const client = collectLines(clientOut);
  const child = collectLines(childIn);
  const proxy = createProxyPipeline({
    clientIn, clientOut, childIn, childOut,
    doctor: { observeDownstream() {}, noteSettled() {}, stop() {} }
  });
  proxy.start();
  t.after(() => proxy.stop());
  return {
    client, child,
    request(frame) { clientIn.write(typeof frame === 'string' ? frame + '\n' : JSON.stringify(frame) + '\n'); },
    reply(frame) { childOut.write(typeof frame === 'string' ? frame + '\n' : JSON.stringify(frame) + '\n'); }
  };
}

test('catalog requests forward exactly once; out-of-order session replies prune and retain IDs', (t) => {
  const p = pipeline(t);
  const ids = [0, 7, '7', '', null, undefined];
  for (const id of ids) p.request({ type: 'get_available_models', ...(id === undefined ? {} : { id }) });
  assert.equal(p.client.lines.length, 0);
  assert.deepEqual(p.child.getJson(), ids.map((id) => ({ type: 'get_available_models', ...(id === undefined ? {} : { id }) })));
  const raw = {
    provider: 'openrouter', id: 'openrouter/openrouter/vendor/model', name: '界 "model"',
    contextWindow: 200000, maxTokens: 8192, reasoning: true,
    thinking: { efforts: ['low', 'xhigh', 'max'] },
    schema: { huge: 'x'.repeat(100000) }, cost: { input: 2 }, baseUrl: 'https://synthetic.invalid'
  };
  for (const id of [...ids].reverse()) {
    p.reply(response([raw], id === undefined ? {} : { id }));
    const unrelated = ' { "type":"response", "command":"get_version", "success":true, "id":"unrelated", "data":{"version":"synthetic"} } ';
    p.reply(unrelated);
    assert.equal(p.client.lines.at(-1), unrelated);
  }
  const expected = {
    id: 'vendor/model', name: raw.name, provider: raw.provider,
    contextWindow: 200000, maxTokens: 8192, reasoning: true,
    thinkingLevelMap: mapFor(['low', 'xhigh', 'max'])
  };
  const answers = p.client.getJson().filter((frame) => frame.command === 'get_available_models');
  for (const [index, id] of [...ids].reverse().entries()) {
    assert.equal(answers[index].id, id);
    assert.equal(Object.hasOwn(answers[index], 'id'), id !== undefined);
    assert.deepEqual(answers[index].models, [expected]);
    assert.deepEqual(answers[index].data.models, [expected]);
  }
  p.request({ type: 'prompt', message: 'Explain get_available_models', options: { thinking: 'max' } });
  assert.deepEqual(p.child.getJson().at(-1), { type: 'prompt', message: 'Explain get_available_models', options: { thinking: 'max' } });
  const delta = ' { "type": "message_update", "text_delta": "get_available_models" } ';
  p.reply(delta);
  assert.equal(p.client.lines.at(-1), delta);
  p.reply(response([{ selector: 'new/model' }], { id: 'next' }));
  assert.equal(p.client.getJson().at(-1).models[0].id, 'new/model');
  const second = pipeline(t);
  second.reply(response([{ id: 'other-session' }]));
  assert.equal(second.client.getJson()[0].models[0].id, 'other-session');
});

test('live empty succeeds and real failures pass unchanged despite earlier success', (t) => {
  const p = pipeline(t);
  p.reply(response([{ id: 'first' }]));
  p.reply(response([], { id: 0 }));
  assert.deepEqual(p.client.getJson().at(-1), response([], { id: 0, models: [] }));
  const failures = [
    ' {"type":"response","command":"get_available_models","id":0,"success":false,"error":"synthetic"} ',
    '{"type":"response","command":"get_available_models","success":false,"error":"RPC response exceeds protocol 1 limit"}'
  ];
  for (const failure of failures) {
    p.reply(failure);
    assert.equal(p.client.lines.at(-1), failure);
  }
});

test('whole malformed catalogs fail without killing later streaming; valid fallback identities remain', (t) => {
  const p = pipeline(t);
  const invalid = [undefined, null, {}, [null], [1], ['x'], [false], [[]],
    [{ id: 0 }], [{ id: {} }], [{ id: null }], [{ id: 'ok', provider: 9 }],
    [{ id: 'ok', provider: null }], [{ id: 'ok', name: {} }], [{ id: ' ' }], [{}], [{ selector: false }]];
  for (const [index, models] of invalid.entries()) {
    const frame = response(models, { id: index });
    if (models === undefined) delete frame.data;
    if (Array.isArray(models)) frame.data.models = [{ id: 'valid' }, ...models];
    p.reply(frame);
    const error = p.client.getJson().at(-1);
    assert.equal(error.success, false, JSON.stringify(models));
    assert.equal(error.id, index);
    assert.equal(Object.hasOwn(error, 'models'), false);
    assert.equal(Object.hasOwn(error, 'data'), false);
    p.reply({ type: 'message_update', text_delta: `after-${index}` });
    assert.equal(p.client.getJson().at(-1).text_delta, `after-${index}`);
  }
  p.reply(response([{ selector: 'vendor/model', name: '' }, { id: '', selector: 'x', provider: '' }]));
  assert.deepEqual(p.client.getJson().at(-1).models, [
    { id: 'vendor/model', provider: 'omp', name: 'vendor/model', thinkingLevelMap: mapFor() },
    { id: 'x', provider: 'omp', name: 'x', thinkingLevelMap: mapFor() }
  ]);
});

test('CLI and RPC thinking capabilities always project complete exact seven-key maps', () => {
  const manager = new ModelCatalogManager();
  for (const advertised of [['low', 'xhigh', 'max', 'low', 'unknown'], [], ['unknown'], levels]) {
    for (const thinking of [advertised, { efforts: advertised }]) {
      const [entry] = manager.pruneModels([{ id: 'm', reasoning: true, thinking }]);
      assert.deepEqual(entry.thinkingLevelMap, mapFor(advertised));
      assert.equal(entry.reasoning, true);
    }
  }
  for (const thinking of [undefined, null, true, false, { budget: 1024 }, { efforts: true }]) {
    const [entry] = manager.pruneModels([{ id: 'm', reasoning: true, thinking }]);
    assert.deepEqual(entry.thinkingLevelMap, mapFor());
    assert.equal(entry.reasoning, true);
  }
  assert.equal(manager.pruneModels([{ id: 'm', reasoning: false, thinking: levels }])[0].reasoning, false);
});

test('final UTF-8 frame boundary includes LF, escaping, multibyte content and duplicated lists', (t) => {
  const p = pipeline(t);
  const manager = new ModelCatalogManager();
  const limit = 1048576;
  const baseName = '界😀"\\\n';
  const baseModel = { id: 'm', name: baseName, schema: { verbose: 'x'.repeat(100000) } };
  for (const target of [limit - 1, limit, limit + 1]) {
    let id = '';
    let base = Buffer.byteLength(manager.serializeModels({ id }, manager.pruneModels([baseModel])));
    if ((target - base) % 2) {
      id = 'i';
      base++;
    }
    const model = { ...baseModel, name: baseName + 'a'.repeat((target - base) / 2) };
    const models = manager.pruneModels([model]);
    const expected = JSON.stringify(response(models, { id, models })) + '\n';
    assert.equal(Buffer.byteLength(expected), target);
    assert.ok(Buffer.byteLength(JSON.stringify(models)) < limit);
    p.reply(response([model], { id }));
    const line = p.client.lines.at(-1) + '\n';
    const parsed = JSON.parse(line);
    if (target <= limit) {
      assert.equal(Buffer.byteLength(line), target);
      assert.deepEqual(parsed.models, models);
      assert.deepEqual(parsed.data.models, models);
    } else {
      assert.equal(parsed.success, false);
      assert.equal(parsed.id, id);
      assert.ok(Buffer.byteLength(line) < 1024);
      assert.equal(Object.hasOwn(parsed, 'models'), false);
      assert.equal(Object.hasOwn(parsed, 'data'), false);
    }
  }
});
