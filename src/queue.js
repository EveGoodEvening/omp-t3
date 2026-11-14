'use strict';

const { randomBytes } = require('node:crypto');
const { notifyFrame } = require('./notices.js');

const RESTORE_MS = 1000;
const FOLLOWER_MS = 500;
const FRAME_BYTES = 1024 * 1024;
const TERMINAL_BYTES = 16 * 1024;
const STATE_COUNT = 16;
const encode = (frame) => JSON.stringify(frame) + '\n';
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Unknown commands are mutations. Protocol replies needed to unwind an existing
// tool/dialog are control traffic, not accepted user input.
const READS = new Set(['get_state', 'get_available_models', 'get_commands',
  'get_messages', 'get_entries', 'get_session_tree', 'get_tree', 'get_session_stats',
  'get_last_assistant_text', 'get_subagents', 'get_usage', 'get_skills',
  'extension_ui_response', 'tool_result', 'cancel_subagent', 'ping']);

function definitelyBusy(frame) {
  if (frame.success !== true || !frame.data || typeof frame.data !== 'object' || Array.isArray(frame.data)) return false;
  const d = frame.data;
  // T3 tests literal true for activity. Malformed pending values must not be
  // allowed to bypass the fence on the strength of JS coercion alone.
  return d.isStreaming === true || d.isCompacting === true ||
    (typeof d.pendingMessageCount === 'number' && Number.isFinite(d.pendingMessageCount) && d.pendingMessageCount !== 0);
}

function restored(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('missing restore data');
  let imagesDropped = data.imagesDropped === true;
  const texts = (items) => {
    if (!Array.isArray(items)) throw Error('missing restore array');
    return items.map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.text !== 'string') throw Error('malformed restore item');
      if (item.images !== undefined) {
        if (!Array.isArray(item.images)) throw Error('malformed restore images');
        if (item.images.length) imagesDropped = true;
      }
      return item.text;
    });
  };
  const steering = texts(data.steering);
  const followUp = texts(data.followUp);
  for (const key of ['truncated', 'imagesDropped']) {
    if (owns(data, key) && typeof data[key] !== 'boolean') throw Error('malformed loss flag');
  }
  return { steering, followUp, truncated: data.truncated === true, imagesDropped };
}

class StopController {
  constructor({ emit, write, abort, onTerminal, owner, clock = globalThis }) {
    this.emit = (line, completed) => {
      const t = this.transaction;
      if (t) t.outputPending = (t.outputPending || 0) + 1;
      return emit(line, (error) => {
        if (this.fatal || this.disposed || (t && this.transaction !== t)) return;
        if (error && t) { this.fail(`Stop output failed: ${error.message}`); return; }
        if (t) t.outputPending--;
        completed?.(error);
        t?.deliveryComplete?.();
      });
    };
    this.write = write;
    this.abort = abort;
    this.onTerminal = onTerminal;
    this.owner = owner;
    this.clock = clock;
    this.namespace = `ompt3-stop-${randomBytes(18).toString('hex')}-`;
    this.sequence = 0;
    this.transaction = null;
    this.fatal = false;
    this.disposed = false;
    this.suppressTerminal = false;
    this.abortedTerminalPending = false;
    this.generation = 0;
    this.stateRequests = new Set();
    this.stateRequestBytes = 0;
  }

  response(request, success, data, error) {
    const frame = { type: 'response', command: request.type, success };
    if (owns(request, 'id')) frame.id = request.id;
    if (success) frame.data = data;
    else frame.error = error;
    this.emit(encode(frame));
  }

  notice(message) {
    this.emit(notifyFrame(++this.sequence, message));
  }

