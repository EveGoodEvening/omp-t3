# AGENTS.md — omp-t3

## Versioning

Release tags are plain semver `vX.Y.Z` (the prerelease `1.3.0-N` scheme ended with 1.3.0-6). When npm already holds the plain base (for example `1.4.0`), later shim iterations use the `<base>-<N>` prerelease form (`1.4.0-1`, `1.4.0-2`, …) so each publish is a distinct, npm-legal version. npm publishing and the Homebrew tap (`hashangit/homebrew-omp-t3`) are manual owner steps.

## Subagents

For long-running delegated tasks, use T3's `delegate_task` MCP tool (target `providerInstanceId: "pi"`) instead of the native `task` tool so child sessions are created as openable T3 threads.

Omit `target.model` to use OMP's configured subagent models (`task.agentModelOverrides` by `role`, then `modelRoles.task`); see README "Subagent model selection".

## Lessons

- Security audit (2026-11-04, HEAD `0549e5e`): all 16 files in the published `omp-t3@1.4.0-5` tarball matched the checkout, and its SHA-256 matched both Homebrew formulas. This verifies that artifact only, not future publishes or external OMP/T3 components. npm's `latest` was `1.3.0-4`; `beta` was `1.4.0-5`.
- `ContractDoctor` enables automatic GitHub issue creation by default using existing `gh` authentication. Discovery error messages enter the issue body without redaction; truncation and the label "sanitized" do not establish privacy. Security reproductions must mock `gh` and use synthetic data.
- T3 0.1.7 adds `--offline` to short-lived Pi discovery (`--mode rpc --no-session --offline`), but OMP 18.16.0 rejects that flag with exit code 2. Normal chat does not use the hint, so chat can work while provider models and skill/extension-command menus are empty. The shim must consume the Pi-only hint without disabling OMP resource discovery; this does not provide network isolation.
- Fork installation smoke (npm 12.2.1): `npm install -g .` links to the checkout, while a Git URL installs a copy under the global npm root and is classified as `npm` by self-update. npm 12 defaults `allow-git` to `none` (`EALLOWGIT`); a trusted Git source requires command-scoped `--allow-git=all`. Fork updates must use the original checkout/URL, not the updater's upstream `npm update -g omp-t3` suggestion.
- Subagent model lists are opt-in: unset/empty `OMPT3_SUBAGENT_ALLOWED_MODELS` and `OMPT3_SUBAGENT_DISALLOWED_MODELS` disable the shim model-policy prompt and guards. Nonempty inherited environment variables still enable them; AGENTS.md instructions and delegation routing are independent.
- Rebasing `dev` onto `main` (2026-11-12): `main` 1.5.0 (`fa055d7`) and `dev` (`1f6ebf7`) each added an `--offline` branch to `src/cli.js`'s arg loop. Git merged both silently, leaving the second branch unreachable. After rebasing these branches, check for semantic duplicates, not just textual conflicts. Commit messages here must not carry AI co-author attribution trailers; a PreToolUse hook blocks such commits.
- Never interpolate an executable path into `execSync`, even double-quoted: `$(...)` and backticks still run. Use `execFileSync(path, args)`. `--check` in `bin/omp-t3` was the last such call site; `test/check-shell.test.js` puts the fake `omp` under a `$(touch …)` directory to guard it. `which omp` in `src/cli.js` uses a constant string, which is safe.
- T3 `delegate_task` knows nothing about OMP's `modelRoles.task`/`task.agentModelOverrides`; an omitted `target.model` inherits the parent model. `src/delegate_models.js` fills it inside the adapted bridge from `pi.pi.settings` (`getModelRoles()` plus `mirrorState()` layers; OMP 18.20.0 does not export the `task.agentModelOverrides` setting handle). Its source is embedded via `toString()` into both the bridge and the policy hook, so it must stay self-contained. Objects returned from `vm` contexts are not `deepEqual` to host-realm literals; compare them through JSON.
- T3 v0.1.9 (`24e77473ecf41bc1f7142529c7911c1c1aae1d76`) enables five lower thinking levels for absent/partial maps on reasoning models. Emit all seven keys, with explicit nulls for every unadvertised effort; CLI arrays and RPC `thinking.efforts` are equivalent. This is catalog advertising, not permission to clamp caller/role options.
- Catalog frame limits must measure final UTF-8 JSON plus LF, including both `data.models` and top-level `models`; each individual list can fit while the duplicated response overflows. OMP protocol-1 overflow can happen before pruning; preserve that real failure without guessed IDs or CLI fallback.
- Synthetic diagnostics: `node test/check-fixture.js "$(command -v npm)"` runs `npm run check` with scratch HOME/XDG/Pi/OMP directories, a recording literal-path fake OMP and rejecting fake gh. Its controlled PATH needs both Node and `sh` for npm lifecycle scripts; no inherited secrets or installed OMP are needed. Fixture cleanup runs in `finally`.
