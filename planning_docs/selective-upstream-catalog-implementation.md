# W05 — session catalogs and advertised thinking

Implemented the D08-approved P2 contract only. No commits, ledger edits, queue/routing changes, delegate-model changes, release/version/URL/updater/issue-owner changes, external settings changes, installed OMP, real gh, paid models, browser or subagents.

## Implementation

- `src/model_catalog.js`: stateless whole-catalog validation/projection; complete seven-key thinking maps from CLI arrays or RPC `thinking.efforts`; bounded final success serialization. Standalone `discoverModels(ompPath)` executes literal `models --json` with process cwd/env and fails on empty/invalid/error output. Serialization never discovers models.
- `src/proxy.js`: removes upstream catalog interception and startup prewarm; downstream successful session replies are projected, malformed/oversized replies become correlated errors, existing failures pass through unchanged. No request tracker, cache, fallback or guessed IDs. Both default/injected manager paths remain supported; child agentdir policy and unrelated frames remain unchanged.
- `bin/omp-t3`: one explicit discovery using the executable already resolved for the shell-safe version query; the same bounded serializer must succeed before catalog PASS. Diagnostic failures exit nonzero.
- Removed persisted/in-memory cache, TTL, stale markers, builtins, prewarm and former response/interception APIs. Enumerated production/test callers and migrated them without shims; obsolete-API search returned no matches.
- README architecture/catalog/diagnostic/Unreleased and repository Lessons updated after synthetic smoke.

Selective source inspection: upstream objects were not present locally (`git show` exited 128, bad object); read pinned raw sources from [c32d3ed](https://github.com/lychen2/omp-t3/blob/c32d3ed1111d0d8005a0706308c4fdc1860388c9/src/model_catalog.js) and [0088817](https://github.com/lychen2/omp-t3/blob/0088817867e4c5dd6b2cf6d6ab59c746f7beb727/src/model_catalog.js). No cherry-pick or upstream context-parser/boolean-ladder import. LSP references were attempted before exported API changes; no language server was available, so callers were enumerated with text search.

## Executed verification

1. `node --test test/model_catalog.test.js test/e2e.test.js test/check-shell.test.js`
   - Exit **0**: `tests 21`, `pass 21`, `fail 0`, `skipped 0`.
   - Covers exact once-only forwarding and no premature response; changed/session-separated catalogs; IDs `0`, `7`, `"7"`, `""`, null and absent; pruning and identity/provider/selector normalization; CLI/RPC thinking equivalence; malformed catalogs followed by streaming; empty live lists; unchanged real/protocol-1 failures; actual controlled diagnostic success/failures.
   - Final-frame UTF-8 cases are exactly **1,048,575**, **1,048,576**, and **1,048,577** bytes before oversize rejection. Include multibyte names, quotes/backslash/newline escaping, raw verbose schema input, and duplicated lists where either list alone fits. Fits retain complete catalogs; oversize produces a bounded correlated error without lists.
2. After strengthening seeded-cache isolation and unrelated-reply interleaving (no production changes), executed the changed scenarios:
   - `node --test test/check-shell.test.js`: exit **0**, `tests 2`, `pass 2`, `fail 0`.
   - `node --test --test-name-pattern='live empty succeeds' test/model_catalog.test.js`: exit **0**, `tests 1`, `pass 1`, `fail 0`.
   - `node --test --test-name-pattern='catalog requests forward exactly once' test/model_catalog.test.js`: exit **0**, `tests 1`, `pass 1`, `fail 0`.
   - The controlled child process uses the seeded legacy cache's actual XDG location: standalone success then nonzero failure on one manager, followed by live success and ID-less protocol-1 failure. Exactly two CLI discoveries total; cache bytes unchanged. Interleaved unrelated replies and streaming retain their original lines.
3. `node --test test/cli.test.js test/cli_version.test.js test/commands.test.js test/launcher.test.js test/delegate-enforcement.test.js test/subagent_policy.test.js test/delegate_models.test.js test/extension_compat.test.js test/extension_compat_ledger.test.js`
   - Exit **0**: `tests 89`, `pass 89`, `fail 0`, `skipped 0`. Existing invalid-cap warnings were printed. Skill/command menus, `--offline`, launcher, policy and role/caller thinking coverage passed.
4. `node test/check-fixture.js "$(command -v npm)"`
   - First attempt exited **254**: controlled PATH lacked `sh` (`spawn sh ENOENT`), with zero OMP invocations. Added a trusted `/bin/sh` link to the fixture PATH.
   - Corrected attempt exited **0** through actual `npm run check` / `./bin/omp-t3 --check`:
     ```text
     [PASS] Model catalog discovery succeeded: 1 models discovered.
            Bounded payload size: 0.5 KB (maximum 1024 KB including newline).
     [PASS] Usage Dashboard session bridge verified.
     All checks passed! omp-t3 is ready for T3 Code.
     ```
   - Recording fake saw exactly `['--version']`, then `['models','--json']`, in repository cwd, with scratch HOME/XDG/Pi/OMP dirs and synthetic profiles. Literal executable path includes spaces, quotes, `$()` and backticks. The expected missing scratch extension-ledger WARN is informational; no installed OMP ran.
   - Diagnostic test scenarios assert full success exit **0**; fake nonzero exit 23, invalid JSON, malformed models, empty models, oversized projection and existing unspawnable executable each yield diagnostic exit **1**, no catalog PASS and no guessed list. Version success cannot mask discovery failure. Fake gh is never invoked; marker absent; legacy cache unchanged; session link target stays within scratch HOME.
5. Executed an ephemeral `node <<'NODE'` consumer-shaped assertion script using the freshly read pinned [T3 v0.1.9 filter](https://github.com/pingdotgg/t3code/blob/24e77473ecf41bc1f7142529c7911c1c1aae1d76/packages/provider-pi/src/server/modelCapabilities.ts), against real projected entries. Exit **0**; exact output:
   ```json
   {"unknown":[],"unknownDescriptor":null,"sparse":["low","xhigh","max"],"absentMapControl":["off","minimal","low","medium","high"]}
   ```
   Source-derived filtering/descriptor boundary only, not live T3/UI proof. Script existed only in stdin; no throwaway file remains.

## Reproducible parent diagnostic gate

From this checkout, on Linux/macOS with Node/npm installed:

```sh
node test/check-fixture.js "$(command -v npm)"
```

This persistent helper creates fresh scratch directories on every invocation, constructs its environment from an empty object (not an inherited-secret environment), supplies trusted Node/sh plus fake gh in PATH, and sets an explicit recording fake OMP path. It invokes the supplied absolute npm executable with `run check`; npm's lifecycle runs the actual diagnostic. It prints stdout/stderr and the synthetic argv/cwd/selected-env recording, propagates npm's exit status, and removes scratch state in `finally`. No dependency on any deleted scratch directory or reconstruction of production code. For detailed diagnostic failure scenarios rerun `node --test test/check-shell.test.js`.

`npm test` and final-union/review gates remain the orchestrator's responsibility, as requested. No build/typecheck/lint script exists. This proves synthetic shim behavior, not installed-provider availability, arbitrary raw OMP catalog transport, network isolation of real OMP, protocol-2 support, or live T3 presentation.