  upstream(request) {
    if (this.disposed || this.fatal) return true;
    if (typeof request.id === 'string' && request.id.startsWith(this.namespace)) {
      this.response(request, false, null, 'STOP_RESERVED_ID: private request namespace');
      return true;
    }
    const t = this.transaction;
    if (request.type === 'clear_queue' || request.type === 'abort') {
      if (t) {
        if (request.type === 'abort' && t.request.type === 'clear_queue' && t.eligible && !t.follower && !t.releasing) {
          t.follower = request;
          if (t.complete) {
            t.followerAnswered = true;
            this.response(request, true, t.data);
            if (this.transaction === t) this.release();
          }
        } else {
          t.eligible = false;
          this.response(request, false, null, 'STOP_IN_PROGRESS: overlapping Stop not accepted');
        }
        return true;
      }
      if (typeof this.owner !== 'function') throw Error('Atomic Stop requires an actual process owner');
      this.suppressTerminal = false;
      this.abortedTerminalPending = false;
      const id = this.namespace + (++this.sequence);
      this.transaction = { id, request, eligible: true, follower: null, complete: false,
        terminal: null, states: [], stateBytes: 0, data: null, timer: null };
      const accepted = this.transaction;
      accepted.timer = this.clock.setTimeout(() => {
        if (this.transaction === accepted && !accepted.complete && !this.fatal && !this.disposed) {
          this.fail('restore deadline exceeded');
        }
      }, RESTORE_MS);
      // The deadline and gate exist before cancellation can block or fail.
      this.abort();
      if (!this.fatal && !this.disposed) this.write(encode({ type: 'abort_and_restore_queue', id }));
      return true;
    }
    if (request.type === 'get_state' && typeof request.id === 'string' && !this.stateRequests.has(request.id)) {
      const bytes = Buffer.byteLength(request.id);
      if (this.stateRequests.size === STATE_COUNT || this.stateRequestBytes + bytes > TERMINAL_BYTES) {
        if (t) this.fail('state request correlation overflow');
        else this.response(request, false, null, 'STATE_REQUEST_LIMIT: at most 16 pending state IDs / 16 KiB');
        return true;
      }
      this.stateRequests.add(request.id);
      this.stateRequestBytes += bytes;
    }
    if (!READS.has(request.type)) {
      if (t) {
        t.eligible = false;
        if (!t.complete) {
          this.response(request, false, null, 'STOP_IN_PROGRESS: mutation not accepted; retry explicitly after Stop');
          return true;
        }
        this.release();
        if (this.fatal || this.disposed) return true;
      }
      if (request.type === 'prompt' || request.type === 'abort_and_prompt') {
        this.generation++;
        this.suppressTerminal = false;
        this.abortedTerminalPending = false;
      }
    }
    return false;
  }

  internal(frame, raw) {
    if (typeof frame.id !== 'string' || !frame.id.startsWith(this.namespace)) return false;
    const t = this.transaction;
    if (!t || frame.id !== t.id || t.complete || this.fatal || this.disposed) return true;
    if (frame.type !== 'response' || frame.command !== 'abort_and_restore_queue') {
      this.fail('malformed private response command');
      return true;
    }
    if (Buffer.byteLength(raw + '\n') > FRAME_BYTES) {
      this.fail('restore frame overflow');
      return true;
    }
    if (frame.success !== true) {
      this.fail(frame.error === 'Unknown command: abort_and_restore_queue' ? 'STOP_UNSUPPORTED: atomic Stop unavailable' : 'atomic withdrawal failed; restoration indeterminate');
      return true;
    }
    try { t.data = restored(frame.data); }
    catch (error) { this.fail(error.message); return true; }
    this.clock.clearTimeout(t.timer);
    t.complete = true;
    // This is also the release-completion deadline. Starting release does not
    // renew it; even write(true) can leave an unacknowledged Writable callback.
    t.timer = this.clock.setTimeout(() => {
      if (this.transaction !== t || this.fatal || this.disposed) return;
      if (t.releasing) { this.fail('release output deadline exceeded'); return; }
      this.notice('Stop clear follower did not arrive within 500 ms; releasing the finite finalization fence (not acknowledgement).');
      this.release();
      if (this.transaction === t && !this.fatal && !this.disposed) {
        t.timer = this.clock.setTimeout(() => {
          if (this.transaction === t && !this.fatal && !this.disposed) this.fail('release output deadline exceeded');
        }, 0);
      }
    }, FOLLOWER_MS);
    if (t.data.truncated || t.data.imagesDropped) {
      this.notice('Stop returned text only. ' + (t.data.truncated ? 'OMP omitted withdrawn text; recovery is incomplete. ' : '') +
        (t.data.imagesDropped ? 'Images were dropped and cannot be restored. ' : '') + 'T3 may truncate the displayed notice.');
    }
    if ((t.request.type === 'abort' || t.follower) && (t.data.steering.length || t.data.followUp.length)) {
      this.notice('Stop withdrew queued text (not composer restoration; T3 may truncate this display):\n' +
        encode({ steering: t.data.steering, followUp: t.data.followUp }).trimEnd());
    }
    if (this.transaction !== t || this.fatal || this.disposed) return true;
    t.requestAnswered = true;
    this.response(t.request, true, t.data);
    if (this.transaction !== t || this.fatal || this.disposed) return true;
    if (t.follower && !t.followerAnswered) {
      t.followerAnswered = true;
      this.response(t.follower, true, t.data);
    }
    if (this.transaction !== t || this.fatal || this.disposed) return true;
    if (t.request.type === 'abort' || t.follower) this.release();
    // Otherwise the existing 500 ms fence owns the eventual release.
    return true;
  }

