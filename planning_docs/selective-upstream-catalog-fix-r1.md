# W19 — catalog review R1 corrective implementation

Authority: `selective-upstream-catalog-review-r1.md` R1 and integration ledger D12. No functional AC1/AC2 defect was identified; this is dead-path cleanup only.

## Exact files

- `src/doctor.js`: removed `ContractDoctor.reportDiscoveryFailure` and its method comment; removed the obsolete model-discovery claim from the class comment. Generic reporting, settlement watchdog, notices, recorded versions, rollback guidance, issue destination and default issue policy are unchanged. Discovery was not reconnected to issue filing.
- `test/doctor.test.js`: removed only `discovery-failure reports never emit in-thread notices`, the direct caller of the unreachable method. All other test wording and implementation are unchanged.
- `planning_docs/selective-upstream-catalog-fix-r1.md`: new implementation/evidence record.

LSP status returned `No language servers configured for this project`. Fallback repository reference enumeration found the method declaration and its direct test call as the only code references; remaining matches were the review and ledger records.

## Verification

Ran exactly once after cleanup:

```sh
node --test test/doctor.test.js
```

Exit: **0**. Exact combined output:

```text
✔ ContractDoctor records last known good on clean settle (5.838422ms)

============================================================
omp-t3: underlying contract changed!
  Drift: OMP 18.11.3 stopped emitting session_settled after a settled prompt_result
  Side:  OMP (the provider binary) changed its RPC contract
  Last known good: none recorded yet
  Roll back the side that changed to your previously installed version.
  An issue with diagnostics will be filed at https://github.com/hashangit/omp-t3/issues (once per day per drift).
============================================================
✔ ContractDoctor synthesizes agent_settled when promised settle never arrives (60.902723ms)
✔ ContractDoctor cancels watchdog when session_settled arrives (60.615841ms)
✔ ContractDoctor reports drift with rollback guidance and rate-limits (1.931799ms)

============================================================
omp-t3: underlying contract changed!
  Drift: OMP 18.11.3 stopped emitting session_settled after a settled prompt_result
  Side:  OMP (the provider binary) changed its RPC contract
  Last known good: none recorded yet
  Roll back the side that changed to your previously installed version.
  An issue with diagnostics will be filed at https://github.com/hashangit/omp-t3/issues (once per day per drift).
============================================================
✔ watchdog writes the drift notice in-thread BEFORE the synthesized settle (60.840263ms)
✔ drift notice shares the 24h rate-limit ledger (option passes only from the watchdog) (2.297361ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 256.466393
```

Safety: all six remaining tests explicitly use `issuesEnabled: false`; the recorded-version test runs only its temporary synthetic `fake-omp` shell script. The issue-filing text above is generic diagnostic wording, not evidence of an issue attempt. No real gh, installed OMP, provider, browser, external runtime, subagent, broad suite or commit was launched. No other docs, ledger or AGENTS files were changed.
