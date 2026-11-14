'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createSubagentPolicy, subagentPolicyArgs } = require('../src/subagent_policy.js');
const { adaptT3ExtensionArgs, GET_COMMANDS_MARKER, MCP_CLIENT_MARKER } = require('../src/extension_compat.js');
const { loadHook } = require('./generated-hook.js');

const policyEnv = {
  OMPT3_SUBAGENT_ALLOWED_MODELS: 'glm-5.3-flash,gemini-3.8-flash,deepseek-v4.1-flash',
  OMPT3_SUBAGENT_DISALLOWED_MODELS: 'gpt-*sol*,*opus*,glm-5.3,glm-5.3:*'
};

test('explicit policy allows provider-qualified Flash models and rejects unlisted models', () => {
  const policy = createSubagentPolicy(policyEnv);
  for (const model of ['glm-5.3-flash', 'openrouter/z-ai/glm-5.3-flash',
    'openrouter/google/gemini-3.8-flash', 'openrouter/deepseek/deepseek-v4.1-flash',
    'OPENROUTER/GOOGLE/GEMINI-3.8-FLASH']) {
    assert.equal(policy.checkModel(model), null, model);
  }
  for (const model of ['gpt-6.1-sol', 'openrouter/anthropic/claude-opus-4.8',
    'openrouter/z-ai/glm-5.3', 'glm-5.3-flashx', 'gemini-3.8-pro',
    'glm-5.3-flash:batch', 'deepseek-v4.1-flash-1017', '~z-ai/glm-flash-latest']) {
    assert.match(policy.checkModel(model), /rejected/, model);
  }
  for (const model of [undefined, null, '', '  ', ' glm-5.3-flash', 'GLM 5.3 Flash', 42]) {
    assert.match(policy.checkModel(model), /target.model explicitly/);
  }
});

test('each env list is independent, globs are anchored, and denial wins', () => {
  const policy = createSubagentPolicy({
    OMPT3_SUBAGENT_ALLOWED_MODELS: ' openrouter/google/gemini-*, glm-5.3-flash , glm-5.3-flash ',
    OMPT3_SUBAGENT_DISALLOWED_MODELS: '*pro*,glm-5.3-flash'
  });
  assert.equal(policy.allowed.length, 2);
  assert.equal(policy.checkModel('openrouter/google/gemini-3.8-flash'), null);
  for (const model of ['other/google/gemini-3.8-flash', 'openrouter/google/gemini-3.8-pro', 'glm-5.3-flash']) {
    assert.match(policy.checkModel(model), /rejected/);
  }
  const denyOnly = createSubagentPolicy({ OMPT3_SUBAGENT_DISALLOWED_MODELS: policyEnv.OMPT3_SUBAGENT_DISALLOWED_MODELS });
  assert.equal(denyOnly.checkModel('new-model'), null);
  assert.match(denyOnly.checkModel('gpt-6.1-sol'), /rejected/);
  assert.match(denyOnly.checkModel('glm-5.3:batch'), /rejected/);
  assert.match(denyOnly.checkModel(null), /inheritance is blocked/);
  const allowOnly = createSubagentPolicy({ OMPT3_SUBAGENT_ALLOWED_MODELS: policyEnv.OMPT3_SUBAGENT_ALLOWED_MODELS });
  assert.match(allowOnly.checkModel('new-model'), /rejected/);
  const off = createSubagentPolicy({ OMPT3_SUBAGENT_ALLOWED_MODELS: '', OMPT3_SUBAGENT_DISALLOWED_MODELS: '' });
  assert.equal(off.active, false);
  assert.equal(off.checkTool('task', {}), null);
  assert.equal(off.checkTool('delegate_task', {}), null);
  assert.equal(off.prompt, '');
  assert.deepEqual(subagentPolicyArgs(off), { args: [], requiredHook: undefined });
});

test('unset model lists do not block native tasks or delegation', () => {
  const policy = createSubagentPolicy({});
  for (const model of [undefined, 'gpt-6.1-sol', 'claude-opus', 'custom-model']) {
    assert.equal(policy.checkTool('delegate_task', { target: { model } }), null);
  }
  assert.equal(policy.checkTool('task', {}), null);
  assert.equal(policy.active, false);
});

