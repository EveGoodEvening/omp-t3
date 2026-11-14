<img src="assets/icon.svg" width="64" height="64" alt="omp-t3 icon">

# omp-t3

Run Oh My Pi inside T3 Code.

T3 Code includes a provider for upstream Pi. Pointing that provider directly at `omp` breaks three things:

1. Turn settlement. `omp` sends `session_settled` when code generation ends, but T3 Code waits for `agent_settled`. Turns stay stuck in an active state.
2. Tool approvals. T3 Code spawns agents with `--mode rpc`. That flag mutes interactive confirmation dialogs in `omp`, so bash and file approval prompts never appear.
3. Model discovery. OMP catalogs carry verbose schemas and pricing that T3 does not need; large responses can exceed framing limits.

`omp-t3` sits between T3 Code and `omp` over stdio. It translates settlement and compaction frames, renders omp's `task` subagents as live tool cards with a compact status line, synthesizes the manual-compaction events T3's UI expects, enables `--mode rpc-ui`, prunes the running session's model catalog, watches for contract drift, and forwards normal streaming traffic untouched.

---

## Installation

Requires Node.js **18 or newer**, npm, and a separately installed [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp` available on `PATH`). If installing OMP through npm, its package is `@oh-my-pi/pi-coding-agent`, not `omp`. Git is also required for cloning or Git URL installs. Installing this shim does not install OMP or T3 Code.

For this fork, use a local checkout or its Git URL below. The npm registry package and Homebrew tap in the later sections are upstream distribution channels; they do **not** install this fork's unpublished changes. The executable and npm package name remain `omp-t3`, so use one global installation method at a time.

### From a local path (fork checkout)

Clone your fork, then install its checkout globally:

```bash
git clone https://github.com/EveGoodEvening/omp-t3.git
cd omp-t3
npm install -g .
```

For an existing checkout, install using its absolute path instead:

```bash
npm install -g /absolute/path/to/omp-t3
```

With npm's default local-folder behavior, this links the global package to the checkout: source edits take effect on the next launch. Keep the checkout at that path; moving or deleting it breaks the installation. No build step is required.

You can also skip global installation and set T3's **Binary Path** directly to `/absolute/path/to/omp-t3/bin/omp-t3`. Keep **Arguments** blank. This also runs the checkout's current source and requires keeping that checkout in place.

### From a Git URL (no persistent checkout)

```bash
npm install -g 'git+https://github.com/EveGoodEvening/omp-t3.git'
```

[npm 12 disables Git installs by default](https://docs.npmjs.com/cli/v12/using-npm/config#allow-git). If you get `EALLOWGIT`, explicitly allow Git for this command only, after confirming you trust the repository:

```bash
npm install -g --allow-git=all 'git+https://github.com/EveGoodEvening/omp-t3.git'
```

Use the same flag when installing a pinned ref or updating with npm 12. This does not change your global npm configuration; `all` allows Git dependencies for that invocation, so only use it for trusted sources.

This installs a packaged copy from the fork's default branch, independent of any local checkout. To select a branch, tag, or full commit SHA, append `#<ref>` to the URL; replace `<ref>` before running:

```bash
npm install -g 'git+https://github.com/EveGoodEvening/omp-t3.git#<ref>'
```

Prefer a full commit SHA for reproducible deployments. Private repositories require Git credentials on the installation host; do not embed access tokens in the URL or shell history.

After either global installation, check the executable and follow [Setup in T3 Code](#setup-in-t3-code):

```bash
command -v omp-t3
omp-t3 --version
omp-t3 --check
```

If `omp-t3` is not found, add `$(npm prefix -g)/bin` to `PATH` on Linux/macOS, or use that directory's absolute `omp-t3` path in T3. A desktop-launched T3 may not inherit your shell's `PATH`.

### Updating or removing a fork installation

For a linked local checkout (including a direct **Binary Path**), update the checkout on your chosen branch:

```bash
git -C /absolute/path/to/omp-t3 pull --ff-only
```

The current package has no dependencies or build step, so a linked checkout needs no reinstall after pulling. For a Git URL installation, rerun `npm install -g` with the **same fork URL**, optionally changing the pinned ref to the new commit. Restart the Pi provider/session after updating to load the new code, then refresh models and commands in T3.

**Do not use `omp-t3 update --yes` or `npm update -g omp-t3` to maintain a fork.** The current self-update logic detects the installation location, not its Git origin. A Git URL install can be classified as `npm` and offered the upstream registry update command. `omp-t3 update` and T3's routine `update --self` are guidance-only and do not change the installation; their suggested command may still be inappropriate for a fork.

Remove a global installation (local path or Git URL) with:

```bash
npm uninstall -g omp-t3
```

This removes the global package entry and command, not your local checkout. If T3 points directly to `bin/omp-t3`, change or clear its **Binary Path** before moving or deleting that checkout. Uninstalling the shim does not remove OMP, sessions, or shim caches.

### With npm

Install the upstream registry package globally using npm:

```bash
npm install -g omp-t3
```

### With Homebrew

Install the upstream release from the tap:

```bash
brew tap hashangit/omp-t3
brew install omp-t3
```

You can also install directly from GitHub without tapping first:

```bash
brew install hashangit/omp-t3/omp-t3
```

### Run without installing

You can test the upstream registry package directly through npx (this does not run your fork):

```bash
npx omp-t3 --check
```

---

## Setup in T3 Code

1. Open **Settings** -> **Providers** -> **Pi**.
2. Set **Binary Path** to the absolute path printed by `command -v omp-t3` for a global install, or `/absolute/path/to/omp-t3/bin/omp-t3` for a direct checkout. This avoids relying on the desktop app's `PATH`; make sure it is not pointing to an older installation.
3. Leave **Arguments** blank. `omp-t3` defaults to `--mode rpc-ui` automatically.
4. Click **Refresh** to populate your configured models.
5. Select your model and send a message.

---

## Verify your environment

Run the built-in diagnostic check:

```bash
omp-t3 --check
```

The check verifies that:
- The resolved `omp` binary responds to `--version` and literal argv `models --json`.
- Standalone discovery returns a nonempty valid catalog whose final duplicated JSONL response fits within 1,048,576 UTF-8 bytes, including newline. Empty lists, discovery/JSON/validation failures, and oversized output fail the check with nonzero exit.
- The session directory link between `~/.pi/agent/sessions` and `~/.omp/agent/sessions` is active, allowing T3 Code's usage view to read historical token metrics.

`--check` uses its process cwd and inherited environment (including profile/config/agent-directory settings), not a running session's registry. It adds no overlay/profile flags and performs one explicit discovery, with no cache or implicit second spawn. The session link check creates directories/symlinks under HOME; use an isolated HOME for synthetic diagnostics. This is not provider/network isolation or proof that a separately launched session has the same models.

---

## How it works

```text
+---------------------------------------------+
|                   T3 Code                   |
|  (packages/provider-pi/src/server/adapter)  |
+---------------------------------------------+
                      ^
                      | stdio (JSONL lines)
                      v
+---------------------------------------------+
|                   omp-t3                    |
|  - Rewrites --mode rpc to --mode rpc-ui     |
|  - Translates session_settled to            |
|    agent_settled (+ pendingMessageCount)    |
|  - Forwards get_available_models to OMP,    |
|    prunes that session's catalog reply      |
|  - Answers get_commands discovery probes    |
|  - Strips duplicate provider slugs          |
|  - Maps auto-compaction + synthesizes       |
|    manual /compact event cards              |
|  - Bridges subagent frames into live cards  |
|  - Watches for contract drift (watchdog)    |
|  - Passes diffs, tokens, and bash logs      |
|    through as raw bytes                     |
+---------------------------------------------+
                      ^
                      | stdio (JSONL lines)
                      v
+---------------------------------------------+
|                     omp                     |
|               (local binary)                |
+---------------------------------------------+
```

### Protocol translation

- **CLI rewrite:** Converts incoming `--mode rpc` to `--mode rpc-ui` so `omp` emits permission requests instead of suppressing them.
- **Version reporting:** T3's provider probe runs `--version` and requires a semver >= 0.80.5. The shim versions itself as `<pi-major>.<pi-minor>.<pi-patch>-<iteration>` (e.g. `1.3.0-1`): the first three segments track the upstream Pi release it targets, the prerelease counter is the shim's own publish iteration. `--version` prints the Pi base on line 1 (what T3's gate parses) and the full identity on line 2 — fully offline and instant.
- **Settlement mapping (session mirroring):** Captures `prompt_result` status, translates `session_settled` to `agent_settled`, and preserves OMP's pending-work/wake-cycle behavior. The existing `pendingMessageCount` alias combines `queuedMessageCount` with `hasPendingAsyncWork` when the alias is absent; existing pending fields are not overwritten. Stop finalization uses the atomic contract below instead of emitting a terminal before withdrawal is acknowledged.
- **Compaction mapping:** Renames omp's `auto_compaction_start`/`auto_compaction_end` frames (auto-compaction mid-run) to the Pi names `compaction_start`/`compaction_end`. omp's method-cascade attempts that end `skipped:true` (no result) are dropped entirely — T3 would otherwise render each as "Context compaction failed". For **manual** `/compact`, omp emits no compaction events at all (its RPC handler answers once when done), so the shim synthesizes the `compaction_start`/`compaction_end` event pair around omp's single response — giving T3 Code a live compaction card instead of silence, and keeping omp's benign "Nothing to compact (session too small)" from failing the whole turn.
- **Session-authoritative catalog:** Forwards `get_available_models` once to the existing child, then validates the entire successful `data.models` array and projects clean entries into both `data.models` and top-level `models`. Keeps identity/provider/name, numeric context/token fields, independent reasoning, and normalized provider prefixes; strips schemas, pricing and base URLs. Request IDs retain their original type and presence, including `0`, empty strings, null and absent IDs. Live empty lists succeed; malformed catalogs produce explicit correlated errors when representable without interrupting later streaming.
- **No catalog substitutes:** No CLI prewarm, persisted catalog reads/writes, stale results or built-in fallback lists. Legacy `models.json` cache files are ignored, not deleted. Child failures pass unchanged, including protocol-1 overflow errors without IDs. OMP can reject a raw response before pruning; this shim does not negotiate protocol 2 or reassemble chunks. All shim-generated catalog frames must fit within 1,048,576 UTF-8 bytes including escaping, ID, envelope, both success lists and LF. Overflow yields a correlated failure with shorter or omitted error detail as needed, never truncated IDs/models. If even a minimal correlated failure cannot fit, the existing owned-transport failure path kills the direct main child and finishes nonzero after its 250 ms observation, rather than emitting an oversized or uncorrelated response.
- **Advertised thinking options:** Every model gets a complete seven-key `thinkingLevelMap` (`off/minimal/low/medium/high/xhigh/max`). Exact strings in CLI `thinking` arrays or live RPC `thinking.efforts` self-map; every other key is null. Missing, boolean, budget-only or unknown-only capabilities advertise no effort choices, preventing T3 v0.1.9's lower-level defaults. This can hide real but unadvertised options; it does not rewrite reasoning or clamp explicit caller/role thinking options.
- **Contract drift watchdog:** Every cleanly settled turn records the working `omp`/shim versions to `~/.local/state/omp-t3/contract-state.json`. If OMP breaks a settlement promise (e.g. stops emitting `session_settled` after announcing settlement), the shim keeps the turn alive, prints a stderr banner naming the changed side with rollback guidance, and files a rate-limited issue on GitHub with sanitized diagnostics.
- **Slug normalization:** Strips redundant provider prefixes from model IDs, preventing double-slug lookups like `openrouter/openrouter/...` during model selection.
- **Task-tool rendering:** omp's native `task` children render as ordinary tool cards, with provenance-based attribution and authoritative `get_subagents` reconciliation. Stop closes open cards and attempts one hard cancellation per live child before the atomic command. Late children proven to belong to pre-Stop calls remain cancellation candidates; a rejected prompt does not disarm this window. An accepted plain prompt does. Cancellation writes are not proof that arbitrary external tools or remote delegates stopped. Long-running delegated work belongs in T3's `delegate_task` children (openable threads) — see [AGENTS.md §Subagents](AGENTS.md) and [Limiting concurrent subagents](#limiting-concurrent-subagents).
- **Command & skill menu:** Serves T3's `get_commands` polls from OMP's live catalog (cached from OMP's startup push, refreshed on demand): builtins like `/context`, `/stats`, `/usage`, and `/dump` appear in T3's `/` menu as extension commands, and OMP's skills (already named `skill:*`) land in T3's `$` skill menu with `source:"skill"`. OMP's richer source enum is projected onto Pi's `extension`/`prompt`/`skill` enum. When a command runs, OMP's `command_output` frames are re-emitted as rendered text inside the command-only turn — ANSI-stripped and wrapped in a fenced code block, because T3 renders assistant text as markdown (bare newlines collapse; a fence preserves omp's line-oriented bar-chart layout in monospace) — and the turn is settled from OMP's `data.agentInvoked:false` completion signal, which would otherwise hang, since local-only commands never emit `session_settled` and T3's own idle probe is suppressed once output rendered.
- **T3 extension adaptation:** T3 injects its bundled MCP bridge as a pi extension (`--extension …/pi-t3-mcp-extension.ts` plus `T3_PI_MCP_EXTENSION_PATH`). That extension's `$name` skill inliner resolves skills through Pi's `command.sourceInfo.path`, while OMP's in-process commands expose the same file as `command.path`, so on stock OMP every prompt mentioning `$name` crashed the handler and the skill body was never inlined. The shim rewrites that one extension entry to a shim-managed copy under `~/.cache/omp-t3/` (identical source except `getCommands()` projects `command.path` into `sourceInfo.path`) and repoints `T3_PI_MCP_EXTENSION_PATH` at the copy, keeping the extension's tool-ownership identity checks working. If a T3 update changes the extension source so the known marker no longer matches, the original is passed through untouched with a stderr warning — `$name` inlining then degrades to the old crash instead of running stale adapted code. Other extensions and the `get_commands` menu projection are untouched.
- **Subagent concurrency cap (opt-in):** Setting `OMPT3_MAX_SUBAGENTS=<N>` in the shim's environment atomically writes `~/.cache/omp-t3/subagent-limits-<N>.yml` (containing omp's `task: maxConcurrency: N`) and appends `--config <that file>` to every spawned omp. omp natively enforces that setting — its task-tool semaphore queues excess spawns until a slot frees — and derives the "Max N concurrent subagents" line of its own system prompt from the same key, so the lead agent is *told* the limit, not just throttled. See [Limiting concurrent subagents](#limiting-concurrent-subagents). Without the variable (or with a non-plain-integer value, warned and ignored) launches are byte-identical to before.
- **Byte passthrough:** Unrelated streaming deltas, diffs, approvals and RPC payloads retain their JSON-line text. Top-level output inspection separates terminal records from nonterminal prefixes and applies only the bounded Stop fence.

### Atomic Stop

T3's awaited `clear_queue` → `abort`, or a lone `abort`, sends one OMP `abort_and_restore_queue`. Native-child cancellation precedes that write. Available steering/follow-up text is returned in original order, including duplicates, whitespace and empty strings, under each original request's command and ID (including absent IDs, null and zero). A lone abort also emits a text notice because older T3 ignores abort response data; it never fabricates a clear response.

Only terminal records and potentially finalizing `get_state` replies are fenced. Classification follows normal pending-count projection: failures and idle/missing/malformed data wait; literal streaming/compacting activity or any finite nonzero pending count, including negative counts, passes immediately. Streaming, tools, approvals and unrelated RPC failures are not retained. No fake busy state or Stop-specific pending sentinel is emitted.

State destinations are correlated by exact string request ID before other response adapters, even if OMP omits or mislabels the response command. Correlation permits at most 16 outstanding state IDs totaling 16 KiB UTF-8; excess requests receive an explicit limit error outside Stop and fail closed during Stop. Entries retire on response or transport disposal/failure; missing replies cannot grow this table indefinitely. Early abort followers are not notice-consumption acknowledgements: available text also uses the existing notify channel before releasing their fence.

The restore deadline is **1,000 ms from Stop acceptance**, including cancellation delay. A completed clear retains one same-generation abort follower for **500 ms from clear success**. Missing followers expire with a diagnostic and release held old output; expiry is not a consumption acknowledgement. Mutations during unresolved withdrawal are rejected before tracker/disarm/child side effects, never queued or replayed. Mutation attempts invalidate follower association; accepted mutations after restoration admit ordered old output before forwarding. Pending output callbacks retain failure ownership, not follower eligibility; another Stop overlaps until that delivery completes. Without a shared Stop gesture ID, an independent abort can consume this one same-generation follower.

Storage is bounded to one transaction/follower, one normalized terminal (terminal admission ceiling 16 KiB), at most 16 deferred state frames totaling 1 MiB, and a restore frame of at most 1 MiB. Byte ceilings include UTF-8 JSON and LF. Overflow, unsupported atomic Stop, malformed results, generic/partial-withdraw errors, timeout or transport failure fail this provider closed: immediate **owned-main-OMP SIGKILL before stdin closure**, honest outstanding errors and an active-turn notify where writable, then nonzero transport exit with at most **250 ms** for output/exit observation. Exit is observed independently of pipe closure; unconfirmed termination is reported honestly. No TERM grace, global process-group signal, plain-abort fallback, retry, replay or automatic reconnect.

While Stop owns transport failure handling (including release completion), child/client write admission is limited to 1 MiB of queued bytes plus the proposed UTF-8 line. A false/throwing write, closed output or readable/readline error fails Stop immediately. `write(true)` is admission only: all admitted Stop output must complete successfully before retiring delivery ownership or recording terminal settlement/clearing hold-open. Callback errors and closure fail closed; callbacks that never complete exhaust the existing 500 ms fence, without a renewed release/drain deadline. Old completion callbacks cannot settle a newer prompt or act after disposal. Fatal input admission is retired before finite outstanding diagnostics; it does not generate a response stream to subsequent requests. No input replay queue or drain wait is introduced. Ordinary unrecoverable transport errors also request immediate direct-owned SIGKILL and bounded nonzero completion, without fabricating Stop responses.

Restoration is **text only**, not composer restoration. Received truncation/image-loss flags and returned images produce a notice before finalization. OMP-omitted text/images cannot be recovered; T3 may truncate notices to 2,000 characters and omit empty text from their display. Finite deadlines do not guarantee consumption under scheduler stalls. Untagged arbitrary external lifecycle provenance and containment of arbitrary plugins, external tools or remote delegates are not promised.

Library embeddings must supply an actual `onFatalStop(reason)` termination owner at pipeline construction; it owns ordinary unrecoverable transport errors as well as Stop failures. Absence is a configuration error before readers or work are admitted. `spawnAndProxy` supplies the direct-child owner. Synthetic consumer/process evidence and its live-T3 limitations are recorded in [W07 implementation evidence](planning_docs/selective-upstream-stop-implementation.md) and [W23 completion correction](planning_docs/selective-upstream-stop-fix-r2.md).


### Limiting concurrent subagents

The model policy described below is off by default. To use native tasks with this cap, set `OMPT3_DELEGATE_TASKS=0` (or explicitly include `task` in `--tools`) and leave both model lists empty or unset.

Each omp subagent is an in-process async task sharing omp's single V8 heap. Long fan-out fleets (6+ concurrent reviewers with large transcripts) can exhaust that heap and `SIGABRT` the whole provider scope — capping live children bounds the peak. Native `task` subagents are meant for short parallel work, so the recommended cap is 5:

```bash
# In the environment the T3-launched shim inherits (e.g. a wrapper):
OMPT3_MAX_SUBAGENTS=5 omp-t3   # exec omp-t3 "$@" for a passthrough wrapper
```

What happens: the shim atomically writes `~/.cache/omp-t3/subagent-limits-<N>.yml` (one immutable file per distinct cap, so concurrent shims never overwrite each other) and adds `--config <that file>` to the omp launch. omp queues the 6th+ concurrent `task` spawn (T3 needs no change — queued children simply appear later, and hold-open counts stay truthful) and tells the model "Max 5 concurrent subagents; excess queue." in its system prompt, so disciplined leads dispatch in waves without hitting the queue. The value must be a plain positive integer (`5`, not `0x10`/`1e3`/padded); anything else is warned about on stderr and ignored, and an unwritable cache dir degrades to launching without the cap (never a crash). The cap is per-omp-session, not machine-wide: your direct `omp` terminals keep their own setting.

Long-running delegated work does not belong in native subagents at all: per [AGENTS.md §Subagents](AGENTS.md), use T3's `delegate_task` MCP tool — those children run as T3-owned threads (openable in T3's UI, outside omp's heap) instead of in-process cards.

## Delegation enforcement

By default, `omp-t3` appends a generated extension after user extensions and directs delegated work to T3's `delegate_task` MCP tool. At `session_start`, `session_tree` and `before_agent_start`, it reads the live enabled names and immediately awaits replacement with only exact `task` removed. If `task` is absent it does not call the setter. Under stable registry/mount membership, other enabled custom/plugin/MCP-like tools and their top-level/mounted presentation are preserved; disabled tools are not enabled.

Set `OMPT3_DELEGATE_TASKS=0` to skip routing and its prompt appendix. Any original explicit `--tools` occurrence, split or equals (including empty/invalid values), also disables routing. Explicit tool arguments reach OMP unchanged; their errors and exit status are not pruned or retried. The separate opt-in model policy still blocks native `task` in these cases. User prompt appendices, session flags and native concurrency overlays remain on the sole final launch.

OMP's public API replaces a complete selection; it cannot atomically subtract one tool. Concurrent out-of-band registry/activation/mount changes can lose unrelated membership or change presentation. There is no retry or universal preservation guarantee. If the filter API is missing or fails, stderr reports it and `task` may remain advertised. An independent routing-scoped `tool_call` guard still blocks native `task`, including later re-enablement, through ordinary guarded dispatch. This is routing, not a security sandbox or a guarantee about every internal/xd invocation.

There is one final OMP session, no validation sessions or stock-tool fallback. Bridge adaptation and required cache writes finish before launch. The selected generated contract acknowledges its exact content-keyed identity over an owned child pipe; another generated policy-only hook cannot satisfy registration or consume the new private channel. Until then the proxy admits no client RPC and forwards no readiness/output. Missing acknowledgement or load/registration failure refuses the launch. The ten-second registration deadline remains armed after main-child exit, independent of descendant-held pipes, followed by the existing 250 ms nonzero owned-process observation. Already-written acknowledgement bytes may drain after exit; successful immediate registration/exit retains the child's numeric or ordinary terminating-signal status. The deadline is not a readiness probe: after registration, delayed readiness does not trigger a replacement launch. Installed loader/runner/API evidence covers OMP 18.20.0, not every future version or live T3.

T3 owns scheduling of delegated threads. `OMPT3_MAX_SUBAGENTS` limits OMP's native tasks only; it does not cap T3 `delegate_task` children.

### Subagent model selection

T3 does not read OMP settings, so a `delegate_task` call without `target.model` would inherit the parent thread's model. The adapted T3 bridge fills the omitted model from OMP's live settings instead, before the call reaches T3. The T3 `role` picks the `task.agentModelOverrides` entry:

| `role` | Tried in order |
| --- | --- |
| `review` | overrides `reviewer`, `code-reviewer`; then `@slow` (bundled reviewer frontmatter) |
| `research` | overrides `code-explorer`, `scout`; then `@smol:medium` (bundled scout frontmatter) |
| `design` | override `code-architect` |
| `implementation`, `test`, `general`, omitted | override `task` |

`modelRoles.task` is the final fallback. Values follow OMP's model-spec grammar: a `:level` suffix (exact, or a unique prefix of at least two characters such as `:med`) becomes `target.options.thinking`, while `:auto` and `:inherit` set no level. `@role`, legacy `pi/role`, and `*` (the default role) resolve through `modelRoles`. For a fallback list, only the first entry is used. Where OMP would run the session model, the call is left unchanged so T3 inherits the parent model. This covers an unset role and an override of `*`, `default`, `@default`, or `pi/default`. Settings are read on each call, including project config, `--config` overlays, and runtime overrides, so edits apply without a restart.

The fill applies only when the call targets the Pi provider (`providerInstanceId` or `driverKind` omitted or `pi`) on the local machine (no `environmentId`). An explicit `target.model` is never rewritten. A thinking option the caller sets, and an explicitly empty `options` (`{}` or `[]`, which T3 treats as clearing), are kept. If OMP's settings are unreachable or the configured value cannot be parsed, the call passes through unchanged and T3 inherits the parent model. Set `OMPT3_DELEGATE_MODEL_ROLES=0` to disable the fill. When the model policy below is active, it checks the filled model. Its OMP hook also replaces the tool input with the filled call, so the checked model is the one sent even without the adapted bridge.

### Restricting subagent models

Subagent model restrictions are **off by default**. The former built-in allow/deny lists are commented out in `src/subagent_policy.js`; the shim does not read model choices from AGENTS.md. With both environment variables unset or empty, it adds no model-policy prompt or model restrictions. The separate delegation-routing extension and guidance above remain enabled by default; the adapted bridge still fills model defaults. AGENTS.md and upstream instructions are not changed by this setting.

To opt in, set either variable to a nonempty list in the environment inherited by `omp-t3`. For example, to restore the former policy:

```bash
export OMPT3_SUBAGENT_ALLOWED_MODELS='glm-5.3-flash,gemini-3.8-flash,deepseek-v4.1-flash'
export OMPT3_SUBAGENT_DISALLOWED_MODELS='gpt-*sol*,*opus*,glm-5.3,glm-5.3:*'
```

Values are comma-separated model IDs or patterns, with `*` as the only wildcard. Matching is case-insensitive and anchored to the whole ID. A rule containing `/` matches the full catalog ID; a rule without `/` matches the final model name. For example, `glm-5.3-flash` matches `openrouter/z-ai/glm-5.3-flash`, while `openrouter/z-ai/glm-5.3-flash` restricts the provider too. Display names such as `GLM 5.3 Flash` are invalid. Whitespace around list entries is ignored. Deny rules always win, even when a model also matches an allow rule.

Exact rules such as the examples above exclude aliases such as `glm-flash-latest` and variants such as `glm-5.3-flashx`, dated releases, and `:batch`. Add their exact IDs, or a deliberate wildcard, if you want them. Call `orchestrator_capabilities` to find IDs available in your T3 catalog.

When either list is nonempty, the shim appends these rules to the system prompt on every launch path. A blocking OMP extension checks direct T3 delegation calls, and the adapted T3 MCP client checks again before sending `delegate_task`, including calls through registered tool handlers in scripts. Both T3 tool-name prefixes are covered. Every delegation needs a model: an explicit `target.model`, or one filled from OMP settings as described above. Unresolved, denied, or unlisted models return a tool error before a child starts. Allowed calls retain their provider, model options, and other arguments without rewriting the model.

Native `task` resolves its final model internally, so the hook blocks it while either list is active and directs the agent to T3 delegation. This also applies with `OMPT3_DELEGATE_TASKS=0` or explicit `--tools=task`. Unreadable or incompatible bundled T3 extensions, or failure to write/load/register the required generated hook, refuse launch instead of silently dropping enforcement. A change only to the skill-inlining marker still allows the model guard to load, with a warning about skill inlining.

An empty or unset value clears that list. An empty allowlist permits any explicit model except those denied; an empty denylist keeps the allowlist. Unset **both** variables or set both to empty strings to turn off model restrictions. Previously configured nonempty environment variables still enable restrictions after upgrading. Combine empty/unset lists with `OMPT3_DELEGATE_TASKS=0` to restore stock native tasks and prompt behavior. Restart the provider session after changing its environment.

This policy covers tools in OMP sessions launched through this shim. It is not a T3 server-wide restriction on other providers, top-level conversations, or arbitrary shell commands.

## CLI

`omp-t3` handles four helper flags plus the `update` subcommand locally. It rewrites `--mode` to `rpc-ui`, consumes Pi's `--offline` startup hint, applies [delegation enforcement](#delegation-enforcement) by default, and optionally adds the `OMPT3_MAX_SUBAGENTS` config overlay. Other arguments pass through to OMP:

| Command | Behavior |
|---|---|
| `omp-t3 --version` | Prints the Pi base version on line 1 (what T3's gate parses) and the full shim identity on line 2. Package-derived, offline, instant. |
| `omp-t3 --check` | Verifies `omp` is reachable, runs test model extraction, validates compatibility signals, and checks the session-directory link. |
| `omp-t3 --setup-symlink` | Creates `~/.pi/agent/sessions` -> `~/.omp/agent/sessions` for T3 Code's historical usage dashboard. |
| `omp-t3 --help` | Prints usage instructions and the T3 Code configuration guide. |

### Models, skills, and extension commands fail to refresh

T3 uses `--mode rpc --no-session --offline` for short-lived provider and workspace discovery. OMP 18.16.0 rejects Pi's `--offline` flag with exit code 2. Older shim versions forward it unchanged, so ordinary conversations can work while the provider page reports **"Pi is available, but T3 Code could not refresh its models and commands"** and the command/skill menus stay empty.

The shim consumes this Pi-only hint before both validation and final launch. This is argument compatibility, **not an offline/network-isolation mode**: OMP keeps its normal startup behavior, including configured extensions and MCP servers. It does not disable skills or extensions to make discovery succeed.

After installing the fix, refresh the Pi provider and start a new session to reload its resources. OMP skill commands appear in T3's `$` menu; extension slash commands appear in `/`. Terminal-only extension widgets and custom TUI components are not automatically reproduced by T3's web UI. A missing panel is not proof that its extension hooks failed to load.

## Provider errors & retries

Occasionally a turn ends with a red **Provider error** card, typically `ECONNRESET: The socket connection was closed unexpectedly` — a mid-stream drop from the model endpoint (e.g. z.ai). What happens next:

1. omp marks the turn failed (`stopReason:"error"`) and the shim passes the failure through faithfully — by design, real failures are never suppressed.
2. T3 Code's own attempt retry re-runs the whole turn cleanly (the completed reply you see is the retry).
3. The red card remains as the thread's record of the failed attempt. It is not an ongoing problem.

omp also has its own session-scoped auto-retry, which omp-t3 deliberately leaves **off**: a mid-stream retry would re-run a response whose partial output is already committed to your thread, duplicating content. T3's attempt retry is the correct recovery layer for mid-stream drops.

## Development

Run unit and integration tests:

```bash
npm test
```

---

## Changelog

**Availability note:** `1.5.2` is published to npm (earlier `1.5.0` and
`1.4.0-x` iterations remain available as historical versions). Changelog
entries describe repository source, which may differ from published npm/Homebrew releases. To deploy this fork's source, use the [local-path](#from-a-local-path-fork-checkout) or [Git URL](#from-a-git-url-no-persistent-checkout) installation instructions rather than relying on upstream dist-tags.

### 1.5.2

- **Track upstream Pi release 1.5.2.** Bump base version to 1.5.2 to match `@earendil-works/pi-coding-agent` 1.5.2 release and satisfy T3 Code provider version advisory checks.

### 1.5.0

- **T3 Code v0.1.7 `--offline` discovery probes survive.** T3's Pi driver launches its short-lived discovery processes as `--mode rpc --no-session --offline`; omp exits on the unknown flag, so every probe died and T3 cached an empty catalog ("No skills found", empty `/` and `$` menus) while live chats kept working. The shim drops the flag (omp's RPC startup is already local for discovery) and passes `--no-session` through. Fresh base drop tracking pi (`@earendil-works/pi-coding-agent`) 1.5.0; T3's gate needs ≥ 0.80.5.
- **Skills serve with real on-disk paths.** omp 18.16.0 pushes its full catalog (78 commands / 27 skills in the verification workspace) but answers `get_commands` polls empty — the shim's push-cache absorbs that drift — and its skill entries carry no location, leaving T3's `$name`/`@name` inlining against dangling `pi:skill:` strings. The shim now resolves every skill to its real `SKILL.md` across hierarchical roots (project `.agents/skills`/`.claude/skills` before the user home) and stamps `path` + `sourceInfo.{path, scope}` (project|user), preserved through the Pi projection along with `input.hint`.
- **Install-channel detection fixed on macOS.** `detectInstallChannel` compared a realpath-resolved binary against raw prefix roots; macOS's `/var/folders` → `/private/var/folders` symlink misclassified brew/npm installs as `checkout`. Roots are now resolved best-effort.

### Unreleased

- **Session-authoritative catalogs:** Forward live requests to OMP and prune its replies; preserve request-ID types, live empty lists and real failures. Remove cached/fabricated catalogs and prewarm. Validate whole catalogs, enforce a final 1 MiB UTF-8 JSONL bound, and fail standalone diagnostics on discovery/empty/validation/size errors using the same resolved executable and process context.
- **Exact thinking capabilities:** Support CLI arrays and RPC effort lists with complete seven-key maps, including advertised `xhigh`/`max`; unknown capabilities map entirely to null without changing caller/role thinking.
- **Atomic Stop:** Translate clear/abort into one bounded atomic withdrawal with a same-generation follower, visible text/loss notices, terminal/finalizing-probe fencing and immediate owned-main-provider failure on indeterminate outcomes. Preserve native-child provenance/cancellation and unrelated traffic; no retries, replay or fake restoration.
- **Single-session live-tool routing:** Replace fixed tool lists and validation/prune/relaunch machinery with the existing generated extension's live lifecycle filter and independent native-task call guard. Preserve explicit-tool opt-out, opt-in model policy, role/thinking defaults and native caps. Require child registration acknowledgement before admitting RPC/readiness. Stable non-task membership/presentation is preserved; concurrent full-set/mount changes can lose membership/presentation, and filter errors may leave guarded task advertised.
- **Bounded launch/catalog failures:** Correlate required registration to the selected generated contract, retain its ten-second bound across main exit and retained pipes, and preserve ordinary signal termination status. Bound catalog failure envelopes including long escaped/UTF-8 IDs; when even a minimal correlated error cannot fit, fail the owned transport without fabricated output.

- **Opt-in subagent model restrictions:** Commented out the built-in allow/deny lists. Unset or empty model-list variables no longer inject model-policy guidance or restrictions; explicit environment configuration still enables enforcement independently of routing.

- **Fork deployment documentation:** Added local-path and Git URL installation, ref pinning, T3 binary-path setup, manual fork updates, and uninstall instructions; documented the upstream self-update limitation.

### 1.4.0-5

- **Subagent model restrictions.** Enforces configurable allowlists (`OMPT3_SUBAGENT_ALLOWED_MODELS`) and denylists (`OMPT3_SUBAGENT_DISALLOWED_MODELS`) for subagents launched in OMP sessions, defaulting to AGENTS.md policy: allowed models are `glm-5.3-flash`, `gemini-3.8-flash`, and `deepseek-v4.1-flash`; denied models are `gpt-*sol*`, `*opus*`, `glm-5.3`, and `glm-5.3:*`.
- **Dual-layer policy enforcement.** The policy is appended to the system prompt on all launch paths, an OMP hook intercepts tool execution to block native `task` and direct `delegate_task` calls, and the adapted T3 MCP client wrapper intercepts `delegate_task` before calls leave the process. In-process native `task` is blocked while policy is active; explicit allowed `target.model` is mandatory.
- **Fail-closed adaptation & diagnostic updates.** Unresolvable extension drift or cache failure fails closed with exit code 1 instead of dropping enforcement. `omp-t3 --check` diagnostic inspects policy compilation and prints active rules; `omp-t3 --help` documents environment variables.

### 1.4.0-4

- **Historical launch enforcement (superseded by Unreleased live-tool routing).** Earlier releases used fixed built-in tool lists, bounded validation sessions and stock-tool fallback. Current launches use the generated lifecycle filter and registration acknowledgement described above.
- **Disarm seam proven end-to-end.** The e2e pin drives a pre-abort child through the provenance-scoped cancellation window — armed stragglers cancelled, the same provenance spared after the prompt disarms — so the pin fails if the disarm goes missing. Window docs state the final provenance-only semantics. Troubleshooting record: `Reviews/2026-10-24-workflow-troubleshooting.md`.

### 1.4.0-3
- **Adoption is registry-only.** Task calls the bridge never saw start (mid-turn attach, missed start frames) are adopted for attribution, registry cancellation, and hold-open bookkeeping only — no synthetic status/end frames are emitted onto an id T3 may not hold a card for. This fixes two defects introduced by the previous iteration's open-call adoption: a live status card adopted onto an already-cancelled child after the interrupt (zombie window), and an unseen active bash/wait tool being adopted as a task call, which pointed synthetic card frames at a real, unrelated tool card. Adopted ids are tracked in a separate set and can never capture parentless frames via the sole-task-call fallback. **Recorded trade-off:** mid-turn-attached children no longer render live status lines — they remain tracked, counted toward hold-open notices, and are cancelled at interrupt.
- **Cancellation window is provenance-scoped.** After an interrupt (`abort` or the combined `abort_and_prompt`), the sweep records every task-call id known at that moment; while the window is armed (until the next plain prompt), only children belonging to those pre-interrupt calls — with proven ownership — are cancelled on observation. Children of calls opened or adopted after the abort are never cancelled: adoption is not proof of age, and killing a new-turn child is worse than letting a rare old-run straggler finish (it stays tracked, counted toward hold-open, and reconciled post-settle). This fixes the previous iteration's silent no-op on `abort_and_prompt` without re-introducing over-cancellation. A proxy-layer pin drives the seam end-to-end: armed-window stragglers are cancelled, and the same provenance is spared after the prompt disarms.
- **Hygiene:** unpredictable overlay `.tmp` names with cleanup on every failure path; `childIn` stream error listener so a late window-cancel can never kill the shim; `resolveCallId`/`adoptUnseenCall` doc blocks rewritten to the current trust rule; README historical entries reworded. (The `Number.isSafeInteger` cap guard ships in 1.4.0-2, not here.)

### 1.4.0-2

- **Unseen-parent adoption (later superseded).** Task calls the bridge never saw start (shim attached mid-turn) were adopted with open-call rendering and interrupt coverage. Superseded in 1.4.0-3 by registry-only adoption — same tracking and cancellation, without synthesizing frames onto unverified ids.
- **Post-abort cancellation window.** Straggler children surfacing after the interrupt sweep are cancelled on observation instead of running to completion.
- **Hygiene:** `Number.isSafeInteger` cap guard, stderr-warning test coverage, stale comment/doc fixes.

### 1.4.0-1

- **Quick tasks render as tool cards, not fake agents.** omp's `task` subagents no longer masquerade as T3 subagent cards: the `task`→`subagent` rename and `details.results[]` synthesis are gone (task frames pass through byte-identical), and each `task` call instead streams a compact live status line inside its own tool card (child names, models, narration, done/live counts). The interrupt sweep now closes every open task card with one synthetic `tool_execution_end` instead of per-child terminal updates — the phantom-row and zombie-row bug classes (whose root was T3's per-child subagent node keys) are structurally impossible for a generic tool card. Attribution, the live-child registry, `cancel_subagent` hard-kills, hold-open counts, and `get_subagents` reco…
- **Subagent concurrency cap (`OMPT3_MAX_SUBAGENTS`).** Opt-in `--config` overlay setting omp's `task.maxConcurrency` (native semaphore queues excess spawns; omp also tells the lead agent the limit in its system prompt). Recommended 5 — native subagents are short parallel workers; see [Limiting concurrent subagents](#limiting-concurrent-subagents). The per-value atomic overlay file (`subagent-limits-<N>.yml`, temp+rename) also ships here.

### 1.4.0

- **Interrupting a run stops its subagents — on both sides.** T3's Pi adapter finalizes a run on `agent_settled` without sweeping open subagent rows and drops every later frame, so an interrupt used to leave subagent rows `running` forever in T3's database while omp kept executing the detached children invisibly (live incident: 10 gatekeeper-panel subagents stuck as zombies after a Stop). The shim now sweeps synchronously on the upstream `abort`: every live child card is terminalized first (`finished:true, stopReason:"aborted"` → T3 renders *interrupted*) — strictly before the settle synthesis, inside the window where T3's turn still accepts frames — and omp receives one `cancel_subagent` hard-kill per live child before the abort is forwarded. This mirrors how T3's own Codex adapter propagates a parent interrupt down to child turns. Verified against omp 18.12.6 on the wire (`cancel_subagent` returns `cancelled:false` for already-dead children, so races are harmless).
- **Active subagents reconcile against omp's authoritative snapshot.** The bridge now queries `get_subagents` (single-flight, rate-limited, bridge-internal `ompt3-sub-` ids) when the subagent subscription activates, when a new `task` tool call opens, and whenever a run is held open for pending work. The snapshot merges by child id under the same parent-attribution rules as events: it heals spawns the event stream missed and keeps names, model identities, and narration current — and it can never un-finish a child an event already terminalized. All bridge-internal responses are suppressed from T3. (Card-era entry: since 1.4.0-1 these details render in the task card's status line; the registry no longer tracks mandate text or exit codes.)
- **Subagent status mapping completed.** omp's `failed` subagent status now maps to a failed outcome (`stopReason:"error"`) instead of hanging the child at *running* forever — card-era entry; since 1.4.0-1 failed children surface as "N failed/aborted" in the task card's status line.

### 1.3.0-5

- **Runs mirror the omp session instead of settling at the first cycle boundary.** The previous cycle-boundary settle (1.3.0-4) ended the T3 run while background jobs and detached subagents were still pending — and everything that keeps that work alive (the omp process tree) dies whenever T3 tears the run down: stop with runtime restart, thread close, rollback, an unsolicited-activity guard after any prior stop, or three failed settle probes. Live-verified kill test: a pending `sleep 25` background job never wrote its output after the shim was SIGTERM'd or SIGKILL'd. The shim now holds `agent_settled` until omp's real `session_settled`: `get_state` enrichment counts pending async work (`pendingMessageCount = queuedMessageCount + (hasPendingAsyncWork ? 1 : 0)`), so T3's settle probe keeps the run open across the pause, omp's wake cycle streams its results *into* the still-active run, and the drain finalizes it exactly once.
- **Stop always wins — instantly.** An abort during an active cycle synthesizes the terminal from that cycle's `agent_end` (T3 finalizes interrupted turns on `agent_settled`; omp sends no `session_settled` after an abort while work remains). An abort of a paused run — no cycle open, so no `agent_end` will ever arrive — synthesizes the terminal immediately from the upstream frame. Either way the stop is instant; verified live against omp 18.12.0 through `bin/omp-t3`. One boundary worth knowing: T3 interrupts that request a runtime restart terminate the provider process tree, so pending work dies with the tree (verified live through T3's thread-interrupt API — no rogues left behind, and the next message respawns the provider with full session continuity); only graceful interrupts leave pending work running for the thread.
- **Fallback settle tightened.** The `prompt_result`-based settle now fires only for turns whose agent frames were never observed (shim attached mid-turn) *and* only when omp does not report pending work (`sessionSettled !== false`) — turns that ran real cycles settle exactly once, from `session_settled`.

### 1.3.0-4

- **`$name` skill mentions inline instead of crashing.** T3's bundled MCP extension resolves `$name` skill mentions through `command.sourceInfo.path`, but omp's in-process commands expose the same file as `command.path`, so on stock omp every prompt mentioning a skill threw "undefined is not an object" and the skill body was never inlined. The shim now launches a content-addressed adapted copy of that extension (under `~/.cache/omp-t3/`) whose `getCommands()` view projects `command.path` into `sourceInfo.path`, and repoints `T3_PI_MCP_EXTENSION_PATH` so the extension's tool-ownership identity check keeps matching. If a T3 update drifts the extension source, the original passes through with a stderr warning instead of running stale adapted code. Verified live against omp 18.11.3; commands that already carry `sourceInfo` (omp 18.4.4) pass through untouched.
- **Runs no longer hang while background work is pending.** omp ends each model cycle with `agent_end` but only emits `session_settled` once *all* background jobs and detached subagents have drained — and it announces that condition as `prompt_result.sessionSettled:false`, which the shim's watchdog intentionally ignores (it only fires on broken promises, i.e. `sessionSettled:true` with no settle). Any turn that left a background job running (dev servers, watchers, auto-backgrounded long commands) therefore kept its T3 run active forever; steering only appeared to fix it when the pending work happened to drain. The shim now tracks omp's `agent_start`/`agent_end` cycles and synthesizes the terminal `agent_settled` at each cycle boundary, so the foreground turn completes the moment the assistant stops talking. Duplicate settles are safe: T3's settle probe is generation-guarded and finalizes once.
- **Background results reactivate the thread.** With the foreground turn settled, T3 goes idle while omp's job keeps running. When the job finishes, omp wakes with a new `agent_start` cycle; T3 buffers those events and opens a provider continuation ("Background task completed."), adopts the wake turn, and the wrap-up response streams and settles normally — end-to-end verified against live omp 18.11.3 through `bin/omp-t3` (sleep-75 background job: cycle settle at `agent_end`+0.1s, steer settled mid-window, drain → wake → settle, zero raw `session_settled`/`prompt_result` frames leaked).
- **Fallback settle for prompt-only turns.** If a turn's `prompt_result` carries `agentInvoked:true` but no `agent_end` was observed (shim attached mid-turn), the settle is synthesized from the `prompt_result` itself instead of waiting for a `session_settled` that may never come.
- Matched `agent_start`/`agent_end` by top-level type only — `subagent_event` payloads embed child `agent_end` events and must still reach the subagent bridge.

### 1.3.0-3

- **Skills in T3's `$` menu.** OMP's skill catalog (26 skills, named `skill:*`) is now served through `get_commands` with Pi's `source:"skill"`, so they appear in T3 Code's `$` skill picker and run through `prompt` like native skills. Previously the shim answered every `get_commands` with an empty list, leaving both menus empty.
- **OMP builtins in T3's `/` menu.** `/context`, `/stats`, `/usage`, `/dump`, `/jobs`, and the rest of OMP's builtin/custom/extension commands appear in T3's slash menu (mapped to Pi's `extension` source; markdown-backed `custom`/`file` commands map to `prompt`).
- **Local command output renders in T3.** OMP runs builtin slash commands locally and emits `command_output` frames T3 knows nothing about; the shim re-emits each as rendered text inside the command-only turn, ANSI-stripped and wrapped in a fenced code block so T3's markdown renderer keeps omp's aligned bar-chart layout instead of collapsing newlines into a run-on paragraph.
- **Local-only commands settle.** OMP completes local commands with `data.agentInvoked:false` on the RPC response — no `prompt_result`, no `session_settled` — and T3's own idle probe is suppressed once a turn renders output. The shim synthesizes the terminal `agent_settled` from that signal, so `/context` no longer leaves the turn active forever.
- `get_commands` answers now echo the caller's request id with its original JSON type (numeric ids were previously stringified).
