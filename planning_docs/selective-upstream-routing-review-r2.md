# W10 — Independent original-scope routing review, round two

## Verdict: PASS

**Zero open Fix, zero Replan, zero Discard. RR1–RR3 close on the reviewed routing/launcher scope.** WP1/WA1 are the same registration-lifetime defect as RR1, not additional fixes. This is not final AC1–6/G1 acceptance: parent-owned whole-change reviews and fresh isolated union gates remain separate requirements.

Reviewed the complete original routing/launcher change since `aafbe12`, not merely W24 assertions. Read ledger AC1–6, reviewed P4/P5, D10/D16/D21–D23, the routing plan review, round-one review, implementation receipt and corrective receipt. Inspected `src/cli.js`, `bin/omp-t3`, `src/subagent_policy.js`, the full `src/proxy.js` startup/pipeline/owner integration, applicable routing/launcher/generated-handler/model-default/delegate/cap/bridge tests and routing documentation. `test/generated-hook.js` was included as real source despite its untracked status. The diff against `aafbe12` leaves `src/delegate_models.js` and `src/extension_compat.js` unchanged; their retained consumers and fill/check/send boundary were inspected.

Only this new report was written in the repository. No implementation, test, README, AGENTS, ledger or old-report edits; no subagents, commits, installed OMP invocation, provider, browser, real chat, user-cache or external-state changes. No broad suite or parent diagnostic duplication. Prior reported failures were accepted as ground truth, not rerun to reconfirm.

## Original findings and corrections

### RR1 — High / Fix closed: registration lifetime survives direct-child exit

`src/proxy.js:432–455,475–496` keeps the original 10,000 ms timer until complete registration. The direct-child `exit` handler no longer cancels it. `close` permits one `setImmediate` turn before deciding missing registration, without replacing or extending the deadline. A registered acknowledgement starts the pipeline; invalid bytes or missing registration enter the mandatory direct-child owner. `owner.failed` prevents subsequent acknowledgement admission.

The owner (`src/proxy.js:369–384`) sends SIGKILL before destroying stdin/stdout, independently observes direct-child `exit`, and finishes nonzero after 250 ms without waiting for descendant-delayed `close`. An already-exited child is still reported as observed, not as killed merely because a signal was requested. Failure is idempotent. The retained fd-3 listener does not create a second refusal interval.

Regression source (`test/launcher.test.js:59–65,129–169,281–294`) preserves the actual retained stdout/fd3 condition for both missing and partial acknowledgement. It asserts empty client output, no child RPC, one launch, the original ten-second bound, main ESRCH, main-exit-before-shim-exit ordering, and a surviving holder/sibling **before cleanup**. The partial fixture now sends the valid incomplete new prefix `{"contract":`, so it exercises the deadline rather than immediate invalid-byte refusal. W24 records approximately 10.31-second nonzero exits for both cases; those are attributed worker observations, not new executions by this review.

Valid immediate exit and the forced exit-before-data case remain (`test/launcher.test.js:34–47,96,296–305`). The preload delays actual fd3 data delivery until the real child exit and queues delivery in a microtask; it does not fake child exit or rewrite generated source. The one-turn decision handles that ordering while preserving exit 7. This is source-shaped scheduling evidence, not every possible installed-loader scheduling guarantee.

### RR2 — High / Fix closed: selected generated contract owns registration

`src/subagent_policy.js:77–129` hashes the canonical generated template, embeds that digest, then separately hashes the final source for its cache filename. The generated factory acknowledges only if `OMPT3_HOOK_REGISTRATION` equals its embedded identity, after registering the lifecycle and independent tool-call handlers. It never closes fd3. Registration exceptions exit nonzero; filter failures diagnose separately and retain the guard.

The generator returns `{args, requiredHook:{file,identity}}`; `src/cli.js:129–143` and `bin/omp-t3:178–184` carry the selected requirement to the single launch. `src/proxy.js:403–418` deletes both inherited old and new private metadata before installing only the selected identity. `src/proxy.js:435–453` accepts the exact JSON contract line. Another policy-only generated contract has a different embedded identity and neither writes to nor closes this channel. Earlier old-field consumers see no old field. No compatibility alias or generic-marker path remains.

The parser retains fragments only while they are an exact prefix of the expected acknowledgement, refuses a mismatch immediately, and starts once. Complete acknowledgement plus coalesced duplicate bytes is accepted; later duplicate data is drained without starting a second pipeline. The prefix is bounded by the fixed expected line rather than an unbounded JSON accumulator. No requirement is added to sandbox arbitrary malicious extension process I/O.

`test/launcher.test.js:19–33,66–94,281–305` includes real unchanged earlier policy-only generated source, both missing and present required routing source, fragmented/duplicate delivery, and the inherited legacy-field writer/closer hazard. The legacy fixture is explicitly synthetic, not purported execution of every historical cached file. My new production-entrypoint probes below independently verify incorrect-contract refusal and old/new metadata removal on both required and stock paths.

