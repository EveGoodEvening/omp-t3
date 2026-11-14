'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createDelegateModelDefaults } = require('../src/delegate_models.js');
const { createSubagentPolicy, subagentPolicyArgs } = require('../src/subagent_policy.js');
const { adaptT3ExtensionArgs, GET_COMMANDS_MARKER, MCP_CLIENT_MARKER } = require('../src/extension_compat.js');

// Shape of OMP's settings singleton as seen through `pi.pi.settings`
// (verified against OMP 18.20.0: getModelRoles() and mirrorState()).
function fakeSettings({ roles = {}, global = {}, project = {}, configOverlay = {}, overrides = {} } = {}) {
  return {
    getModelRoles: () => roles,
    mirrorState: () => ({ global, project, configOverlay, overrides })
  };
}

const userConfig = {
  roles: {
    default: 'openai-codex/gpt-6.1-sol:medium',
    smol: 'devin/swe-2-flash:medium',
    slow: 'openai-codex/gpt-6-astra:max',
    task: 'devin/swe-2-flash:medium'
  },
  global: {
    task: {
      agentModelOverrides: {
        task: 'devin/swe-2-flash:medium',
        reviewer: 'devin/swe-2-flash:medium',
        'code-architect': 'openai-codex/gpt-6-astra:max',
        scout: '@smol'
      }
    }
  }
};

const host = settings => ({ pi: { settings } });

test('fills an omitted model and thinking from the agent override chosen by role', () => {
  const defaults = createDelegateModelDefaults(host(fakeSettings(userConfig)), {});
  const cases = [
    [undefined, 'devin/swe-2-flash', 'medium'],
    ['implementation', 'devin/swe-2-flash', 'medium'],
    ['review', 'devin/swe-2-flash', 'medium'],
    ['design', 'openai-codex/gpt-6-astra', 'max'],
    ['research', 'devin/swe-2-flash', 'medium'],
    ['unknown-role', 'devin/swe-2-flash', 'medium']
  ];
  for (const [role, model, thinking] of cases) {
    const params = { task: 'x', ...(role ? { role } : {}) };
    const out = defaults.apply('mcp__t3-code__delegate_task', params);
    assert.deepEqual(out.target, { model, options: { thinking } }, String(role));
    assert.equal(out.task, 'x');
    assert.equal(params.target, undefined, 'input is not mutated');
  }
  assert.equal(defaults.resolve('design').source, 'task.agentModelOverrides.code-architect');
  assert.equal(defaults.resolve('research').source, 'task.agentModelOverrides.scout');
});

test('falls back to modelRoles.task and resolves @role and legacy pi/role aliases', () => {
  const settings = fakeSettings({ roles: { task: '@smol:high', smol: 'pi/tiny', tiny: 'provider/tiny-model:low' } });
  const defaults = createDelegateModelDefaults(host(settings), {});
  assert.deepEqual(defaults.resolve('implementation'), { model: 'provider/tiny-model', thinking: 'high', source: 'modelRoles.task' });
  // reviewer frontmatter @slow is unset here, so OMP would run the session model.
  assert.equal(defaults.resolve('review'), null);
  const loop = createDelegateModelDefaults(host(fakeSettings({ roles: { task: '@a', a: '@b', b: '@a' } })), {});
  assert.equal(loop.resolve(), null, 'alias cycles resolve to nothing');
});

test('later settings layers win and fallback chains use their first entry', () => {
  const settings = fakeSettings({
    roles: { task: 'r/role' },
    global: { task: { agentModelOverrides: { task: 'g/global', reviewer: 'g/reviewer' } } },
    project: { task: { agentModelOverrides: { task: 'p/project' } } },
    configOverlay: { task: { agentModelOverrides: { reviewer: ['o/first:low', 'o/second'] } } },
    overrides: { task: { agentModelOverrides: { task: 'x/runtime, y/next' } } }
  });
  const defaults = createDelegateModelDefaults(host(settings), {});
  assert.deepEqual(defaults.resolve('general'), { model: 'x/runtime', thinking: undefined, source: 'task.agentModelOverrides.task' });
  assert.deepEqual(defaults.resolve('review'), { model: 'o/first', thinking: 'low', source: 'task.agentModelOverrides.reviewer' });
});

