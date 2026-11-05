# Model discovery and rollback fixes

- [x] Execute the model discovery binary directly with argument arrays, cover literal paths with a regression test, and remove the resolved AGENTS.md lesson.
  verify: `node --test test/model_catalog.test.js`; the literal-path regression fails on the original shell invocation by creating a temporary marker and passes with direct execution.
- [ ] Correct the OMP rollback command to use `@oh-my-pi/pi-coding-agent`, verify its version pin, and remove the resolved AGENTS.md lesson.
  verify: `node --test test/doctor.test.js` asserts the scoped package and last known good version; `npm test` checks the full suite.
- [ ] Obtain independent Gatekeeper Review on the committed candidate.
  verify: A separate REVIEW receipt must seal the candidate. Currently blocked: the referenced `.agents/skills/gatekeeper*/` files are absent, and T3 capabilities returned no matching allowed Flash models.
