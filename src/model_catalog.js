'use strict';

const { execFileSync } = require('node:child_process');

const MAX_FRAME_BYTES = 1048576;
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

class ModelCatalogManager {
  // No catalog state: live responses belong to the existing OMP session.
  pruneModels(rawInput) {
    const list = Array.isArray(rawInput) ? rawInput : rawInput?.models;
    if (!Array.isArray(list)) throw new Error('Model catalog must contain a models array');

    return list.map((item, index) => {
      const invalid = () => new Error(`Invalid model catalog member at index ${index}`);
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw invalid();
      for (const key of ['id', 'selector', 'provider', 'name']) {
        if (item[key] !== undefined && typeof item[key] !== 'string') {
          throw invalid();
        }
      }
      const provider = item.provider || 'omp';
      let id = item.id || item.selector || '';
      if (!provider.trim() || !id.trim()) throw invalid();
      const prefix = `${provider}/`;
      while (id.startsWith(prefix) && id.length > prefix.length) id = id.slice(prefix.length);
      if (!id.trim()) throw invalid();
      const entry = { id, name: item.name || id, provider };
      for (const key of ['contextWindow', 'maxTokens']) {
        if (typeof item[key] === 'number') entry[key] = item[key];
      }
      if (item.reasoning !== undefined) entry.reasoning = Boolean(item.reasoning);
      const levels = Array.isArray(item.thinking)
        ? item.thinking
        : Array.isArray(item.thinking?.efforts) ? item.thinking.efforts : [];
      entry.thinkingLevelMap = Object.fromEntries(
        THINKING_LEVELS.map((level) => [level, levels.includes(level) ? level : null])
      );
      return entry;
    });
  }

  // Standalone diagnostics inherit process cwd/env, not the live child's agentdir.
  discoverModels(ompPath) {
    const output = execFileSync(ompPath, ['models', '--json'], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 8000,
      killSignal: 'SIGKILL',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const models = this.pruneModels(JSON.parse(output));
    if (models.length === 0) throw new Error('omp models --json returned no models');
    return models;
  }

  errorResponse(response, message) {
    const error = { type: 'response', command: 'get_available_models', success: false, error: message };
    if (Object.hasOwn(response, 'id')) error.id = response.id;
    for (const detail of [message, 'Catalog error', '']) {
      error.error = detail;
      const line = JSON.stringify(error) + '\n';
      if (Buffer.byteLength(line, 'utf8') <= MAX_FRAME_BYTES) return line;
    }
    // success:false itself is a failure; optional detail must not cost correlation.
    delete error.error;
    const minimal = JSON.stringify(error) + '\n';
    if (Buffer.byteLength(minimal, 'utf8') <= MAX_FRAME_BYTES) return minimal;
    return null; // Even the minimal correlated failure cannot be represented.
  }

  // Throws on oversize so diagnostics cannot mistake an error frame for success.
  serializeModels(response, models) {
    const payload = { type: 'response', command: 'get_available_models', success: true };
    if (Object.hasOwn(response, 'id')) payload.id = response.id;
    payload.data = { models };
    payload.models = models;
    const line = JSON.stringify(payload) + '\n';
    if (Buffer.byteLength(line, 'utf8') > MAX_FRAME_BYTES) {
      throw new Error('Model catalog response exceeds 1048576 UTF-8 bytes');
    }
    return line;
  }

  handleDownstreamFrame(line) {
    if (!line.includes('get_available_models')) return { handled: false };
    let frame;
    try { frame = JSON.parse(line); } catch { return { handled: false }; }
    if (!frame || frame.type !== 'response' || frame.command !== 'get_available_models') {
      return { handled: false };
    }
    // Preserve real failures (including protocol-1 overflow without an ID).
    if (frame.success === false) return { handled: false };
    try {
      if (frame.success !== true || !Array.isArray(frame.data?.models)) {
        throw new Error('OMP catalog response requires success:true and data.models array');
      }
      return { handled: true, line: this.serializeModels(frame, this.pruneModels(frame.data.models)) };
    } catch (err) {
      const errorLine = this.errorResponse(frame, err.message);
      return errorLine === null
        ? { handled: true, fatal: 'Model catalog correlated error exceeds 1048576 UTF-8 bytes' }
        : { handled: true, line: errorLine };
    }
  }
}

module.exports = {
  ModelCatalogManager
};
