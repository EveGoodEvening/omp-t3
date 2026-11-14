# Independent catalog PLAN-REVIEW — round 2

## Verdict: PASS

P2 / AC1, AC2 and the catalog portions of AC5/AC6 are bounded and feasible under D05, the task's explicit choices, and the exact consumer contract below. C1–C4 have no remaining Fix/Replan finding. This passes the **plan**, not an implementation, runtime gate, or AC6 implementation review. Queue/routing are not reviewed or authorized here.

Static inspection only. No tests, diagnostic, installed OMP, real `gh`, T3 runtime, browser, subagent or commit was run. Only this new review file was written; ledger, plan, implementation, tests, README and AGENTS were not changed.

## Sources and authority

- [Ledger](selective-upstream-integration-ledger.md): D05, P2 and AC1/2/5/6 supersede older candidate context/unknown-capability language in the [proposal](selective-upstream-integration-plan.md). In particular, its optional internal context projection is **not** work to implement. [First review](selective-upstream-catalog-plan-review.md): C1–C4 and migration/isolation matrix.
- Local `src/model_catalog.js:18–271`, `src/proxy.js:21–34,90–242,270–304`, `bin/omp-t3:96–169`, `src/cli.js:61–171,241–270`, `src/symlink.js:13–55`, `src/extension_compat.js:71–79`, and `src/doctor.js:48–53,150–162,205–240` establish current callers, context and side effects. `test/model_catalog.test.js`, `test/e2e.test.js:8–70`, `test/check-shell.test.js`, and `package.json:16–19` establish migration and gate surfaces.
- Actual public T3 **v0.1.9**, resolved by its [release tree](https://api.github.com/repos/pingdotgg/t3code/git/trees/v0.1.9?recursive=1) to commit `24e77473ecf41bc1f7142529c7911c1c1aae1d76`; inspected source pinned to that commit:
  - [`modelCapabilities.ts`](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/modelCapabilities.ts): `supportedPiThinkingLevelsFromModel`, `thinkingLevelMapFromModel`, `thinkingDescriptor`, `piModelCapabilities`, `clampPiThinkingLevel`.
  - [`status.ts`](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/status.ts): `discoverPiViaRpc` and `parseDiscoveredModels` pass each returned model directly into `piModelCapabilities`; no map-erasing intermediate projection.
  - [`shared/model.ts`](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/shared/src/model.ts): `createModelCapabilities` copies descriptors; `getProviderOptionDescriptors` maps existing descriptors, not an implicit Pi ladder.
  - [`adapter.ts`](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/adapter.ts): `applySelection` (source lines 2595–2653) applies explicit recognized thinking options separately from catalog capability discovery.
  - [`rpc.ts`](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/rpc.ts): request results use `data`; T3 itself generates string request IDs. The shim's numeric-ID preservation remains its wider protocol contract.

This is release-source evidence, not a claim that every byte of the installed executable matches it or that a live UI was exercised. Prior installed-OMP framing evidence remains attributed to the first review, not rerun here.

## C4 settled: all seven explicit nulls prevent the fallback

T3 v0.1.9 consumes the map as follows:

1. `reasoning !== true` returns no thinking levels, regardless of the map.
2. A map is recognized only as a non-null, non-array object.
3. A key whose value is exactly `null` is disabled.
4. `xhigh` and `max` require a non-undefined mapping. The five lower levels are enabled by default when their mapping is undefined.
5. Zero supported levels causes `thinkingDescriptor` to return undefined. With no other descriptors, `piModelCapabilities` returns empty capabilities. Shared descriptor construction/display does not recreate a thinking descriptor.

Consequently an absent map, `{}`, or a partial map is **not** a safe representation of unknown effort support on a reasoning model: it advertises `off/minimal/low/medium/high`. An explicit seven-key all-null map suppresses all seven. No model-name exceptions, boolean ladder, reasoning falsification, or consumer changes are needed.

**Approved exact projection:**

```text
keys = off, minimal, low, medium, high, xhigh, max
levels = item.thinking, if it is an array;
         otherwise item.thinking.efforts, if that is an array;
         otherwise no advertised effort list.
For every key: map[key] = key if levels contains that exact string, else null.
Always emit that complete map, including when no effort list is advertised.
```

Thus missing/null/boolean thinking, budget-only objects, empty lists, and lists containing only unknown efforts produce all-null maps. Mixed lists retain only exact recognized strings; duplicates do not expand support. No aliases or numeric-budget conversion. Retain the existing independent `reasoning` projection; do not infer it from the effort list or turn it off to suppress T3 defaults. Identical CLI arrays and RPC efforts arrays produce identical maps.

The guarantee is **advertised selectable catalog options**, not enforcement of all future requests. T3 `applySelection` can send an explicit recognized thinking option independently of this map; OMP remains responsible for accepting it. Persisted/caller-supplied options and `delegate_models` role defaults must not be rewritten or clamped by the shim. T3's own default selection clamping among advertised options is consumer behavior, not permission for a role-thinking rewrite. Unknown capabilities may hide real but unadvertised options; that is the conservative tradeoff required by AC2.

## C1–C3 settled contracts

### C1 — Standalone process context, no new syntax

`bin/omp-t3 --check` discovers through the **same resolved executable** it version-checks, with literal argv `models --json`, inherited process cwd and environment. Preserve inherited profile/config/agent environment; do not copy the proxy's forced `PI_CODING_AGENT_DIR` into diagnostics. No new `--check --config/--profile/--cwd` contract, no parser expansion and no `modelDiscoveryContext` scaffold. Existing helper recognition quirks are not newly supported context syntax.

Standalone discovery is separate from live response projection. It may spawn the controlled CLI once per explicit discovery, but response serialization must never spawn it implicitly. A later failure on the same manager cannot use a previous success. A process-context check is not proof of equality with a running session's registry or of provider/network/plugin isolation.

### C2 — Output bound and upstream failure boundary

For each shim-generated success frame, serialize the **final** response with its real request ID and both `data.models` and top-level `models`, append LF, and enforce `Buffer.byteLength(frame, 'utf8') <= 1_048_576`. Include JSON escaping, envelope overhead and multibyte text, not JS string length or one unduplicated list. At equality it fits. Over the bound, emit one small explicit `success:false` catalog response preserving the available ID value/type, without any model lists, stale marker, or copied giant raw data/error. Do not truncate the catalog. Standalone must surface that failure as nonzero, not print a safe-size PASS because it successfully serialized an error frame. Its diagnostic success frame uses the same bounded serialization path.

An OMP protocol-1 overflow can occur **before** the shim receives a prunable success. Forward such an existing failure unchanged apart from LF transport, even when OMP omitted the ID. No guessed correlation, CLI fallback, retry, protocol-2 negotiation or chunk reassembly. The 1 MiB rule here is the accepted P2 output ceiling; it need not be presented as T3 v0.1.9's actual framer maximum (its source uses a different character-based defensive bound). Do not claim arbitrary raw catalogs can reach pruning or that protocol 2 is supported by this port.

### C3 — Whole-catalog validation and empty distinction

Live handling requires an actual response for `get_available_models`, `success:true`, and array `data.models`; malformed/missing/non-array catalog data becomes one explicit correlated failure. Existing `success:false` passes through unchanged. Validate every member before publishing success: nulls, primitive members and incompatible projection identity/provider values fail the entire catalog, not an exception or silently skipped subset. Model IDs are not request IDs: do not stringify numeric model identifiers.

Preserve existing valid string ID/selector fallback, optional/default provider behavior, name fallback, repeated provider-prefix normalization, meaningful non-provider slashes, and numeric context/token fields. An entry must resolve to a usable nonblank string model identity; an optional provider may default to `omp`, but supplied incompatible non-string identities/providers are not usable strings. Ensure published names are strings through the existing fallback or an explicit malformed-member error. Do not impose model allowlists, require explicit providers for otherwise valid selectors, or validate unrelated stripped schemas/pricing. Unknown thinking effort names follow C4 rather than becoming catalog errors.

`data.models: []` succeeds live with both empty lists; it is an explicit standalone discovery failure. T3's status parser rejects blank identities and computes authentication separately from list parsing; live-empty success is not a promise that T3 marks the provider authenticated.

## Bounded implementation and complete caller migration

No new registry/context cache, request tracker, routing layer or queue work is necessary. Forward client catalog requests unchanged exactly once; project matching child responses before generic downstream passthrough. Preserve unrelated streaming/command/skill/approval/usage/settlement paths. A prompt mentioning the command name must not trigger catalog logic.

- `src/model_catalog.js`: pure validation/projection, exact effort map and bounded response serialization; shell-free standalone discovery. Remove cache path/TTL/timestamps/stale state, persisted read/write, builtins, stale warning and prewarm. Do not keep obsolete methods or aliases for tests.
- `src/proxy.js`: remove upstream synthetic catalog interception and startup prewarm; use downstream session response handling. Migrate both default/injected manager construction paths and `spawnAndProxy`'s construction/caller. Retain the existing live-child environment policy. Remove catalog-only dead parameters if no remaining consumer uses them; keep actual doctor/child uses of `ompPath`.
- `bin/omp-t3`: migrate manager construction/discovery/serialization together; avoid today's second implicit discovery path. Check empty/failure/oversize before printing PASS; preserve resolved binary and shell-safe version call.
- Tests: replace old interception, persistence/fallback and cache-state assertions in `test/model_catalog.test.js`; replace `test/e2e.test.js:23–42`'s immediate-response assumptions while retaining its full-turn assertions. Migrate literal-path tests to behavioral results, not renamed stale state. `test/check-shell.test.js` needs a nonempty success fixture and separately asserted failure exit status.
- During implementation, enumerate remaining old API references across callers/tests, then remove obsolete references rather than leave compatibility shims. The local source inspection found production manager users in `src/proxy.js` and `bin/omp-t3`; catalog unit tests and the default-manager e2e lifecycle are known test migration points.
- Later implementation updates README introduction/architecture, standalone/fallback/size/thinking claims and Unreleased notes, plus repository lessons as appropriate. Explain legacy cache files are ignored, not deleted. No documentation or lesson edits in this review round.

Preserve local `delegate_models`, opt-in allowed/disallowed policy, role/model/thinking inheritance and caller clears, `--offline` resource discovery, literal executable safety, startup extension adaptation, command/skill menus, delegation opt-out/explicit tools/native caps, version/package/release metadata, owner/fork/updater/install contracts and doctor issue destination/default policy. No broad upstream test deletions.

## Exact implementation testing contract — not executed in this review

### Stream and projection regressions

Use existing isolated in-memory pipeline fixtures; inject a no-issue doctor or use its existing `issuesEnabled:false`. All catalog errors contain synthetic data.

1. Assert the exact catalog request reaches the child once and client receives nothing before the reply. Feed a schema-heavy child success; assert exact retained model identities/fields/maps and stripped schemas/pricing/URLs in both output lists. Change the next catalog and use a second pipeline/context: neither can serve the prior list. No standalone executable is invoked on this path.
2. Interleave out-of-order replies with IDs `0`, `7`, `"7"`, `""` and unrelated replies. Preserve each type/value; preserve absent/null IDs deliberately rather than fabricate them. Verify prompt text mentioning `get_available_models` and unrelated streaming frames pass normally.
3. After an earlier success and with a seeded legacy `models.json`, forward explicit child failures, including a protocol-1 overflow-shaped failure without ID, unchanged. No fallback, invented IDs, stale flag, extra discovery or cache write. Do not fake a protocol-2 success.
4. Exercise missing/null/object `data.models`, `[null]`, primitive members, incompatible model IDs/providers and malformed names. Each yields one correlated failure without partial lists; a subsequent unrelated delta still passes. Cover valid selectors/default providers and prefix normalization to guard against accidental tightening. Live empty succeeds; standalone empty fails.
5. Use the final frame's UTF-8 byte count to construct success cases immediately below and at the ceiling, and a projection above it. Because list duplication can change sizes in two-byte increments, adjust request-ID/envelope padding where needed to exercise exact equality. Include multibyte names and escaped characters, plus a case where each individual list fits but the duplicated frame does not. Assert emitted bytes, complete model content on success, and bounded correlated failure on oversize; never assert only an arbitrary small payload or count. Feed raw schema-heavy responses through the pipeline, not only the serializer helper. OMP's pre-prune overflow is a separate failure fixture, not simulated proof that oversized raw successes traverse real OMP.
6. For reasoning models, exercise CLI arrays and equivalent RPC efforts for sparse known levels including `xhigh/max`, absent `off`, duplicates, mixed unknown entries, empty and unknown-only arrays, missing/null/true/false thinking, and budget-only objects. Assert every seven-key map exactly and preserved independent reasoning. Add consumer-shaped behavioral proof using the pinned T3 filtering rules: all-null yields no choices/descriptor, sparse maps yield only advertised levels; an absent-map control shows the five-level default. This may be a throwaway source-derived harness, not a new dependency on T3 or a source-text test. No live T3 UI claim follows from it.

### Actual diagnostic entrypoint, entirely synthetic

Execute the real `bin/omp-t3 --check` via Node in a scratch cwd with a **controlled environment**, not `{...process.env, HOME: scratch}` alone:

- Scratch HOME; XDG config/cache/state/data/runtime directories; Pi/OMP agent/config directories; synthetic inherited `OMP_PROFILE`/`PI_PROFILE` values as applicable. Both `~/.omp/agent` and `~/.pi/agent` and the session symlink target remain scratch. Seed an obsolete cache only inside scratch and assert its bytes remain unchanged on success/failure.
- Use a recording fake OMP at an explicit existing `OMP_PATH`, with a trusted Node shebang. It answers only `--version` and `models --json`; any RPC/tool probe is a fixture failure. Record argv, cwd and selected synthetic environment fields, not wholesale real secrets. Assert process context and literal paths containing spaces, quotes, `$()` and backticks; marker files must not appear. Test successful nonempty discovery and exact normal exit, not just the version PASS line.
- Supply a fake `gh` in a controlled PATH and strip authentication/token exposure. It records/rejects issue creation locally and never forwards. No installed OMP or real `gh` may run. For resolver-missing cases, control/mock the existing well-known-location fallback too: a nonexistent `OMP_PATH` plus empty PATH alone can still find installed OMP. Use an existing controlled unspawnable executable for the subprocess spawn-failure case; isolate resolver-only missing tests separately.
- Separate scenarios: nonzero fake exit, invalid JSON, malformed catalog, empty list, oversized projection, unspawnable executable, and success followed by failure on the same discovery object. Assert nonzero diagnostic exit and absence of catalog PASS/guessed models where relevant. Successful `--version` must not mask discovery failure. Include output-limit failure without mistaking a small serialized error for a safe success.
- Clean scratch artifacts after evidence collection. This proves shim diagnostic behavior only, not installed-provider availability, network isolation of real OMP or live T3 presentation.

### Gates and review boundary

First run the focused changed-path command:

```sh
node --test test/model_catalog.test.js test/e2e.test.js test/check-shell.test.js
```

Then preserve compatibility coverage with the existing CLI, command/menu, launcher, policy, delegate-model, extension and version tests:

```sh
node --test test/cli.test.js test/cli_version.test.js test/commands.test.js test/launcher.test.js test/delegate-enforcement.test.js test/subagent_policy.test.js test/delegate_models.test.js test/extension_compat.test.js test/extension_compat_ledger.test.js
```

Record exact commands, exit statuses and synthetic evidence. Package gates are `npm test` and `npm run check`; the latter must inherit the scratch/fake environment above, never the user's HOME. No build/typecheck/lint scripts exist in this package. AC6 still requires independent implementation review and final-union gates after subsequent slices; this plan PASS does not discharge them. No browser/heavy runtime is needed for these synthetic catalog/CLI proofs; any later heavy launch must obey the shared gate policy.
