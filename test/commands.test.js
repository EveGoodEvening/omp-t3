'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { CommandBridge, resolveSkillPath } = require('../src/commands.js');

const CATALOG = [
  { name: 'context', description: 'Show context usage', source: 'builtin' },
  { name: 'stats', description: 'Launch the local stats dashboard', source: 'builtin' },
  { name: 'skill:commit', description: 'Commit staged changes', source: 'skill' },
  { name: 'review', description: 'Launch interactive code review', source: 'custom' },
  { name: 'init', description: 'Generate AGENTS.md', source: 'file' },
  { name: 'autoresearch', description: 'Toggle builtin autoresearch mode', source: 'extension' },
  { name: 'future-kind', description: 'Unknown source', source: 'hologram' },
  { name: 'nodesc', source: 'builtin' }
];

test('translate projects OMP sources onto the Pi enum and preserves skill names', () => {
  const bridge = new CommandBridge();
  const out = bridge.translate(CATALOG);
  assert.deepStrictEqual(out, [
    { name: 'context', description: 'Show context usage', source: 'extension' },
    { name: 'stats', description: 'Launch the local stats dashboard', source: 'extension' },
    { name: 'skill:commit', description: 'Commit staged changes', source: 'skill' },
    { name: 'review', description: 'Launch interactive code review', source: 'prompt' },
    { name: 'init', description: 'Generate AGENTS.md', source: 'prompt' },
    { name: 'autoresearch', description: 'Toggle builtin autoresearch mode', source: 'extension' },
    { name: 'future-kind', description: 'Unknown source', source: 'extension' },
    { name: 'nodesc', description: '', source: 'extension' }
  ]);
});

test('translate tolerates null catalog', () => {
  const bridge = new CommandBridge();
  assert.deepStrictEqual(bridge.translate(null), []);
});

test('available_commands_update push is cached and suppressed', () => {
  const bridge = new CommandBridge();
  const res = bridge.handleDownstreamFrame(
    JSON.stringify({ type: 'available_commands_update', commands: CATALOG })
  );
  assert.strictEqual(res.handled, true);
  assert.strictEqual(res.emit, undefined);
  assert.strictEqual(bridge.commands.length, CATALOG.length);
});

