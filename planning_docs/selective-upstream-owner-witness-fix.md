# W25 — completed real-child acceptance witness

## Scope and result

Corrected GF1's acceptance prerequisite in `test/stop-owner.test.js`; **production unchanged**. The corrected isolated owner gate ran once: **33/33 pass**, zero failures/skips/cancellations, exit 0, Node duration **13,475.268378 ms**. No full-project, diagnostic or independent-review certification.

Read ledger AC3/5/6 and D24/D25, W23 `selective-upstream-stop-fix-r2.md`, current owner regression and its embedded actual child, and `selective-upstream-stop-owner-review-r3.md`. The requested shorter `stop-owner-review-r3.md` path does not exist; the ledger identifies the prefixed report read here. LSP reports no configured servers. No subagents, commits, branches, ledger/old-report edits, pushes, installed OMP, live providers, browsers or unrelated cleanup.

## Root cause and ordering

The authoritative parent failure remains artifact://40: 435/436 pass, zero skipped/cancelled; output-error's final acceptance-file assertion read `''` instead of `accepted\n`. Its chained diagnostic did not run. This old failure was not rerun to confirm, dismissed as flaky or counted as passing evidence.

The actual synthetic `PROGRAM` installs a queued EOF-drain operation before readiness, parses the real atomic command from stdin, and calls `fs.appendFileSync(marker + '.accepted', 'accepted\n')` before emitting its agent-start/reply output. The parent previously polled only `existsSync` every 2 ms, then synchronously injected the selected transport fault. That reaches the existing Stop failure/process owner, whose immediate direct-child SIGKILL is intentional. The owner observes actual `exit` and destroys stdin/stdout only at its existing 250 ms finish timer.

Creation and completion are different cross-process observations. Opening the append path creates a visible empty file before the write completes. A parent scheduled there can see existence, inject output-error and kill the child before the write. Synchronous append prevents that child's next JavaScript statement from running early; it does not stop the parent or make open/write atomic. Source ordering plus the reported empty file identifies a broken prerequisite, not a reason to delay production SIGKILL or close stdin first. [INFERENCE] The exact scheduler/syscall interleaving in artifact://40 was not traced; the controlled real-process proof below establishes this causal mechanism without replaying that failure.

A source-inspection command under scratch HOME printed Node v24.22.3's `appendFileSync` and `writeFileSync`: append delegates to writeFileSync with flag `a`; UTF-8 strings use `binding.writeFileUtf8`, while the generic path explicitly opens, writes and closes. The completion-vs-creation argument does not require changing either Node path.

## Smallest correction

- The real child sends `{ type: 'fixture_accepted' }` on its IPC channel only **after the unchanged append returns**.
- Actual-main fixtures add IPC to their existing three stdio pipes. The parent registers `events.once(child, 'message', { signal: t.signal })` before admitting Stop, then validates the positive witness before external fault injection. `t.signal` uses the existing 4,000 ms test deadline; no new/widened timer, poll or retry.
- All nine original prerequisite users share the same gate: EOF, write, client-EOF, client-error, readable-error, output-error, output-close, output-pressure and input-throw. No one-mode exception.
- Witness transport is separate from the deliberately faulted/backpressured stdout/client output. Descendant holder inherits stdout only, not IPC. Provider subprocess fixtures continue using the same child program without IPC; optional send does not change their behavior or automatic response/failure prerequisites.
- The witness comes from actual child execution, not a parent-created marker, callback count or fake production substitute. The final exact file-content assertion remains independent and unchanged.

No production ownership defect is implicated by this ordering: moving the fixture's observation after completion closes the gap while preserving immediate SIGKILL. `src/queue.js`, proxy owner/callback/correlation/doctor/generation/count/byte/deadline behavior and all other production files remain untouched. No public contract changed, so README was not edited.

## Preserved process proof

All existing assertions remain, without deletion or relaxation:

- Real accepted command and exact `accepted\n` contents; preinstalled queued EOF-drain operation; queued-work execution marker absent.
- Detection < direct SIGKILL < actual main `exit` < finish(1); one SIGKILL, no SIGTERM; kill before stdin destruction; `owner.exited === true` and actual SIGKILL signal.
- Existing 250 ms requested finish, >=200/<1,500 ms qualified scheduler bound, retained holder alive and descendant-delayed `close` absent at finish.
- Actual Writable saturation, asynchronous retained-callback/never-ack failure, zero settlement and terminal never entering `_write`.
- Provider subprocess exit 1 with external stdout unread, kill-before-EOF markers, observed-main-exit diagnosis, retained holder alive through finish, unrelated sibling alive, cleanup/reaping assertions and the unconfirmed-exit case.

The permanent change strengthens the existing consumer-facing process regression; it adds no helper-wiring/echo tests. The existing `finally` still stops the pipeline, kills and awaits any still-live owned main, destroys its pipes, kills its holder and removes its unique scratch directory. Cancellation now also retires the acceptance listener instead of leaving a polling interval alive.

## Exact targeted gate

The following setup and final invocation were executed (an initial inline proof was between the setup and gate; see disclosure below):

