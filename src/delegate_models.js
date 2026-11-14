'use strict';

/**
 * Default model selection for T3 `delegate_task` calls made from OMP.
 *
 * The shim disables OMP's native `task` tool and routes subagent work through
 * T3's `delegate_task`. T3 knows nothing about OMP's `modelRoles.task` or
 * `task.agentModelOverrides`: a call without `target.model` inherits the
 * parent thread's model. This resolver restores OMP's configuration for that
 * case: when the caller leaves `target.model` unset (and targets the Pi
 * provider or no provider), the model and thinking level are filled from the
 * live OMP settings, chosen by the T3 `role`:
 *
 *   review   → overrides reviewer, code-reviewer; then @slow (reviewer frontmatter)
 *   research → overrides code-explorer, scout; then @smol:medium (scout frontmatter)
 *   design   → overrides code-architect
 *   implementation/test/general/omitted → overrides task
 *   then     → modelRoles.task
 *
 * Model specs follow OMP's grammar: `:level` suffixes (exact or unique
 * 2+ character prefix; `:auto`/`:inherit` set no level), `@role`, `pi/role`
 * and `*` aliases, and fallback lists (first entry). Where OMP would run the
 * session model (an unset role, `*`/`@default` overrides) the call is left
 * unchanged, so T3 inherits the parent model.
 *
 * An explicit `target.model` is never rewritten. `OMPT3_DELEGATE_MODEL_ROLES=0`
 * disables the fill. Settings are read on every call from the OMP settings
 * singleton (`pi.pi.settings`), so config edits and `--config` overlays apply
 * without restarting. When those settings are unreachable (stock Pi, an OMP
 * API change) the call passes through unchanged.
 *
 * Keep this factory self-contained: its source is embedded in T3's bridge
 * extension and in the policy hook, without runtime imports.
 */
