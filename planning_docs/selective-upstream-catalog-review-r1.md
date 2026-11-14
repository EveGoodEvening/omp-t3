# W06 — independent catalog implementation review, round 1

## Verdict: Fix (one low-severity cleanup finding)

No functional AC1/AC2 defect found in the reviewed implementation. One obsolete production method and its test remain after the catalog caller cutover; remove them before treating the clean migration as complete. No Replan finding. Queue/routing implementations and pending P3/P4 ledger changes are outside this review.

Authority: ledger P2, AC1/2/5/6 and D08, plus `selective-upstream-catalog-plan-review-r2.md`. The older proposal is not the acceptance contract. Reviewed the current W05 changes against pre-implementation `d719444` (goal baseline `aafbe12`), including the new diagnostic fixture and implementation record. Worker-reported checks are not independent verification.

## R1 — Low / Fix: discovery-only doctor API survives without a production caller

**Locations:** `src/proxy.js:28-30,274-295` removes the catalog callback wiring; `src/doctor.js:145-159` retains `reportDiscoveryFailure`; `src/doctor.js:39-44` still describes discovery reporting; `test/doctor.test.js:147-155` invokes that obsolete path directly.

The complete local reference search found only the method declaration and the direct doctor unit-test call. Neither the live session catalog nor `bin/omp-t3 --check` calls it. The retained method still constructs a CLI-discovery issue/report with wording about custom-model fallback, although the new catalog contract has no such fallback. Its test asserts only that a direct invocation emits no notice, not behavior reachable through the migrated catalog surface.

**Observable source counterexample:** searching production and tests for `reportDiscoveryFailure` returns `src/doctor.js` and `test/doctor.test.js`, with no production call. Consequently a green direct-method test cannot establish that any actual discovery failure reaches this reporter. **[INFERENCE]** This is dead-code/test-contract maintenance debt, not a reproduced user-visible catalog failure or a request to restore automatic issue filing.

**Requested fix:** remove the now-unused discovery-only method, its obsolete class/comment claim, and the direct-method test. Preserve generic doctor reporting, settlement watchdog behavior, issue destination/default policy, and unrelated doctor coverage. Do not reconnect catalog errors to issue creation merely to retain a caller. The approved clean cutover and W05's obsolete-API-removal claim should describe the same tree.

## Contract accounting

| Area | Independent assessment |
| --- | --- |
| AC1: session source and correlation | Source satisfies: upstream catalog interception/prewarm removed; requests pass through once; downstream handler checks actual response type/command and exact success boolean. Own-ID presence/value/type preserved, including zero, empty string, null and absence. No request tracker or guessed correlation. |
| AC1: validation and errors | Whole-array validation rejects malformed members rather than publishing a subset. String selector/default-provider/name fallback and repeated prefix normalization retained; numeric model IDs rejected rather than stringified. Empty live arrays succeed; standalone empty arrays throw. Existing `success:false` returns to unchanged downstream passthrough. No stale/cache/builtin substitutes remain in the manager. |
| AC1: frame bound | `serializeModels` measures final JSON plus LF with UTF-8 `Buffer.byteLength`, real ID, and duplicated lists; equality fits and oversize throws. Live catch produces an explicit list-free error; diagnostics catch the exception and fail rather than printing catalog PASS. Changed tests construct exact 1,048,575/1,048,576/1,048,577-byte projected frames, with escaping/multibyte text, duplicated lists and raw verbose-schema pipeline input. Static test inspection only here; full execution belongs to the orchestrator gate. |
| AC1: standalone | Literal `execFileSync(ompPath, ['models', '--json'])`; inherited process cwd/environment, no forced live-child agentdir or new context syntax. Diagnostic uses the same resolved binary as its literal `--version` call, discovers once, serializes once and exits nonzero on discovery/validation/size errors. Serializer never discovers. |
| AC2 | Exact CLI-array/RPC-efforts projection into all seven keys, absent/unrecognized efforts explicitly null. Boolean/budget-only/unknown capability does not invent options. Existing independent reasoning conversion retained; no caller/role thinking rewrite. Independently exercised consumer-shaped filtering below. |
| AC5, catalog scope | README introduction, architecture, diagnostic contract, limitations and Unreleased entries migrated; legacy caches explicitly ignored, not deleted. Relevant AGENTS lessons accurate. Diff leaves model roles, opt-in model policy, offline compatibility, menus, startup adaptation, live-child environment policy, package/release/install/updater/issue ownership unchanged. Remaining dead doctor path is R1. Preservation runtime gates were not rerun here. |
| AC6, catalog scope | Independent review performed, but not converged until R1 is resolved. Orchestrator's union gates remain external to this report; no whole-change or future-slice approval. |