### RR3 — Medium / Fix closed: default child signals remain truthful

`src/proxy.js:460–493` retains named forwarding callbacks and removes **only those owned callbacks** before mirroring the terminating child signal. It does not remove unrelated process listeners. Numeric exits still use the child's code. Owned failure paths do not enter ordinary-success completion.

`test/launcher.test.js:55,134–139,160–169,211–223,307–313` retains handled SIGTERM → exit 42 and adds default SIGTERM/SIGHUP assertions `{code:null,signal:<same>}`. One recorded main, main ESRCH and unrelated sibling survival are checked before cleanup. W24's final 31-case launcher execution reports these passing; this review inspected those contracts without repeating the known earlier failure or claiming a fresh signal run.

## Full original-scope accounting

### Launch intent, routing, presentation and policy

- `src/cli.js:81–82` captures routing once from original argv/environment. Any split or equals tools occurrence disables routing, including malformed/missing/empty values. Model-policy activity does not determine routing; `OMPT3_DELEGATE_TASKS=0` does not disable independent opted-in restrictions.
- `src/subagent_policy.js:86–104` registers the three awaited lifecycle filters and a separate native-task guard. Each filter obtains the latest resolved enabled set, immediately invokes the setter with only exact `task` removed, and awaits it. Already-absent task produces no setter call. No fixed list, enabling of disabled registry entries, earlier startup snapshot or persistence to user configuration was introduced.
- Getter/API/synchronous setter/rejected setter failures report stderr without removing the ordinary task-call guard. Later re-enablement remains blocked. This is the approved filter-failure contract, distinct from required registration failure.
- `test/subagent_policy.test.js:179–252` exercises changing selections across all three hooks, `task_extra`, custom/MCP-like names, deferred setters, no mutation when absent, later re-enable and filter failures. The API double is not treated as proof of installed mounted presentation.
- `test/delegate-enforcement.test.js:15–69` preserves all twelve routing/explicit-tools/policy combinations, nonzero environment, appendices, sessions/cap and malformed explicit-tool cases. `test/cli.test.js` retains native-cap absence/validity/sanitized-invalid/unwritable-cache/distinct-cap consumers. These are inspected tests, not newly claimed executions.
- Generated handling still applies model defaults before checking policy and returns the approved replacement input. The unchanged adapted bridge (`src/extension_compat.js:45–54`) fills → checks → sends, including direct MCP-client calls. Retained `test/delegate_models.test.js` consumers cover role/frontmatter/default/layer precedence, aliases, caller model/options/clears, session inheritance, Pi/local scoping, opt-out, unavailable settings and generated/adapted consumers. Routing-only generation introduces no new model allowlist or thinking clamp.
- The VM helper adapts ESM import/export only; it does not replace filtering or model-default behavior. Its handler map supplies deterministic API tests, not a claim to execute installed loader semantics.

### Sole launch and preserved compatibility

`bin/omp-t3:178–184` completes adaptation before one `spawnAndProxy` call. There is no fixed-tool validation/probe/prune/retry/fallback child. Required generation/write errors refuse before spawn. Active-policy bridge adaptation errors also refuse before spawn; successful adaptation retains extension ownership identity. The final child's spawn error reaches owner failure without an unhandled process error.

CLI mode rewriting, Pi-only offline-hint consumption, session flags, caller appendices and native-cap overlays remain. Standalone check still uses literal-path `execFileSync`; release/update/symlink/URL and extension-deferral ownership were not moved into routing. The command/skill bridge and its adapted-client behavior remain behind the ordinary pipeline. Launcher fixture cases preserve delayed READY beyond the removed 900 ms cutoff, offline discovery on routing/opt-out/explicit paths, invalid explicit tools reaching the child unchanged with natural exit 2, startup exit 7, zero-child cache/active-bridge refusal, successful prelaunch adaptation and stock opt-out.

### Catalog/Stop/owner intersection

`src/proxy.js:420–430` constructs the actual direct-process owner and mandatory pipeline together, passing `onFatalStop:owner.fail` before admission. Registration does not replace the single output writer, Stop transaction, correlation tables, doctor lifetime or settlement controller. Child exit during a Stop still reaches `stopController.fail`; ordinary `close` cannot override `owner.failed` with success.

`src/model_catalog.js:57–69,85–103` tries bounded correlated failure envelopes including final UTF-8 serialization and LF, drops optional detail before correlation, and returns explicit fatal disposition if even the minimum envelope cannot fit. Raw real upstream failures still pass through. `src/proxy.js:244–265` retains state-destination correlation before catalog adaptation; catalog fatal disposition goes through existing `transportFailure`, which hands off to the owner before retiring admission. An active Stop uses its failure owner instead. No fabricated response, uncorrelated fallback, oversized error, deferred retry or silent live provider is introduced.