test('older settings without mirrorState read the global and project layers', () => {
  const settings = {
    getModelRoles: () => ({ task: 'r/role' }),
    getGlobalSettings: () => ({ task: { agentModelOverrides: { task: 'g/global' } } }),
    getProjectSettings: () => ({ task: { agentModelOverrides: { task: 'p/project' } } })
  };
  assert.equal(createDelegateModelDefaults(host(settings), {}).resolve().model, 'p/project');
});

test('explicit models, other providers, other machines and opt-out are left untouched', () => {
  const defaults = createDelegateModelDefaults(host(fakeSettings(userConfig)), {});
  const untouched = [
    { task: 'x', target: { model: 'openai-codex/gpt-6.1-sol' } },
    { task: 'x', target: { providerInstanceId: 'codex' } },
    { task: 'x', target: { driverKind: 'claudeAgent' } },
    { task: 'x', target: { environmentId: 'vps' } },
    { task: 'x', target: 'not-an-object' }
  ];
  for (const params of untouched) assert.equal(defaults.apply('delegate_task', params), params);
  const other = { task: 'x' };
  assert.equal(defaults.apply('task_status', other), other);
  assert.equal(defaults.apply('mcp__t3-code__orchestrator_capabilities', other), other);
  const off = createDelegateModelDefaults(host(fakeSettings(userConfig)), { OMPT3_DELEGATE_MODEL_ROLES: '0' });
  assert.equal(off.apply('delegate_task', other), other);
  // Explicit Pi provider still gets the configured model.
  const pi = defaults.apply('mcp__t3_code__delegate_task', { task: 'x', target: { providerInstanceId: 'pi', model: '' } });
  assert.deepEqual(pi.target, { providerInstanceId: 'pi', model: 'devin/swe-2-flash', options: { thinking: 'medium' } });
});

test('caller options are preserved: thinking is added, never replaced, and explicit clears stay empty', () => {
  const defaults = createDelegateModelDefaults(host(fakeSettings(userConfig)), {});
  const apply = options => defaults.apply('delegate_task', { task: 'x', target: { options } }).target.options;
  assert.deepEqual(apply({ thinking: 'low' }), { thinking: 'low' });
  assert.deepEqual(apply({ fast: true }), { fast: true, thinking: 'medium' });
  assert.deepEqual(apply([{ id: 'fast', value: true }]), [{ id: 'fast', value: true }, { id: 'thinking', value: 'medium' }]);
  assert.deepEqual(apply([{ id: 'thinking', value: 'high' }]), [{ id: 'thinking', value: 'high' }]);
  assert.deepEqual(apply({}), {});
  assert.deepEqual(apply([]), []);
});

test('unavailable or throwing settings pass the call through unchanged', () => {
  const params = { task: 'x' };
  for (const h of [undefined, {}, { pi: {} }, { pi: { settings: null } }]) {
    assert.equal(createDelegateModelDefaults(h, {}).apply('delegate_task', params), params);
  }
  const throwing = {
    getModelRoles: () => { throw new Error('boom'); },
    mirrorState: () => { throw new Error('boom'); }
  };
  assert.equal(createDelegateModelDefaults(host(throwing), {}).apply('delegate_task', params), params);
  const bad = fakeSettings({ roles: { task: 'bad model id' } });
  assert.equal(createDelegateModelDefaults(host(bad), {}).apply('delegate_task', params), params);
});

