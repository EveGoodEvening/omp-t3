'use strict';

/**
 * Bridges OMP's command catalog and local slash-command output into the
 * T3 Code Pi dialect.
 *
 * - Command discovery: T3 polls `get_commands` (Pi dialect, poll-only — there
 *   is no Pi push event). OMP serves `get_available_commands` plus pushes
 *   `available_commands_update` at startup and on metadata changes. The
 *   bridge caches those pushes (suppressing the raw frames, which T3's
 *   adapter would ignore) and serves T3's polls from the cache, with a
 *   single-flight injected refresh when the cache is still cold.
 * - Source mapping: OMP's richer catalog (builtin/extension/custom/file/skill)
 *   is projected onto Pi's `extension`/`prompt`/`skill` enum. OMP skill names
 *   are already `skill:`-prefixed, matching Pi's convention, so they land in
 *   T3's `$` skill menu unchanged. T3's bundled MCP extension needs each
 *   skill's file path through a different channel (the extension's in-process
 *   `getCommands()`); see src/extension_compat.js.
 * - Local slash-command output: OMP runs builtin commands (e.g. `/context`,
 *   `/stats`) locally and emits `command_output` text frames instead of
 *   starting an agent run. T3 has no such frame, so each one is re-emitted as
 *   a `message_update`/`text_end` inside the (command-only) turn, ANSI-stripped.
 */

