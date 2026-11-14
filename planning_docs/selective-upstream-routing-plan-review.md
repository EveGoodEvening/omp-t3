# W18 — Independent P4 / AC4 plan review

## Verdict: PASS — D10's bounded contract

Approve the selected routing design for implementation after the existing serialized shared-file checkpoint. No pre-authorization Fix/Replan finding remains. This approves a plan, not completed AC4 behavior, an implementation, a minimum supported OMP version, or final gates.

Reviewed scope: ledger P4/AC4/D10, proposal §Routing and routing migration criteria, W15's installed OMP 18.20.0 proof, current routing/generation/adaptation/model-default source and relevant test fixtures. Static inspection only. No runtime, tests, installed OMP launch, browser, network, paid model, delegate, commit, or shared-file diff inspection. Only this new review document was written; catalog-worker changes were not reviewed.

## 1. D10 is honest and practical

W15 establishes two different facts:

- Under stable registry and mount membership, actual installed SessionTools preserves the enabled non-task names, top-level/mounted partition, listing and mounted documentation when removing task. Actual initialization/runner dispatch awaits the lifecycle hooks; already-absent task causes no setter/agent-tool write. A later extension can re-enable task, and ordinary tool_call dispatch honors a blocking guard. Explicit extension discovery works with --no-extensions.
- Actual complete-set mutation loses an intervening activation; a mount change can promote a formerly mounted tool. Serialization inside the setter does not refresh the caller's captured array. Immediate get→set reduces an exposed window but does not make the operation atomic: runner pending-registration waits and setter-internal awaits still exist.

The second fact rules out universal preservation using these public APIs. It is an external API limitation, not an effort estimate or a missing local tool. Retaining a fixed list systematically excludes valid custom tools; retries can overwrite newer selections again; private exact-presentation methods introduce unsupported coupling. The supported public lifecycle filter plus ordinary task-call guard is the conservative choice for the accepted routing contract.

D10 explicitly supersedes the stronger preservation assumption in proposal AC4.1 and W15's pre-decision requirement to establish quiescence or obtain an atomic API. Neither is now claimed. “Stable” is a condition of the preservation guarantee, not a lock the shim has established. Out-of-band refresh/registry/mount races remain possible and can lose unrelated membership or change presentation, not merely expose task. Documentation must say this explicitly.

W15 is boundary evidence, not production-hook proof: it executes a synthetic extension against installed components with controlled host/session doubles. It does not exercise the shim's generated extension, disk-backed restoration, full CLI startup, provider schema rendering, actual task execution, or every internal/xd invocation. Do not claim those results from W15.

## 2. Accepted implementation boundary

1. Compute routingEnabled once in parseArgs from original launch intent: OMPT3_DELEGATE_TASKS !== '0' and no split or equals --tools occurrence. Do not infer routing from model-policy activity or later environment reads. Empty/malformed explicit tools remain explicit; OMP owns their errors.
2. Extend subagentPolicyArgs' existing content-keyed generated extension. Generate it when routing or opt-in model policy requires it; generate neither behavior when both are off. Include the routing flag in generated content/cache identity. Append its explicit hook after user extension arguments, retaining the existing immutable-cache/atomic-write convention. No second routing-extension convention.
3. At session_start, session_tree and before_agent_start, synchronously obtain the current enabled names; if task exists, immediately invoke and await setActiveTools with exactly those names minus task. No intervening await, startup snapshot, fixed registry list, enabling disabled names, or persistence to user tool configuration. If task is absent, no setter call. Sequential earlier extension mutations are observed; arbitrary concurrent mutations are not protected.
4. Register the routing-scoped task tool_call block independently of filtering success. API absence, getter failure, synchronous setter throw and rejected setter promise must produce an explicit diagnostic without removing that guard. A stderr diagnostic is a practical model-free/headless-observable choice; do not depend solely on interactive UI. Do not merely throw and assume OMP stops dispatch: extension errors can be reported and execution can continue.
5. Filtering failure may leave task advertised. The guard is fail-closed for native task calls through the guarded dispatch, not a hidden-tool guarantee or a sandbox. A generated-file write/load/registration failure is different from a working guard with a failed filter: do not silently continue a claimed guarded launch if the guard cannot be established. Keep the proposal's refusal requirement for that case; do not introduce another capability-probe session.
6. Keep createSubagentPolicy().checkTool() opt-in semantics independent. Active model policy continues blocking native task with routing off or explicit tools. Retain delegateModelsRuntimeSource application before policy checking and return the approved filled input; keep adapted MCP coverage, including direct execute/client calls. Routing-only generation must not impose explicit-model lists or new model checks.
7. Preserve src/delegate_models.js unchanged: role/frontmatter resolution, live settings/layer precedence, model/thinking fill, explicit model/options/clears, session inheritance, Pi/local scoping and OMPT3_DELEGATE_MODEL_ROLES=0. The adapted client continues providing defaults even when model policy and routing are off.
8. Remove DEFAULT_TOOLS, injectedTools/fallbackArgs, readiness probes, prune/retry/fallback branches and obsolete comments/exports/tests in the same green slice. One final OMP session, with adaptation completed before launch. Preserve native cap overlays, user appendices, offline hint consumption, mode rewrite, execFileSync safety, and symlink/extension ownership. No scheduler, four-task rule, default model lists, updater/version/URL or presentation work.

Appending last establishes order among the supplied explicit extension arguments; it is not proof that nothing can register or run later. The call guard addresses the demonstrated later re-enable within its dispatch boundary.