test('thinking suffixes follow OMP: exact or unique 2+ prefix, case-sensitive, auto/inherit set no level', () => {
  const resolveTask = spec => createDelegateModelDefaults(host(fakeSettings({ roles: { task: spec, smol: 'p/smol:low' } })), {}).resolve();
  assert.deepEqual(resolveTask('p/m:med'), { model: 'p/m', thinking: 'medium', source: 'modelRoles.task' });
  assert.deepEqual(resolveTask('p/m:xhi'), { model: 'p/m', thinking: 'xhigh', source: 'modelRoles.task' });
  assert.deepEqual(resolveTask('p/m:auto'), { model: 'p/m', thinking: undefined, source: 'modelRoles.task' });
  assert.deepEqual(resolveTask('p/m:inherit'), { model: 'p/m', thinking: undefined, source: 'modelRoles.task' });
  assert.equal(resolveTask('p/m:HIGH').model, 'p/m:HIGH', 'uppercase is not a selector in OMP');
  assert.equal(resolveTask('p/m:m').model, 'p/m:m', 'ambiguous single-letter prefix is not a selector');
  assert.deepEqual(resolveTask('@smol:xhi'), { model: 'p/smol', thinking: 'xhigh', source: 'modelRoles.task' });
  assert.deepEqual(resolveTask('@smol'), { model: 'p/smol', thinking: 'low', source: 'modelRoles.task' });
});

test('session-model selections leave the call for T3 to inherit', () => {
  const roles = { default: 'p/default:high', task: 'p/task' };
  for (const override of ['*', '*:high', 'default', '@default', 'pi/default']) {
    const settings = fakeSettings({ roles, global: { task: { agentModelOverrides: { task: override } } } });
    const defaults = createDelegateModelDefaults(host(settings), {});
    if (override === '*:high') {
      assert.deepEqual(defaults.resolve(), { model: 'p/default', thinking: 'high', source: 'task.agentModelOverrides.task' });
    } else {
      assert.equal(defaults.resolve(), null, override);
    }
  }
  // Alias to an unset role: OMP falls back to the session model, so no fill
  // (rather than silently picking modelRoles.task).
  const unset = fakeSettings({ roles: { task: 'p/task' }, global: { task: { agentModelOverrides: { reviewer: '@slow' } } } });
  const params = { task: 'x', role: 'review' };
  assert.equal(createDelegateModelDefaults(host(unset), {}).apply('delegate_task', params), params);
  // `*` resolves through the default role when configured.
  assert.deepEqual(
    createDelegateModelDefaults(host(fakeSettings({ roles: { default: 'p/d', task: '*' } })), {}).resolve(),
    { model: 'p/d', thinking: undefined, source: 'modelRoles.task' });
});

test('without overrides, review and research follow the bundled agent frontmatter', () => {
  const roles = { slow: 'p/slow:max', smol: 'p/smol', task: 'p/task:low' };
  const defaults = createDelegateModelDefaults(host(fakeSettings({ roles })), {});
  assert.deepEqual(defaults.resolve('review'), { model: 'p/slow', thinking: 'max', source: 'reviewer frontmatter (@slow)' });
  assert.deepEqual(defaults.resolve('research'), { model: 'p/smol', thinking: 'medium', source: 'scout frontmatter (@smol)' });
  assert.deepEqual(defaults.resolve('design'), { model: 'p/task', thinking: 'low', source: 'modelRoles.task' });
});

// The real adapted bridge: `pi` in the extension factory carries OMP settings.
function bridgeFixture() {
  return [
    'function createMcpClient() { return { callTool: async (...args) => { calls.push(args); return { content: [], structuredContent: { ok: true } }; } }; }',
    'async function start(pi) {',
    '  const endpoint = "mock", token = "mock";',
    `  ${GET_COMMANDS_MARKER}`,
    `  ${MCP_CLIENT_MARKER}`,
    '  return client;',
    '}',
    'start(fakePi);'
  ].join('\n');
}

