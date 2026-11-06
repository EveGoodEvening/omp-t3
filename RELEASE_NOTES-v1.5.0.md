# v1.5.0

Skills and discovery for T3 Code v0.1.7+: the shim now survives T3's
`--offline` discovery probes, serves OMP's full hierarchical skill catalog
with real on-disk paths, and fixes a macOS portability bug in install-channel
detection.

**Compatibility**: fresh base drop tracking the current pi release —
`@earendil-works/pi-coding-agent` **1.5.0** (T3's gate requires ≥ 0.80.5).
Verified live against **omp 18.16.0**. npm already holds plain `1.4.0`, so
this release resumes the plain `X.Y.Z` form for a fresh base per the owner's
version-scheme decision (2026-10-24).

## T3 v0.1.7 `--offline` discovery probes no longer kill OMP

T3 Code v0.1.7's Pi driver launches its short-lived discovery processes
(provider-manifest probe and per-workspace command discovery) as
`--mode rpc --no-session --offline`. Stock pi knows `--offline`; OMP does not
and exits on sight, so every probe died before answering and T3 cached an
empty catalog — the `$` skill menu showed "No skills found" and the `/` menu
was empty, while live chats kept working (live launches pass no `--offline`).
Model lists masked the breakage because the shim serves `get_available_models`
from its persisted catalog even with a dead child. The shim now drops the
flag (OMP's RPC startup is already local for discovery purposes) and passes
`--no-session` through unchanged.

## Skills: full catalog with real paths (`$` menu, `@` mentions)

OMP 18.16.0 pushes its full command catalog (78 commands, 27 skills in the
verification workspace) but serves `get_commands` poll responses **empty** —
a wire-contract drift the shim's push-cache absorbs (polls are answered from
the cached push, never from OMP's empty poll answer). Additionally, OMP's
skill entries carry no file location, so T3 fell back to dangling
`pi:skill:<name>` strings that the agent cannot read when inlining
`$name`/`@name` mentions.

The shim now resolves every skill command to its real `SKILL.md` across
OMP's hierarchical roots — project `.agents/skills` and `.claude/skills`
first, then the user home equivalents — and stamps `path` plus
`sourceInfo.{path, scope}` (`project`/`user`) into the cached catalog, which
the Pi projection preserves (along with `input.hint` for the slash menu).
T3 v0.1.7's driver reads exactly these fields to populate the `$`/`@` menus
and inline skill mentions.

## Install-channel detection fixed on macOS

`detectInstallChannel` compared a realpath-resolved binary path against raw
prefix roots. On macOS, `os.tmpdir()` (`/var/folders/…`) is a symlink to
`/private/var/folders/…`, so brew/npm installs under symlinked prefixes were
misclassified as `checkout` and `update --self` printed the wrong guidance.
Roots are now resolved best-effort (a root that does not exist keeps its
literal form), and the npm fixture test now exercises the resolved path — it
previously passed only because `realpathSync` no-oped on a missing file.

## Verification

- 202/202 tests (6 new pins: `--offline` translation, T3 discovery-sequence
  launch shape, skill path resolution/enrichment, projection field
  preservation, realpath-symmetric channel detection, unresolvable-prefix
  fallback).
- Live wire runs against omp 18.16.0 through `bin/omp-t3`, replaying T3
  v0.1.7's exact discovery sequence (`--mode rpc --no-session --offline`):
  `ready`, `get_state`, 760 models fresh, `get_commands` → 78 commands /
  27 skills — 26 project-scoped plus 1 user-scoped, every skill carrying its
  real `SKILL.md` path; identical results from a cold isolated
  `PI_CODING_AGENT_DIR`.
- `omp-t3 --version` reports the pi base `1.5.0` on line 1 (T3's provider
  gate token) and `omp-t3 1.5.0 (Pi-compatible shim)` on line 2;
  `omp-t3 --check` passes.

## Known residuals

- OMP 18.16.0's empty `get_commands` poll answer is upstream contract drift;
  the push-cache absorbs it today, and `src/doctor.js` could pin the drift
  explicitly later if it widens.
- `Formula/omp-t3.rb` still targets the published `1.4.0-5` npm tarball; it
  is retargeted (with the published tarball's sha256) after `1.5.0` ships to
  npm, per the existing release flow.
