'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// --check must run the omp binary via argv, so shell syntax in its path stays inert.
test('--check does not evaluate shell syntax in OMP_PATH', { skip: process.platform === 'win32' }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const marker = path.join(root, 'pwned');
  const dir = path.join(root, `$(touch ${marker})`, '`touch ' + marker + '`');
  fs.mkdirSync(dir, { recursive: true });
  const fake = path.join(dir, 'omp');
  fs.writeFileSync(fake, `#!${process.execPath}
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('omp/18.12.6'); process.exit(0); }
if (args[0] === 'models') { console.log('[]'); process.exit(0); }
process.exit(0);
`);
  fs.chmodSync(fake, 0o755);

  const res = spawnSync(process.execPath, [path.resolve('bin/omp-t3'), '--check'], {
    env: { ...process.env, OMP_PATH: fake, HOME: root },
    encoding: 'utf8',
    timeout: 20000,
  });

  assert.equal(fs.existsSync(marker), false, 'shell substitution in OMP_PATH was executed');
  assert.match(res.stdout, /\[PASS\] OMP binary found at: .*\(omp\/18\.12\.6\)/);
});