// OMP serves skill commands without any path, but T3's Pi driver needs the
// real SKILL.md location to inline `$name` / `@name` mentions and to scope
// them; without it T3 falls back to a dangling `pi:skill:<name>` string.
// OMP discovers skills from hierarchical `.agents/skills` folders — project
// root first, then the user home.
test('resolveSkillPath finds project .agents/skills before user roots', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-skills-'));
  const projectFile = path.join(root, '.agents', 'skills', 'alpha', 'SKILL.md');
  fs.mkdirSync(path.dirname(projectFile), { recursive: true });
  fs.writeFileSync(projectFile, '---\nname: alpha\n---\n');
  try {
    assert.deepEqual(resolveSkillPath('skill:alpha', root), { path: projectFile, scope: 'project' });
    assert.equal(resolveSkillPath('does-not-exist-anywhere', root), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolveSkillPath falls back to the user home root', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const realHome = os.homedir();
  const homeSkills = path.join(realHome, '.agents', 'skills', `ompt3-home-skill-${process.pid}`);
  const homeFile = path.join(homeSkills, 'SKILL.md');
  fs.mkdirSync(homeSkills, { recursive: true });
  fs.writeFileSync(homeFile, '---\nname: probe\n---\n');
  try {
    const resolved = resolveSkillPath('skill:ompt3-home-skill-' + process.pid, '/nonexistent-cwd');
    assert.deepEqual(resolved, { path: homeFile, scope: 'user' });
  } finally {
    fs.rmSync(homeSkills, { recursive: true, force: true });
  }
});

test('push cache enrichment fills real paths and translate preserves them', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-skills-'));
  const skillFile = path.join(root, '.agents', 'skills', 'beta', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, '---\nname: beta\n---\n');
  try {
    const bridge = new CommandBridge({ cwd: root });
    const res = bridge.handleDownstreamFrame(JSON.stringify({
      type: 'available_commands_update',
      commands: [
        { name: 'skill:beta', description: 'Beta skill', source: 'skill' },
        { name: 'skill:ghost', description: 'Not on disk', source: 'skill' },
        { name: 'model', description: 'Show model', source: 'builtin', input: { hint: 'arguments' } }
      ]
    }));
    assert.equal(res.handled, true);
    const cached = bridge.commands;
    assert.equal(cached[0].path, skillFile);
    assert.deepEqual(cached[0].sourceInfo, { path: skillFile, scope: 'project' });
    assert.equal(cached[1].path, undefined, 'unresolvable skill stays untouched');
    const out = bridge.translate(cached);
    assert.equal(out[0].path, skillFile);
    assert.deepEqual(out[0].sourceInfo, { path: skillFile, scope: 'project' });
    assert.deepEqual(out[2].input, { hint: 'arguments' });
    assert.equal(out[1].path, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('warm cache answers get_commands synchronously without touching OMP', () => {
  const bridge = new CommandBridge();
  bridge.handleDownstreamFrame(
    JSON.stringify({ type: 'available_commands_update', commands: CATALOG })
  );
  let sentToOmp = 0;
  let answer = null;
  bridge.answerGetCommands('req-7', () => { sentToOmp += 1; }, (line) => { answer = line; });
  assert.strictEqual(sentToOmp, 0);
  const parsed = JSON.parse(answer);
  assert.strictEqual(parsed.id, 'req-7');
  assert.strictEqual(parsed.type, 'response');
  assert.strictEqual(parsed.command, 'get_commands');
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.data.commands.length, CATALOG.length);
  assert.strictEqual(parsed.data.commands[0].source, 'extension');
  assert.strictEqual(parsed.data.commands[2].name, 'skill:commit');
});

test('cold cache injects a refresh, answers on response, and suppresses the response', () => {
  const bridge = new CommandBridge({ refreshTimeoutMs: 500 });
  const sent = [];
  let answer = null;
  bridge.answerGetCommands(42, (line) => sent.push(line), (line) => { answer = line; });
  assert.strictEqual(answer, null); // deferred until OMP responds
  assert.strictEqual(sent.length, 1);
  const injected = JSON.parse(sent[0]);
  assert.match(injected.id, /^ompt3-cmds-\d+$/);
  assert.strictEqual(injected.type, 'get_available_commands');

  const res = bridge.handleDownstreamFrame(
    JSON.stringify({ id: injected.id, type: 'response', success: true, data: { commands: CATALOG } })
  );
  assert.strictEqual(res.handled, true); // suppressed from T3
  assert.strictEqual(res.emit, undefined);

  const parsed = JSON.parse(answer);
  assert.strictEqual(parsed.id, 42);
  assert.strictEqual(parsed.data.commands.length, CATALOG.length);
});

test('cold cache answers empty after the refresh timeout', async () => {
  const bridge = new CommandBridge({ refreshTimeoutMs: 20 });
  let answer = null;
  bridge.answerGetCommands('late', () => {}, (line) => { answer = line; });
  assert.strictEqual(answer, null);
  await new Promise((resolve) => setTimeout(resolve, 60));
  const parsed = JSON.parse(answer);
  assert.strictEqual(parsed.id, 'late');
  assert.deepStrictEqual(parsed.data.commands, []);
});

test('command_output is re-emitted as a fenced markdown block with ANSI stripped', () => {
  const bridge = new CommandBridge();
  const raw = JSON.stringify({
    type: 'command_output',
    text: '\x1b[38;5;60mContext window:\x1b[39m 1000000 tokens (1% used)\n  System prompt  [\x1b[38;5;60m░░░░\x1b[39m] 1% 6748 tokens\n  Messages      [░░] 10% 100933 tokens'
  });
  const res = bridge.handleDownstreamFrame(raw);
  assert.strictEqual(res.handled, true);
  const parsed = JSON.parse(res.emit.trim());
  assert.strictEqual(parsed.type, 'message_update');
  assert.deepStrictEqual(parsed.assistantMessageEvent, {
    type: 'text_end',
    contentIndex: 0,
    content: '```\nContext window: 1000000 tokens (1% used)\n  System prompt  [░░░░] 1% 6748 tokens\n  Messages      [░░] 10% 100933 tokens\n```'
  });
});

test('toMarkdownBlock grows the fence when the output contains backticks', () => {
  // Runs of 1 fit inside the default 3-backtick fence (3 >= 1 + 1).
  assert.strictEqual(
    CommandBridge.toMarkdownBlock('uses `inline` code'),
    '```\nuses `inline` code\n```'
  );
  // A 3-backtick run requires a 4-backtick fence.
  assert.strictEqual(CommandBridge.toMarkdownBlock('```\nfence\n```'), '````\n```\nfence\n```\n````');
});

test('blank command_output is swallowed, malformed frames pass through', () => {
  const bridge = new CommandBridge();
  const blank = bridge.handleDownstreamFrame(JSON.stringify({ type: 'command_output', text: '\x1b[0m\n\n' }));
  assert.strictEqual(blank.handled, true);
  assert.strictEqual(blank.emit, undefined);

  const malformed = bridge.handleDownstreamFrame('not json with "command_output" inside');
  assert.strictEqual(malformed.handled, false);
});

test('ordinary downstream frames pass through untouched', () => {
  const bridge = new CommandBridge();
  const line = JSON.stringify({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'hi' } });
  const res = bridge.handleDownstreamFrame(line);
  assert.strictEqual(res.handled, false);
});
