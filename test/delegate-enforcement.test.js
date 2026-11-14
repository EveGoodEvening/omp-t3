'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs } = require('../src/cli.js');
const { loadHook } = require('./generated-hook.js');

const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-routing-table-'));
process.env.XDG_CACHE_HOME = cache;
process.env.OMPT3_MAX_SUBAGENTS = '';
test.after(() => fs.rmSync(cache, { recursive: true, force: true }));

for (const routing of [undefined, '0']) {
  for (const explicit of [[], ['--tools', 'task,custom'], ['--tools=task,custom']]) {
    for (const policy of [false, true]) {
      test(`routing table env=${routing} tools=${explicit[0]} policy=${policy}`, async () => {
        if (routing === undefined) delete process.env.OMPT3_DELEGATE_TASKS;
        else process.env.OMPT3_DELEGATE_TASKS = routing;
        process.env.OMPT3_SUBAGENT_ALLOWED_MODELS = policy ? 'allowed' : '';
        process.env.OMPT3_SUBAGENT_DISALLOWED_MODELS = '';
        const user = ['--extension', '/user/extension.ts', '--session', 'session.jsonl', ...explicit];
        const { ompArgs, delegation } = parseArgs(user);
        const enabled = routing !== '0' && explicit.length === 0;
        assert.equal(delegation.routingEnabled, enabled);
        assert.deepEqual(ompArgs.slice(2, 2 + user.length), user);
        assert.deepEqual(ompArgs.filter(a => a === '--tools' || a.startsWith('--tools=')), explicit.length ? [explicit[0]] : []);
        assert.equal(ompArgs.some(a => a.includes('T3 `delegate_task`')), enabled);
        let names = ['read', 'task', 'custom', 'task_extra'];
        let writes = 0;
        const generated = delegation.requiredHook ? ompArgs.at(-1) : null;
        const handlers = generated ? loadHook(generated, { ...process.env }, {
          getActiveTools: () => names,
          setActiveTools: async n => { writes++; names = n; }
        }) : new Map();
        await handlers.get('session_start')?.();
        assert.equal(writes, enabled ? 1 : 0);
        assert.deepEqual(Array.from(names), enabled ? ['read', 'custom', 'task_extra'] : ['read', 'task', 'custom', 'task_extra']);
        assert.equal(handlers.get('tool_call')?.({ toolName: 'task', input: {} })?.block === true, enabled || policy);
        assert.equal(handlers.get('tool_call')?.({ toolName: 'task_extra', input: {} }), undefined);
      });
    }
  }
}

test('nonzero routing and both appendices retain session/cap on the final argv', () => {
  process.env.OMPT3_DELEGATE_TASKS = 'yes';
  process.env.OMPT3_SUBAGENT_ALLOWED_MODELS = '';
  process.env.OMPT3_MAX_SUBAGENTS = '2';
  try {
    for (const appendix of [['--append-system-prompt', 'USER RULE'], ['--append-system-prompt=USER RULE']]) {
      const { ompArgs, delegation } = parseArgs(['--session', 's.jsonl', '--fork', ...appendix]);
      assert.equal(delegation.routingEnabled, true);
      assert.deepEqual(ompArgs.slice(2, 5), ['--session', 's.jsonl', '--fork']);
      assert(ompArgs.some(a => a.startsWith('USER RULE\n\n') || a.startsWith('--append-system-prompt=USER RULE\n\n')));
      const config = ompArgs[ompArgs.indexOf('--config') + 1];
      assert.match(fs.readFileSync(config, 'utf8'), /\bmaxConcurrency:\s+2\b/);
    }
  } finally { process.env.OMPT3_MAX_SUBAGENTS = ''; }
});

test('empty and malformed explicit tools stay explicit in both spellings', () => {
  process.env.OMPT3_DELEGATE_TASKS = '1';
  for (const flags of [['--tools'], ['--tools', ''], ['--tools='], ['--tools', 'missing,task'], ['--tools=missing,task']]) {
    const result = parseArgs(flags);
    assert.equal(result.delegation.routingEnabled, false);
    assert.deepEqual(result.ompArgs.slice(2), flags);
  }
});