function createDelegateModelDefaults(host, env) {
  // OMP thinking selectors (pi-tui thinking.ts). `inherit` and `auto` strip
  // the suffix but set no explicit level.
  const SELECTORS = ['inherit', 'off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  // T3 role → candidates in order: task.agentModelOverrides keys, then the
  // bundled agent's frontmatter model (reviewer.md: @slow, scout.md: @smol
  // with thinking-level medium), then modelRoles.task.
  const ROLE_CANDIDATES = {
    review: [{ agent: 'reviewer' }, { agent: 'code-reviewer' }, { spec: '@slow', source: 'reviewer frontmatter (@slow)' }],
    research: [{ agent: 'code-explorer' }, { agent: 'scout' }, { spec: '@smol:medium', source: 'scout frontmatter (@smol)' }],
    design: [{ agent: 'code-architect' }],
    implementation: [{ agent: 'task' }],
    test: [{ agent: 'task' }],
    general: [{ agent: 'task' }]
  };
  // Agent overrides that mean "use the session model" in OMP
  // (model-resolver.ts isSessionInheritedAgentPattern, minus @task/pi/task,
  // which OMP expands to the task role).
  const SESSION_INHERIT = ['*', 'default', '@default', 'pi/default'];
  const INHERIT = { inherit: true };
  const enabled = !(env && env.OMPT3_DELEGATE_MODEL_ROLES === '0');
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (object, key) => (isRecord(object) && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined);

  // Exact selector, else a unique prefix of at least two characters; case-sensitive.
  const thinkingSelector = value => {
    if (SELECTORS.includes(value) || value === 'auto') return value;
    if (value.length < 2) return undefined;
    const matches = SELECTORS.filter(selector => selector.startsWith(value));
    return matches.length === 1 ? matches[0] : undefined;
  };
  // OMP model-resolver.ts modelRoleAliasPrefixLength: `*` has no prefix to strip.
  const aliasPrefixLength = value => (value === '*' || value.startsWith('*:') ? 0 : value.startsWith('@') ? 1 : value.startsWith('pi/') ? 3 : -1);

  const readSettings = () => {
    let settings;
    try {
      settings = host && host.pi && host.pi.settings;
    } catch {
      return null;
    }
    if (!settings || typeof settings !== 'object') return null;
    let roles = {};
    try {
      if (typeof settings.getModelRoles === 'function') roles = { ...settings.getModelRoles() };
    } catch {
      roles = {};
    }
    // Layer precedence (low → high) mirrors OMP: global, project, --config
    // overlay, runtime override. `mirrorState` exposes all four; older
    // builds fall back to the global and project layers.
    let layers = [];
    try {
      if (typeof settings.mirrorState === 'function') {
        const state = settings.mirrorState();
        layers = [state.global, state.project, state.configOverlay, state.overrides];
      } else {
        layers = [
          typeof settings.getGlobalSettings === 'function' ? settings.getGlobalSettings() : undefined,
          typeof settings.getProjectSettings === 'function' ? settings.getProjectSettings() : undefined
        ];
      }
    } catch {
      layers = [];
    }
    const overrides = {};
    for (const layer of layers) {
      const record = own(own(layer, 'task'), 'agentModelOverrides');
      if (isRecord(record)) Object.assign(overrides, record);
    }
    return { roles, overrides };
  };

  // "provider/model:level", "@role[:level]", legacy "pi/role", "*" (the
  // default role), a comma-separated list or an array (fallback chain: the
  // first entry wins). Returns { model, thinking }, INHERIT when OMP would run
  // the session model (T3's parent inheritance is then equivalent), or null
  // when the value cannot be used.
  const parse = (spec, roles, depth) => {
    if (Array.isArray(spec)) spec = spec[0];
    if (typeof spec !== 'string') return null;
    let model = spec.split(',')[0].trim();
    if (!model) return null;
    let thinking;
    const prefix = aliasPrefixLength(model);
    const colon = model.lastIndexOf(':');
    if (colon > Math.max(prefix, 0)) {
      const selector = thinkingSelector(model.slice(colon + 1));
      if (selector !== undefined) {
        model = model.slice(0, colon);
        if (selector !== 'inherit' && selector !== 'auto') thinking = selector;
      }
    }
    if (model === '*' || prefix > 0) {
      const role = model === '*' ? 'default' : model.slice(prefix);
      if (!role || depth >= 4) return null;
      const configured = own(roles, role);
      // An unset role falls back to the default (session) model in OMP.
      if (configured === undefined || configured === null || configured === '') return INHERIT;
      const inner = parse(configured, roles, depth + 1);
      if (!inner || inner === INHERIT) return inner;
      return { model: inner.model, thinking: thinking || inner.thinking };
    }
    if (/\s|[\u0000-\u001f\u007f]/.test(model)) return null;
    return { model, thinking };
  };

  const resolve = role => {
    if (!enabled) return null;
    const settings = readSettings();
    if (!settings) return null;
    const candidates = own(ROLE_CANDIDATES, typeof role === 'string' ? role : '') || ROLE_CANDIDATES.general;
    for (const candidate of candidates) {
      let spec = candidate.spec;
      let source = candidate.source;
      if (candidate.agent) {
        spec = own(settings.overrides, candidate.agent);
        source = `task.agentModelOverrides.${candidate.agent}`;
        const first = Array.isArray(spec) ? spec[0] : typeof spec === 'string' ? spec.split(',')[0].trim() : undefined;
        if (typeof first === 'string' && SESSION_INHERIT.includes(first)) return null;
      }
      const parsed = parse(spec, settings.roles, 0);
      if (parsed === INHERIT) return null;
      if (parsed) return { ...parsed, source };
    }
    const parsed = parse(own(settings.roles, 'task'), settings.roles, 0);
    return parsed && parsed !== INHERIT ? { ...parsed, source: 'modelRoles.task' } : null;
  };

  const hasThinking = options => (Array.isArray(options)
    ? options.some(option => isRecord(option) && option.id === 'thinking')
    : isRecord(options) && Object.prototype.hasOwnProperty.call(options, 'thinking'));
  const isEmptyOptions = options => (Array.isArray(options) ? options.length === 0 : isRecord(options) && Object.keys(options).length === 0);

  /** Returns params unchanged, or a copy with the configured target filled in. */
  const apply = (name, params) => {
    if (!enabled || typeof name !== 'string' || !/^(?:mcp__t3[-_]code__)?delegate_task$/.test(name)) return params;
    if (!isRecord(params)) return params;
    const target = params.target === undefined || params.target === null ? {} : params.target;
    if (!isRecord(target)) return params;
    if (target.model !== undefined && target.model !== null && target.model !== '') return params;
    // Another provider, or another machine, has its own catalog and config.
    if (target.providerInstanceId !== undefined && target.providerInstanceId !== 'pi') return params;
    if (target.driverKind !== undefined && target.driverKind !== 'pi') return params;
    if (target.environmentId !== undefined) return params;
    const resolved = resolve(params.role);
    if (!resolved) return params;
    const next = { ...target, model: resolved.model };
    // "[] or {} clears" inherited options in T3: an explicit empty list is
    // the caller's choice, so only fill thinking when options are absent or
    // name other settings.
    if (resolved.thinking && !hasThinking(target.options) && !isEmptyOptions(target.options)) {
      if (target.options === undefined || target.options === null) next.options = { thinking: resolved.thinking };
      else if (Array.isArray(target.options)) next.options = [...target.options, { id: 'thinking', value: resolved.thinking }];
      else if (isRecord(target.options)) next.options = { ...target.options, thinking: resolved.thinking };
    }
    return { ...params, target: next };
  };

  return { enabled, resolve, apply };
}

function delegateModelsRuntimeSource(hostExpression = 'pi') {
  return `const ompt3DelegateModels = (${createDelegateModelDefaults.toString()})(${hostExpression}, process.env);`;
}

module.exports = { createDelegateModelDefaults, delegateModelsRuntimeSource };