test('patterns escape regex punctuation and malformed lists fail instead of disabling restrictions', () => {
  const policy = createSubagentPolicy({ OMPT3_SUBAGENT_ALLOWED_MODELS: 'model.1+test[0]', OMPT3_SUBAGENT_DISALLOWED_MODELS: '' });
  assert.equal(policy.checkModel('model.1+test[0]'), null);
  assert.match(policy.checkModel('modelx1test0'), /rejected/);
  for (const value of [',', 'model,', 'model,,other', 'GLM 5.3 Flash', 'model\nother']) {
    assert.throws(() => createSubagentPolicy({ OMPT3_SUBAGENT_ALLOWED_MODELS: value }), /OMPT3_SUBAGENT_ALLOWED_MODELS/);
    assert.throws(() => createSubagentPolicy({ OMPT3_SUBAGENT_DISALLOWED_MODELS: value }), /OMPT3_SUBAGENT_DISALLOWED_MODELS/);
  }
});

test('tool guard checks both T3 aliases, blocks native inheritance, and leaves ordinary tools alone', () => {
  const policy = createSubagentPolicy(policyEnv);
  for (const name of ['delegate_task', 'mcp__t3-code__delegate_task', 'mcp__t3_code__delegate_task']) {
    assert.match(policy.checkTool(name, {}), /target.model explicitly/);
    assert.match(policy.checkTool(name, { target: { model: 'gpt-6.1-sol' } }), /rejected/);
    assert.equal(policy.checkTool(name, { target: { model: 'glm-5.3-flash' } }), null);
  }
  assert.match(policy.checkTool('task', { model: 'glm-5.3-flash' }), /native task is blocked/);
  assert.equal(policy.checkTool('read', {}), null);
  assert.equal(policy.checkTool('mcp__t3_code__orchestrator_capabilities', {}), null);
});

test('generated extension registers a blocking OMP hook and reads each session environment', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-policy-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const previous = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  try {
    const { args } = subagentPolicyArgs(createSubagentPolicy(policyEnv));
    const mtime = fs.statSync(args[1]).mtimeMs;
    subagentPolicyArgs(createSubagentPolicy(policyEnv));
    assert.equal(fs.statSync(args[1]).mtimeMs, mtime);
    for (const env of [policyEnv, { OMPT3_SUBAGENT_ALLOWED_MODELS: 'custom-model', OMPT3_SUBAGENT_DISALLOWED_MODELS: '' }]) {
      const handlers = loadHook(args[1], env);
      const hook = handlers.get('tool_call');
      assert.equal(hook({ toolName: 'task', input: {} }).block, true);
      const model = env === policyEnv ? 'glm-5.3-flash' : 'custom-model';
      assert.equal(hook({ toolName: 'mcp__t3_code__delegate_task', input: { target: { model } } }), undefined);
      assert.match(hook({ toolName: 'mcp__t3-code__delegate_task', input: {} }).reason, /target.model/);
    }
  } finally {
    if (previous === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previous;
  }
});

// An executable bridge fixture exercises the actual transformed call boundary,
// including calls from scripts that invoke registered execute handlers directly.
function bridgeFixture() {
  return [
    'function createMcpClient() { return { callTool: async (...args) => { calls.push(args); return { content: [], structuredContent: { ok: true } }; } }; }',
    'async function start() {',
    '  const endpoint = "mock", token = "mock";',
    '  const pi = { getCommands: () => [] };',
    `  ${GET_COMMANDS_MARKER}`,
    `  ${MCP_CLIENT_MARKER}`,
    '  return client;',
    '}',
    'start();'
  ].join('\n');
}

test('adapted bridge rejects before the MCP call and preserves allowed targets and options', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-bridge-policy-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const original = path.join(dir, 'pi-t3-mcp-extension.ts');
  const cachePath = path.join(dir, 'compat.ts');
  fs.writeFileSync(original, bridgeFixture());
  for (const flags of [['--extension', original], ['-e', original], ['--extension=' + original], ['--hook', original], ['--hook=' + original]]) {
    const adapted = await adaptT3ExtensionArgs(flags, { cachePath, policy: createSubagentPolicy(policyEnv) });
    assert.equal(adapted.extensionPath, cachePath);
    assert.ok(adapted.args.some(arg => arg.endsWith(cachePath)));
  }
  const calls = [];
  const client = await vm.runInNewContext(fs.readFileSync(cachePath, 'utf8'), { process: { env: policyEnv }, calls });
  for (const params of [{}, { target: {} }, { target: { model: null } }, { target: { model: 'glm-5.3' } }, { target: { model: 'claude-opus' } }]) {
    const result = await client.callTool('delegate_task', params);
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Subagent model policy/);
  }
  assert.equal(calls.length, 0, 'blocked requests must not reach MCP');
  const params = { task: 'work', target: { providerInstanceId: 'pi', model: 'openrouter/z-ai/glm-5.3-flash', options: { thinking: 'max' } }, isolation: 'worktree' };
  const signal = new AbortController().signal;
  const result = await client.callTool('delegate_task', params, signal);
  assert.equal(result.structuredContent.ok, true);
  assert.equal(calls[0][1], params, 'model and options must not be silently rewritten');
  assert.equal(calls[0][2], signal);
  await client.callTool('task_status', {});
  assert.equal(calls.length, 2);
  assert.equal(fs.readFileSync(original, 'utf8'), bridgeFixture());
});