**W05 AC1/2 accounting:** all requested functional AC1 and AC2 behaviors are represented in source and substantive behavioral coverage; no contrary functional counterexample found. This is not blanket runtime certification: this review independently executed only the narrow probe below. W05 clean-cutover completion remains open for R1, and final gate results must be attached separately.

## Tests and isolation review

- `test/model_catalog.test.js` replaces cache/interception assertions with in-memory request/reply behavior, out-of-order typed IDs, session changes, malformed whole-catalog failures followed by streaming, unchanged real failures, exact maps and exact UTF-8 boundary output. These assert consumer-visible contracts, not implementation/source wording.
- `test/e2e.test.js` migrates immediate catalog interception to a child response while retaining full-turn/settlement assertions. No broad compatibility-test deletion found.
- `test/check-shell.test.js` executes the real diagnostic under scratch cwd/environment; asserts complete success, literal argv and inherited synthetic context, then actual nonzero exit for nonzero fake OMP, invalid JSON, malformed/empty/oversized discovery and an existing unspawnable executable. Same-manager success-then-failure is isolated in a child process. Legacy cache bytes remain unchanged.
- `test/check-fixture.js` builds environment from `{}`, with scratch HOME/XDG/Pi/OMP paths and synthetic profiles. Explicit existing fake `OMP_PATH` prevents installed resolver fallback, including the chmod/unspawnable case. Trusted Node/sh and rejecting fake gh are the only PATH entries; no inherited auth variables. Fixture records selected synthetic fields, not the user's environment; cleanup is in `finally`/test teardown. No process-wide environment mutation in the changed tests. The helper is not matched by `test/*.test.js`.
- **[INFERENCE, source inspection]** With its trusted absolute npm argument and current diagnostic entrypoint, the fixture cannot invoke installed OMP or real gh and does not inherit credentials. This is fixture isolation, not a network sandbox for arbitrary future code or real OMP. I did not launch its diagnostic or npm gate.
- The discovery-only doctor test described in R1 no longer covers a reachable consumer path and should not survive the cutover.

## Independently executed evidence

One ephemeral `node <<'NODE'` stdin script, exit **0**. No script file, OMP, gh, provider, browser, restart or subagent. It imported the actual manager and proxy and:

1. Applied the pinned T3 filtering rules stated in the approved review to actual projected unknown and sparse capability entries. Unknown reasoning/budget-only capability yielded no choices; sparse RPC efforts yielded only `low/max`; absent-map control yielded the five default lower levels.
2. Fed actual pipeline catalog responses with absent/null/zero/string success values, absent IDs, and otherwise valid empty arrays. All four yielded explicit failure with no invented ID.
3. Fed malformed membership with a null ID, verified null preserved, then verified a subsequent unrelated streaming delta remained live.

Exact stdout:

```json
{"unknownChoices":[],"sparseChoices":["low","max"],"absentMapControl":["off","minimal","low","medium","high"],"invalidSuccessCases":4,"nullErrorIdPreserved":true,"subsequentDelta":"still-live"}
```

This is a source-derived consumer-shaped check, not execution of installed T3 or independent revalidation of the pinned release source. No observed failure was rerun. No broad suite was duplicated while the orchestrator ran `npm test` and `node test/check-fixture.js "$(command -v npm)"`.

## Remaining verification boundaries

- Full changed-path/compatibility/union-suite and actual diagnostic results are not independently claimed here; await orchestrator evidence.
- No installed OMP/provider availability, raw protocol-1 oversized-success transport, protocol-2 support, real network isolation, live T3 model menu/presentation or real paid model was exercised or certified.
- No implementation, test, README, AGENTS, ledger or commit was changed by this reviewer. Only this review file was written.
