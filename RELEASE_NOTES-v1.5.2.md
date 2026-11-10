# v1.5.2

Base version drop tracking upstream `@earendil-works/pi-coding-agent` 1.5.2.

**Compatibility**: fresh base drop tracking the current pi release —
`@earendil-works/pi-coding-agent` **1.5.2** (T3's gate requires ≥ 0.80.5).
Verified live against **omp 18.13.1** / **18.16.0**.

## Upstream parity bump

- Tracks `@earendil-works/pi-coding-agent` **1.5.2** to satisfy T3 Code's provider version advisory checks and avoid spurious update prompts.
- All existing bridge mechanics, translation rules, and discovery adaptations remain in place and operational.

## Verification

- 202/202 tests green (`npm test`).
- `omp-t3 --version` reports `1.5.2` on line 1 and `omp-t3 1.5.2 (Pi-compatible shim)` on line 2.
- `omp-t3 --check` passes all verification checks cleanly.