test('enforcement refuses drift, unreadable source and an unwritable cache; skill drift keeps the model guard', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-policy-drift-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const original = path.join(dir, 'pi-t3-mcp-extension.ts');
  const options = { cachePath: path.join(dir, 'compat.ts'), policy: createSubagentPolicy(policyEnv), log: () => {} };
  await assert.rejects(adaptT3ExtensionArgs(['--extension', original], options), /cannot read T3 extension/);
  for (const source of [GET_COMMANDS_MARKER, MCP_CLIENT_MARKER + MCP_CLIENT_MARKER]) {
    fs.writeFileSync(original, source);
    await assert.rejects(adaptT3ExtensionArgs(['--extension', original], options), /refusing an unguarded launch/);
  }
  fs.writeFileSync(original, bridgeFixture().replace(GET_COMMANDS_MARKER, 'const commands = [];'));
  const adapted = await adaptT3ExtensionArgs(['--extension', original], options);
  assert.equal(adapted.extensionPath, options.cachePath);
  assert.match(fs.readFileSync(options.cachePath, 'utf8'), /ompt3SubagentPolicy.checkTool/);
  fs.writeFileSync(original, bridgeFixture());
  await assert.rejects(adaptT3ExtensionArgs(['--extension', original], { ...options, cachePath: path.join(original, 'compat.ts') }), /cannot write T3 extension/);
});

test('generated routing hooks await latest selections, skip absent task and retain guard', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-live-routing-'));
  const previous = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previous;
  });
  const off = createSubagentPolicy({});
  const file = subagentPolicyArgs(off, true).args[1];
  let names, calls = 0, release;
  const handlers = loadHook(file, {}, {
    getActiveTools: () => names,
    setActiveTools: next => {
      calls++;
      names = next;
      return new Promise(resolve => { release = resolve; });
    }
  });
  for (const event of ['session_start', 'session_tree', 'before_agent_start']) {
    // Represents an earlier serial handler selecting a new enabled subset.
    names = ['read', 'task', 'task_extra', 'custom_' + event, 'mcp__fixture__tool'];
    const expected = names.filter(n => n !== 'task');
    let done = false;
    const pending = handlers.get(event)().then(() => { done = true; });
    assert.deepEqual(Array.from(names), expected);
    await Promise.resolve();
    assert.equal(done, false, 'lifecycle waits for the setter');
    release();
    await pending;
    const count = calls;
    await handlers.get(event)();
    assert.equal(calls, count, 'already absent means no setter invocation');
  }
  names.push('task');
  const guard = handlers.get('tool_call');
  assert.equal(guard({ toolName: 'task', input: {} }).block, true);
  assert.equal(guard({ toolName: 'task_extra', input: {} }), undefined);
  assert.equal(guard({ toolName: 'custom', input: {} }), undefined);
  // Routing is captured by content, not subsequent environment changes.
  const unchanged = subagentPolicyArgs(off, true).args[1];
  assert.equal(unchanged, file);
  const policyOnly = subagentPolicyArgs(createSubagentPolicy(policyEnv), false).args[1];
  assert.notEqual(policyOnly, file);
});

test('filter API failures diagnose headlessly without losing the task guard', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-routing-errors-'));
  const previous = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previous;
  });
  const file = subagentPolicyArgs(createSubagentPolicy({}), true).args[1];
  for (const api of [
    {},
    { getActiveTools() { throw Error('getter'); }, setActiveTools() {} },
    { getActiveTools: () => ['task'], setActiveTools() { throw Error('setter'); } },
    { getActiveTools: () => ['task'], setActiveTools: async () => { throw Error('rejected'); } }
  ]) {
    const diagnostics = [];
    const handlers = loadHook(file, {}, api, diagnostics);
    for (const event of ['session_start', 'session_tree', 'before_agent_start']) {
      const count = diagnostics.length;
      await handlers.get(event)();
      assert(diagnostics.length > count, 'failure must be visible without UI');
      assert.equal(handlers.get('tool_call')({ toolName: 'task', input: {} }).block, true);
      assert.equal(handlers.get('tool_call')({ toolName: 'task_extra', input: {} }), undefined);
    }
  }
});