```bash
node_bin=$(command -v node)
scratch=$(mktemp -d /tmp/ompt3-w25-owner-XXXXXX)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch"/{home,config,cache,state,data,runtime,pi-agent,omp-agent,pi-config,omp-config,tmp,bin}
printf '#!/bin/sh\nexit 97\n' > "$scratch/bin/omp"
printf '#!/bin/sh\nexit 98\n' > "$scratch/bin/gh"
chmod +x "$scratch/bin/omp" "$scratch/bin/gh"
isolated=(env -i HOME="$scratch/home" XDG_CONFIG_HOME="$scratch/config" XDG_CACHE_HOME="$scratch/cache" XDG_STATE_HOME="$scratch/state" XDG_DATA_HOME="$scratch/data" XDG_RUNTIME_DIR="$scratch/runtime" PI_CODING_AGENT_DIR="$scratch/pi-agent" OMP_CODING_AGENT_DIR="$scratch/omp-agent" PI_CONFIG_DIR="$scratch/pi-config" OMP_CONFIG_DIR="$scratch/omp-config" PI_PROFILE=synthetic-pi OMP_PROFILE=synthetic-omp OMP_PATH="$scratch/bin/omp" PATH="$scratch/bin" TMPDIR="$scratch/tmp")
"${isolated[@]}" "$node_bin" --test test/stop-owner.test.js
```

Observed exit 0, **33 tests / 33 pass / 0 fail / 0 cancelled / 0 skipped**, including all 23 actual-main modes, one unconfirmed case and nine provider subprocess cases. Corrected output-error passed in 319.072586 ms. Total Node duration 13,475.268378 ms; combined command wall time 13.68 s. Inert doctors remain injected; child environments remain empty. Only literal fake OMP/gh are reachable through the outer allowlisted PATH; no real credentials/config/plugins/state were inherited. Scratch was removed by the trap. No heavy workload required a gate.

## Controlled interleaving proof and disclosure

An initial inline proof in the combined command emitted **no case results** despite exit 0. It is invalid evidence and is not counted as a pass. Its nested program quoting and pending-message handling were replaced with `String.raw`, explicit exit-before-witness rejection and a referenced finite deadline; no repository edit or targeted-test rerun followed. The successful corrected proof used a fresh `/tmp/ompt3-w25-proof-XXXXXX` root with exactly the same directory/fake-executable/allowlist setup above, then invoked the absolute Node binary on this stdin program:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const program = String.raw`
const fs = require('node:fs');
const fd = fs.openSync(process.argv[1], 'a');
process.send('opened');
process.once('message', () => {
  fs.writeSync(fd, 'accepted\n');
  fs.closeSync(fd);
  process.send('completed');
});
setInterval(() => {}, 1000);
`;
(async () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'w25-interleaving-'));
  try {
    for (const complete of [false, true]) {
      const marker = path.join(dir, String(complete));
      const child = spawn(process.execPath, ['-e', program, marker], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], env: {} });
      const exit = once(child, 'exit');
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 2000);
      const message = () => Promise.race([
        once(child, 'message', { signal: controller.signal }),
        exit.then(() => { throw Error('child exited before witness'); })
      ]);
      try {
        assert.equal((await message())[0], 'opened');
        assert.equal(fs.existsSync(marker), true);
        assert.equal(fs.readFileSync(marker, 'utf8'), '');
        if (complete) {
          const witness = message();
          child.send('continue');
          assert.equal((await witness)[0], 'completed');
        }
        child.kill('SIGKILL');
        const [code, signal] = await exit;
        assert.equal(signal, 'SIGKILL');
        assert.equal(fs.readFileSync(marker, 'utf8'), complete ? 'accepted\n' : '');
        console.log(JSON.stringify({ case: complete ? 'completed-witness-before-kill' : 'existence-before-write-kill', result: 'PASS', code, signal }));
      } finally {
        clearTimeout(deadline); controller.abort();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await exit;
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
```

Observed exit 0, wall time <0.1 s:

```json
{"case":"existence-before-write-kill","result":"PASS","code":null,"signal":"SIGKILL"}
{"case":"completed-witness-before-kill","result":"PASS","code":null,"signal":"SIGKILL"}
```

This is a controlled open/write scheduling proof using real files and real child termination, not the old regression rerun, a replacement production implementation, or installed OMP behavior. Both children were reaped and their scratch removed. No throwaway source file was created in the checkout.

## Changed paths and limits

Only W25 paths changed:

- `test/stop-owner.test.js`: child-completed acceptance synchronization.
- `AGENTS.md`: reusable cross-process existence-vs-completion lesson appended.
- `planning_docs/selective-upstream-owner-witness-fix.md`: this new receipt.

All pre-existing owned source/tests retained. No new targeted-test failure occurred; the inconclusive first scratch proof is disclosed above. Full npm tests, actual isolated diagnostic, new independent original ownership/whole-change review and final ledger acceptance remain parent-owned. This receipt provides implementation evidence only, not full-gate or independent certification.