The retained catalog boundary/pipeline tests and actual-launcher `catalog-impossible` case cover this handoff. The latter asserts no catalog output, one main, nonzero failure, actual reaping and sibling survival before cleanup. Existing Stop owner/queue regression corpus is retained. I did not rerun Stop's full original corpus or recertify its consumer algorithm; the review checks that routing/startup and the new catalog disposition do not bypass its ownership path.

## Updated installed generated-source proof

W24's updated receipt provides credible **attributed**, correctly bounded installed OMP 18.20.0 evidence. The reproduction reuses the earlier installed discovery/loader/runner/initializeExtensions/SessionTools/xdev fixture, changing only the private-channel setup/ack assertion and obtaining source from the current real generator. The final source is not patched. The rejected `import.meta.url` approach and its failed installed execution are disclosed rather than counted as passing proof.

I independently generated source in scratch and recomputed both hashes:

```text
canonical contract 86841bd671a458f5b5aa38b3d4d2fe1b62e3c55092538dd75b4ef0c17d18a1e2
final source       ff342d3476329ce934fdaf6da769faa3c2ca7a852c010f5869973a754b79b164
```

They match W24's final identity, final-source fingerprint and cache filename prefix. The receipt's installed-component fingerprints match the prior receipt. Those fingerprint comparisons and source inspection corroborate which code the reported proof exercised; I did not independently rehash the installed runtime or rerun it.

Reported observations include actual explicit-only loading under `--no-extensions`, exact contract bytes, complete stable enabled/top/mounted arrays, byte-identical non-task listing/docs, retained disabled tools, awaited startup/injected-tree/before-agent boundaries, absent-task zero writes/setter calls, and later re-enable blocked by installed ordinary tool-call dispatch. Its outer heavy-gate → unshare → allowlisted environment → bwrap isolation and pre-evaluation hidden-user-dir/empty-route assertions are present in the reproduction.

The host/agent/session-manager are structural doubles; tool names are synthetic registry entries; tree dispatch is injected. This does **not** prove full OMP CLI launch, disk-backed tree restoration, actual plugin/MCP transport, provider schemas/UI, live T3 or paid model behavior. Production-launcher evidence remains the separate synthetic-process surface. The proof does not establish atomic protection from arbitrary concurrent registry/mount changes. D10's accepted public complete-set API limitation remains unchanged and is disclosed in README/help alongside filter-failure/guard limits.

## New independent focused execution

One finite shell command exited **0**. It ran a Node heredoc in an outer `env -i` with scratch-owned HOME/XDG/Pi paths and controlled PATH. Each production shim subprocess used a literal fake OMP and rejecting fake gh. A scratch preload replaced only `ContractDoctor` with an inert class; it did not replace launcher, owner, policy generator, ACK parser or pipeline. No installed OMP/provider/global settings were used. Scratch was removed by the shell trap.

1. **Canonical identity:** call the actual generator for routing-only source. Replace the embedded digest back with the canonical placeholder, recompute SHA-256 and assert equality with `requiredHook.identity`; hash final source separately and assert filename prefix. Values above matched W24.
2. **Incorrect contract with queued client input:** inherit both stale private metadata fields; default routing selects the real generated requirement. Literal fake OMP records received metadata, writes `JSON.stringify({contract:'0'.repeat(64)})+'\n'` to fd3, emits READY and waits. Queue client `get_state` before startup. Observed **347 ms**, shim `{code:1,signal:null}`, stdout empty, no recorded RPC, one main, main ESRCH before cleanup, and diagnostic `Launch refused: invalid required-hook acknowledgement; owned OMP exit observed`. Child metadata contained the selected digest and no old field. This is a new invalid-contract boundary probe, not a repetition of RR2's earlier-real-file counterexample.
3. **Stock opt-out with inherited stale metadata:** set routing to `0`, clear policy, inherit both old/new fields. Fake OMP records both absent, emits READY, receives the queued ordinary RPC/subscription and exits 9. Observed **156 ms**, shim `{code:9,signal:null}`, one main, main ESRCH, forwarded READY and no stderr. This verifies clean channel removal when no hook is required, not just the required-launch branch.

No permanent probe script/test was added. No process was killed by harness cleanup to obtain the reported success/refusal/reaping results.

## Acceptance boundary

Original RR1 High, RR2 High and RR3 Medium are resolved by source, preserved/new behavioral regressions and the appropriately attributed W24 process evidence; new independent hash/channel probes agree. No new functional routing/launcher defect was found. No finding was converted into an accepted-risk waiver, presentation/plugin discard or narrowed test contract.

This PASS covers W10's original routing/launcher scope and its catalog/Stop owner intersection. D10 concurrent full-selection/mount limitations and existing Stop gesture/provenance/truncation/images/display/finite-expiry limits remain accepted boundaries, not newly tested guarantees. D01's initial presentation/plugin integration exclusion does not excuse launch bugs. Parent owns whole-change review convergence, fresh full gates, ledger updates and G1/joint-checkpoint closure.