const ANSI_RE = /\x1B(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;

// OMP source -> Pi source. Unknown sources are handler-executed commands,
// which behave like Pi extension commands.
const SOURCE_MAP = {
  builtin: 'extension',
  extension: 'extension',
  custom: 'prompt',
  file: 'prompt',
  skill: 'skill'
};

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Resolves the on-disk SKILL.md for an OMP skill command name. OMP's catalog
 * push carries skill commands without any path, but T3's Pi driver reads
 * `path` / `sourceInfo.path` to inline `$name` / `@name` skill mentions and
 * to scope them; without it T3 falls back to a dangling `pi:skill:<name>`
 * string the agent cannot read. OMP discovers skills from hierarchical
 * `.agents/skills` folders — project root first, then the user home (with
 * `.claude/skills` kept as an equivalent agent-specific layout).
 * @param {string} name OMP command name (`skill:<name>` or bare `<name>`).
 * @param {string} cwd workspace root the session was launched in.
 * @returns {{ path: string, scope: 'project' | 'user' } | null}
 */
function resolveSkillPath(name, cwd = process.cwd()) {
  const bare = typeof name === 'string' && name.startsWith('skill:') ? name.slice(6) : name;
  if (!bare) return null;
  const home = os.homedir();
  const candidates = [
    { dir: path.join(cwd, '.agents', 'skills', bare), scope: 'project' },
    { dir: path.join(cwd, '.claude', 'skills', bare), scope: 'project' },
    { dir: path.join(home, '.agents', 'skills', bare), scope: 'user' },
    { dir: path.join(home, '.claude', 'skills', bare), scope: 'user' }
  ];
  for (const candidate of candidates) {
    const file = path.join(candidate.dir, 'SKILL.md');
    try {
      if (fs.statSync(file).isFile()) return { path: file, scope: candidate.scope };
    } catch {
      // Not present in this root: try the next one.
    }
  }
  return null;
}

/**
 * Fills in real skill file paths on OMP's cached catalog entries. Mutates in
 * place (the parsed push JSON is bridge-owned) and is idempotent.
 * @param {Array<{ name: string, source?: string, path?: string, sourceInfo?: object }>|null} commands
 * @param {string} cwd
 * @returns {Array} the same array, enriched.
 */
function enrichSkillCommands(commands, cwd = process.cwd()) {
  if (!Array.isArray(commands)) return commands;
  for (const command of commands) {
    if (!command || command.source !== 'skill' || command.path) continue;
    const resolved = resolveSkillPath(command.name, cwd);
    if (!resolved) continue;
    command.path = resolved.path;
    if (!command.sourceInfo || typeof command.sourceInfo !== 'object') command.sourceInfo = {};
    if (!command.sourceInfo.path) command.sourceInfo.path = resolved.path;
    if (!command.sourceInfo.scope) command.sourceInfo.scope = resolved.scope;
  }
  return commands;
}

class CommandBridge {
  /**
   * @param {{ refreshTimeoutMs?: number }} [options]
   */
  constructor(options = {}) {
    this.commands = null; // last raw OMP catalog (array of command entries)
    this.pendingRefresh = null; // { reqId, timer, deliver }
    // Feature 002 US6 / FR8: omp pushes its catalog right after ready on a
    // cold start, but on slow machines the binary's own startup (npm CLIs,
    // extension copies) can exceed a 2.5s bound. T3 renders an empty `/` menu
    // and never re-polls within the turn, so the wait bound trades a 2.5s
    // worst case for correctness. The push usually resolves this in <1s.
    this.refreshTimeoutMs = options.refreshTimeoutMs ?? 10_000;
    this.seq = 0;
    this.cwd = options.cwd || process.cwd();
  }

  /**
   * Handles a downstream (OMP -> T3) frame.
   * @param {string} line
   * @returns {{ handled: boolean, emit?: string }}
   */
  handleDownstreamFrame(line) {
    // Catalog push: cache it, never forward (T3 polls instead).
    if (line.includes('"available_commands_update"')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'available_commands_update' && Array.isArray(parsed.commands)) {
          this.commands = enrichSkillCommands(parsed.commands, this.cwd);
        }
      } catch {
        // Malformed push: leave cache untouched, still suppress the frame.
      }
      return { handled: true };
    }

    // Response to our own injected refresh request: cache and complete the
    // waiting get_commands answer; suppress from T3.
    if (this.pendingRefresh && line.includes(this.pendingRefresh.reqId)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'response' && parsed.id === this.pendingRefresh.reqId) {
          if (parsed.success && parsed.data && Array.isArray(parsed.data.commands)) {
            this.commands = enrichSkillCommands(parsed.data.commands, this.cwd);
          }
          const refresh = this.pendingRefresh;
          this._clearRefresh();
          refresh.deliver();
          return { handled: true };
        }
      } catch {
        // Fall through: malformed frame is passed through untouched.
      }
    }

    // Local command output: render inside the command-only turn.
    if (line.includes('"command_output"')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'command_output' && typeof parsed.text === 'string') {
          const text = parsed.text.replace(ANSI_RE, '').replace(/\r/g, '');
          const block = CommandBridge.toMarkdownBlock(text);
          if (block) {
            return {
              handled: true,
              emit: JSON.stringify({
                type: 'message_update',
                assistantMessageEvent: { type: 'text_end', contentIndex: 0, content: block }
              }) + '\n'
            };
          }
          return { handled: true };
        }
      } catch {
        // Fall through: malformed frame is passed through untouched.
      }
    }

    return { handled: false };
  }

  /**
   * Wraps terminal-style command output in a markdown fenced code block.
   * T3 renders assistant text as markdown: single newlines collapse into
   * soft wraps, which destroys omp's line-oriented bar-chart layout. Inside
   * a fence the renderer preserves newlines and uses a monospace face, so
   * the bars align as omp drew them.
   * @param {string} text - ANSI-stripped command output.
   * @returns {string|null} fenced block, or null when nothing remains.
   */
  static toMarkdownBlock(text) {
    const trimmed = text.replace(/^\n+|\n+$/g, '').trim();
    if (!trimmed) return null;
    const longestBacktickRun = (trimmed.match(/`+/g) || []).reduce((m, r) => Math.max(m, r.length), 0);
    const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));
    return `${fence}\n${trimmed}\n${fence}`;
  }

  /**
   * Answers a T3 `get_commands` poll. Serves the cache synchronously when
   * warm; otherwise injects one `get_available_commands` into OMP and
   * answers when it responds (or after a bounded timeout, so T3's
   * initialization probe can never stall).
   * @param {string} reqId - T3's request id, echoed in the response.
   * @param {(line: string) => void} sendToOmp
   * @param {(answer: string) => void} done
   */
  answerGetCommands(reqId, sendToOmp, done) {
    if (this.commands) {
      done(this._response(reqId));
      return;
    }
    if (this.pendingRefresh) {
      // A refresh is already in flight; answer immediately with whatever we
      // have (possibly empty) rather than queueing a second waiter.
      done(this._response(reqId));
      return;
    }
    const refreshId = `ompt3-cmds-${++this.seq}`;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      done(this._response(reqId));
    };
    this.pendingRefresh = {
      reqId: refreshId,
      deliver: finish,
      timer: setTimeout(() => {
        this._clearRefresh();
        finish();
      }, this.refreshTimeoutMs)
    };
    sendToOmp(JSON.stringify({ id: refreshId, type: 'get_available_commands' }) + '\n');
  }

  _clearRefresh() {
    if (!this.pendingRefresh) return;
    clearTimeout(this.pendingRefresh.timer);
    this.pendingRefresh = null;
  }

  _response(reqId) {
    return JSON.stringify({
      id: reqId,
      type: 'response',
      command: 'get_commands',
      success: true,
      data: { commands: this.translate(this.commands) }
    }) + '\n';
  }

  /**
   * Projects OMP's catalog onto Pi's `RpcSlashCommand[]` shape. Skill
   * entries keep their resolved `path` / `sourceInfo` (filled by
   * enrichSkillCommands) — T3's driver reads them to inline skill mentions;
   * `input.hint` passes through for the slash menu's argument hint.
   * @param {Array<{ name: string, description?: string, source?: string, path?: string, sourceInfo?: object, input?: { hint?: string } }>|null} commands
   * @returns {Array<object>}
   */
  translate(commands) {
    return (commands || []).map((cmd) => {
      const projected = {
        name: cmd.name,
        description: cmd.description || '',
        source: SOURCE_MAP[cmd.source] || 'extension'
      };
      if (cmd.path) projected.path = cmd.path;
      if (cmd.sourceInfo && typeof cmd.sourceInfo === 'object') projected.sourceInfo = cmd.sourceInfo;
      if (cmd.input && typeof cmd.input.hint === 'string' && cmd.input.hint) {
        projected.input = { hint: cmd.input.hint };
      }
      return projected;
    });
  }
}

module.exports = {
  CommandBridge,
  SOURCE_MAP,
  resolveSkillPath,
  enrichSkillCommands
};