## 3. Minimal observable verification required for W09/W10

These are implementation acceptance checks, not tests run by this review.

### A. Execute the actual generated extension

Load the file returned by the generator, using a handler map rather than asserting registration count, exact handler names-only, source fragments or policy prose. An API double may record inputs, delay/reject a setter and expose diagnostics; it must not recreate SessionTools partition logic and call that installed-API proof. W15 supplies that separate, explicitly bounded installed evidence. Reusing its installed loader/runner fixture with the generated file would give stronger integration evidence without copying a model implementation.

Minimal scenarios:

- Each of the three serial lifecycle hooks sees the latest selection, removes only exact task, retains custom/plugin/MCP-like names and does not activate a disabled registered name. Include task-like names such as task_extra. Change the selection between lifecycle invocations to catch a cached startup snapshot.
- A deferred setter keeps each hook pending until resolution. An earlier serial extension mutation survives filtering. Already-absent task produces zero mutation, not merely equal final names.
- Re-enable task after filtering; invoking the generated guard blocks task while an unrelated tool passes. Routing off/model policy off allows native task. Filtering API absence and getter/setter failures report a diagnostic while task still blocks through the registered guard. Do not assert exact diagnostic wording.
- With active policy, exercise allowed filled defaults, denied filled defaults and unavailable defaults through the actual generated handler. The approved replacement input must be what is sent. Keep existing transformed-MCP execution tests; a source substring is not proof of that boundary.
- Confirm the generated trusted hook loads through installed explicit-only discovery under --no-extensions. W15 proves the convention, not this generated source. Keep runtime evidence limited to the paths actually exercised; do not label injected session_tree dispatch as a disk-backed switch/restore test.

Do not add an expected universal race-preservation test, retries or a fake atomic API. Link W15's deterministic counterexamples as the supported limitation instead.

### B. Routing/model-policy truth table

Exercise each row with model policy off and on (12 combinations); unset and explicit nonzero routing values should preserve default behavior.

| Routing environment | Explicit tools | Filter / routing guidance / routing task guard | Native task with model policy off | Native task with model policy on |
| --- | --- | --- | --- | --- |
| default/nonzero | absent | yes | blocked | blocked |
| default/nonzero | split | no | allowed | blocked |
| default/nonzero | equals | no | allowed | blocked |
| 0 | absent | no | allowed | blocked |
| 0 | split | no | allowed | blocked |
| 0 | equals | no | allowed | blocked |

“Allowed” means no shim policy rejection, not that task is registered/enabled or will execute successfully. Preserve the actual explicit argv bytes/order including task, empty/invalid values and both user appendix forms. Judge guidance by behavior/semantic inclusion, not a pinned paragraph. No explicit tools argument may be synthesized on the default path.

### C. Launcher subprocess fixture

Migrate test/launcher.test.js's fake OMP, not its old probe algorithm:

- One recorded final launch reaches ready, including readiness delayed beyond the old 900 ms assumption; no second process starts. Keep offline discovery reaching readiness on routing and opt-out/explicit paths.
- Explicit invalid tools, both spellings, reach the child unchanged and retain its error/failure without pruning, retries or stock fallback. Capture the natural exit status before harness cleanup; the current fixture kills after observation and does not return that status.
- A final-child spawn error is visible and bounded, without an unhandled error event. A signal terminates the owned final child without a replacement launch or orphan. Observe exit before fixture cleanup; cleanup killing the process is not proof of signal handling.
- Active-policy bridge adaptation failure and required generated-hook cache failure refuse before any OMP launch. Replace the current two-probe expectation for incompatible bridge with zero launches. Preserve successful adaptation before the final child, without touching the original user extension.

Use deterministic readiness/barriers for sequencing; only the delayed-ready case needs a delay demonstrating the old cutoff is gone.

### D. Preserve existing consumer contracts

Keep the cap behavior in test/cli.test.js: absent value, valid task.maxConcurrency overlay, invalid sanitized warning, unwritable-cache warning/no-cap behavior and distinct caps. Retain caller appendix/session flags/cap coverage formerly attached to fallbackArgs, but test the sole final launch instead.

Retain the full test/delegate_models.test.js consumer matrix and test/extension_compat.test.js adaptation/ownership contracts. Update both generated-hook fixtures that currently assume every registration is tool_call (test/subagent_policy.test.js:103 and test/delegate_models.test.js:247) to dispatch through a handler map. Preserve their fill/check/send assertions. Do not replace inheritance tests with generated-source checks, a second resolver, copied default models, or exact prompt text.

## 4. Migration and authorization recommendation

Implement as one serialized routing slice across src/cli.js, src/subagent_policy.js, bin/omp-t3 and affected behavioral fixtures/docs. src/extension_compat.js should retain its current model-default-before-policy boundary; changes there need a concrete integration reason, not a parallel convention. src/delegate_models.js needs no routing change.

Delete the obsolete probe/prune/fallback machinery only with the working generated-hook and sole-launch evidence. Update routing help/README/Unreleased and reconcile the proposal's unconditional preservation wording with D10 in that implementation checkpoint. State stable partition preservation, concurrent refresh loss/presentation risk, visible-task-on-filter-failure behavior and the ordinary-dispatch guard boundary together. Preserve role guidance rather than replacing it with mandatory explicit-model instructions.

No additional architecture round is required. The generated-source integration, diagnostics, guard retention and launcher evidence above are concrete W09/W10 completion gates, not a declaration that AC4 already passes. Whole-change review/gates remain outside this P4-only authorization.