  output(record) {
    if (this.disposed || this.fatal) return;
    const { frame, line, terminal } = record;
    const t = this.transaction?.releasing ? null : this.transaction;
    const stateResponse = frame?.type === 'response' &&
      (frame.command === 'get_state' || (typeof frame.id === 'string' && this.stateRequests.has(frame.id)));
    if (frame?.type === 'response' && this.stateRequests.delete(frame.id)) {
      this.stateRequestBytes -= Buffer.byteLength(frame.id);
    }
    if (terminal) {
      if (this.suppressTerminal) return;
      const normalized = encode({ type: 'agent_settled', aborted: t ? true : frame.aborted === true });
      if (t && Buffer.byteLength(line) > TERMINAL_BYTES) { this.fail('terminal frame overflow'); return; }
      if (t) {
        if (!t.terminal) { t.terminal = normalized; t.terminalPosition = t.states.length; }
        return;
      }
      const generation = this.generation;
      this.emit(this.abortedTerminalPending ? encode({ type: 'agent_settled', aborted: true }) : line, (error) => {
        if (!error && !this.disposed && !this.fatal && this.generation === generation) this.onTerminal();
      });
      if (this.abortedTerminalPending) { this.abortedTerminalPending = false; this.suppressTerminal = true; }
      return;
    }
    if (t && stateResponse && !definitelyBusy(frame)) {
      const bytes = Buffer.byteLength(line);
      if (t.states.length === STATE_COUNT || t.stateBytes + bytes > FRAME_BYTES) { this.fail('state fence overflow'); return; }
      t.states.push(line);
      t.stateBytes += bytes;
      return;
    }
    this.emit(line);
  }

  release() {
    const t = this.transaction;
    if (!t || t.releasing) return;
    t.releasing = true;
    t.eligible = false;
    const generation = this.generation;
    let sealed = false;
    const finish = () => {
      if (!sealed || t.outputPending || this.transaction !== t || this.fatal || this.disposed) return;
      this.clock.clearTimeout(t.timer);
      this.transaction = null;
      // Old delivery still owns failure across a new prompt, but must not stop
      // its doctor or clear its hold-open interval when old callbacks arrive.
      if (t.terminal && this.generation === generation) this.onTerminal();
    };
    t.deliveryComplete = finish;
    // Admit in original order before any new mutation can reach the child.
    // Node's FIFO owns these bounded writes, not a second replay/output queue.
    for (let i = 0; i <= t.states.length; i++) {
      if (t.terminal && i === t.terminalPosition) {
        this.emit(t.terminal);
        if (this.fatal || this.transaction !== t) return;
      }
      if (i < t.states.length) {
        this.emit(t.states[i]);
        if (this.fatal || this.transaction !== t) return;
      }
    }
    this.suppressTerminal = !!t.terminal;
    this.abortedTerminalPending = !t.terminal;
    sealed = true;
    finish();
  }

  fail(reason) {
    if (this.fatal || this.disposed) return;
    this.fatal = true;
    const t = this.transaction;
    if (t) this.clock.clearTimeout(t.timer);
    this.transaction = null;
    this.stateRequests.clear();
    this.stateRequestBytes = 0;
    // This synchronous owner handoff MUST signal the owned process before any
    // pipe closure. Output delivery is best effort, never a kill prerequisite.
    const detail = reason.startsWith('STOP_UNSUPPORTED:') ? reason : `STOP_INDETERMINATE: ${reason}`;
    this.owner(`${detail}; termination requested, restoration may be incomplete`);
    this.notice(`Stop failed: ${reason}. Restoration is unconfirmed; provider termination requested.`);
    if (t && !t.requestAnswered) this.response(t.request, false, null, detail);
    if (t?.follower && !t.followerAnswered) this.response(t.follower, false, null, detail);
  }

  dispose() {
    if (this.transaction && !this.fatal) this.fail('transport disposed during Stop');
    this.disposed = true;
    this.clock.clearTimeout(this.transaction?.timer);
    this.transaction = null;
    this.stateRequests.clear();
    this.stateRequestBytes = 0;
  }
}

module.exports = { StopController, definitelyBusy, restored, RESTORE_MS, FOLLOWER_MS, FRAME_BYTES, TERMINAL_BYTES, STATE_COUNT };