async function adaptedClient(t, env, settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-delegate-models-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const original = path.join(dir, 'pi-t3-mcp-extension.ts');
  const cachePath = path.join(dir, 'compat.ts');
  fs.writeFileSync(original, bridgeFixture());
  const adapted = await adaptT3ExtensionArgs(['--extension', original], { cachePath, policy: createSubagentPolicy(env), log: () => {} });
  assert.equal(adapted.extensionPath, cachePath);
  const calls = [];
  const fakePi = { getCommands: () => [], pi: { settings } };
  const client = await vm.runInNewContext(fs.readFileSync(cachePath, 'utf8'), { process: { env }, calls, fakePi });
  return { client, calls };
}

test('adapted bridge sends the configured model when the policy is off', async t => {
  const { client, calls } = await adaptedClient(t, { OMPT3_SUBAGENT_ALLOWED_MODELS: '', OMPT3_SUBAGENT_DISALLOWED_MODELS: '' }, fakeSettings(userConfig));
  await client.callTool('delegate_task', { task: 'review it', role: 'review' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { task: 'review it', role: 'review', target: { model: 'devin/swe-2-flash', options: { thinking: 'medium' } } });
  const explicit = { task: 'x', target: { model: 'openai-codex/gpt-6.1-sol' } };
  await client.callTool('delegate_task', explicit);
  assert.equal(calls[1][1], explicit, 'explicit models are not rewritten');
  await client.callTool('task_status', { taskId: 't' });
  assert.deepEqual(calls[2][1], { taskId: 't' });
});

test('adapted bridge checks the filled model against an active policy', async t => {
  const env = { OMPT3_SUBAGENT_ALLOWED_MODELS: 'swe-2-flash', OMPT3_SUBAGENT_DISALLOWED_MODELS: '' };
  const { client, calls } = await adaptedClient(t, env, fakeSettings(userConfig));
  const ok = await client.callTool('delegate_task', { task: 'x' });
  assert.equal(ok.isError, undefined);
  assert.equal(calls[0][1].target.model, 'devin/swe-2-flash');
  const denied = await client.callTool('delegate_task', { task: 'x', role: 'design' });
  assert.equal(denied.isError, true);
  assert.match(denied.content[0].text, /rejected "openai-codex\/gpt-6-astra"/);
  assert.equal(calls.length, 1);
});

test('policy hook extension checks the filled model, not the omitted one', t => {
  const previous = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-delegate-hook-'));
  t.after(() => {
    fs.rmSync(process.env.XDG_CACHE_HOME, { recursive: true, force: true });
    if (previous === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previous;
  });
  const env = { OMPT3_SUBAGENT_ALLOWED_MODELS: 'swe-2-flash' };
  const args = subagentPolicyArgs(createSubagentPolicy(env));
  const source = fs.readFileSync(args[1], 'utf8');
  for (const [settings, blocked] of [[fakeSettings(userConfig), false], [undefined, true]]) {
    let hook;
    const pi = { pi: { settings }, on: (name, fn) => { assert.equal(name, 'tool_call'); hook = fn; } };
    vm.runInNewContext(source.replace('export default function', 'function') + '\nompT3SubagentPolicy(pi);', { process: { env }, pi });
    const input = { task: 'x' };
    const result = hook({ toolName: 'mcp__t3-code__delegate_task', input });
    if (blocked) assert.match(result.reason, /target.model/);
    else {
      // The hook must send the model it approved: nothing else fills it
      // when the T3 bridge is not the adapted copy.
      assert.equal(result.block, undefined);
      assert.deepEqual(JSON.parse(JSON.stringify(result.input)), { task: 'x', target: { model: 'devin/swe-2-flash', options: { thinking: 'medium' } } });
      assert.deepEqual(input, { task: 'x' }, 'original input is not mutated');
    }
    const explicit = { task: 'x', target: { model: 'devin/swe-2-flash' } };
    assert.equal(hook({ toolName: 'delegate_task', input: explicit }), undefined, 'unchanged input needs no replacement');
    assert.match(hook({ toolName: 'delegate_task', input: { task: 'x', role: 'design' } }).reason, /Subagent model policy/);
  }
});
