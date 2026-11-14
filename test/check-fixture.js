'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Shared by diagnostics regressions and the reproducible isolated npm gate.
function createCheckFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ompt3-check-'));
  const env = {};
  for (const [key, rel] of Object.entries({
    HOME: 'home', XDG_CONFIG_HOME: 'config', XDG_CACHE_HOME: 'cache',
    XDG_STATE_HOME: 'state', XDG_DATA_HOME: 'data', XDG_RUNTIME_DIR: 'runtime',
    PI_CODING_AGENT_DIR: 'pi-agent', OMP_CODING_AGENT_DIR: 'omp-agent',
    PI_CONFIG_DIR: 'pi-config', OMP_CONFIG_DIR: 'omp-config'
  })) {
    env[key] = path.join(root, rel);
    fs.mkdirSync(env[key], { recursive: true });
  }
  env.OMP_PROFILE = 'synthetic-omp';
  env.PI_PROFILE = 'synthetic-pi';
  env.PATH = path.join(root, 'bin');
  fs.mkdirSync(env.PATH);
  fs.symlinkSync(process.execPath, path.join(env.PATH, 'node'));
  fs.symlinkSync('/bin/sh', path.join(env.PATH, 'sh'));
  env.RECORD = path.join(root, 'calls.jsonl');
  env.GH_RECORD = path.join(root, 'gh.jsonl');
  env.SCENARIO = path.join(root, 'scenario');
  env.SHELL_MARKER = path.join(root, 'shell-ran');
  const dir = path.join(root, 'spaces "quotes" $(touch "$SHELL_MARKER") `touch "$SHELL_MARKER"');
  fs.mkdirSync(dir);
  env.OMP_PATH = path.join(dir, 'omp');
  fs.writeFileSync(env.OMP_PATH, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const keys = ${JSON.stringify(Object.keys(env).filter((k) => !['PATH', 'RECORD', 'GH_RECORD', 'SCENARIO', 'SHELL_MARKER', 'OMP_PATH'].includes(k)))};
fs.appendFileSync(process.env.RECORD, JSON.stringify({args, cwd:process.cwd(), env:Object.fromEntries(keys.map(k=>[k,process.env[k]]))})+'\\n');
if (JSON.stringify(args) === '["--version"]') { console.log('omp/fixture'); process.exit(0); }
if (JSON.stringify(args) !== '["models","--json"]') process.exit(91);
const scenario = fs.readFileSync(process.env.SCENARIO, 'utf8');
if (scenario === 'nonzero') process.exit(23);
if (scenario === 'invalid') { console.log('not JSON'); process.exit(0); }
if (scenario === 'empty') { console.log('[]'); process.exit(0); }
if (scenario === 'malformed') { console.log('{"models":[{"id":17}]}'); process.exit(0); }
console.log(JSON.stringify({models:[{id:'fixture-model', provider:'fixture', name:scenario === 'oversize' ? '界'.repeat(200000) : 'Fixture', reasoning:true, thinking:{efforts:['high','max']}}]}));
`);
  fs.chmodSync(env.OMP_PATH, 0o755);
  fs.writeFileSync(path.join(env.PATH, 'gh'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.GH_RECORD, JSON.stringify(process.argv.slice(2))+'\\n');
process.exit(90);
`);
  fs.chmodSync(path.join(env.PATH, 'gh'), 0o755);
  const cache = path.join(env.XDG_CACHE_HOME, 'omp-t3', 'models.json');
  fs.mkdirSync(path.dirname(cache));
  const legacy = '{"savedAt":1,"models":[{"id":"obsolete"}]}';
  fs.writeFileSync(cache, legacy);
  fs.writeFileSync(env.SCENARIO, 'success');
  const cwd = path.join(root, 'workspace');
  fs.mkdirSync(cwd);
  return {
    root, env, cwd, cache, legacy,
    scenario(value) { fs.writeFileSync(env.SCENARIO, value); },
    calls() { return fs.existsSync(env.RECORD) ? fs.readFileSync(env.RECORD, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []; },
    cleanup() { fs.rmSync(root, { recursive: true, force: true }); }
  };
}

module.exports = { createCheckFixture };

if (require.main === module) {
  const fixture = createCheckFixture();
  try {
    if (!path.isAbsolute(process.argv[2] || '')) throw new Error('Pass the absolute npm executable path');
    const result = spawnSync(process.argv[2], ['run', 'check'], {
      cwd: path.resolve(__dirname, '..'), env: fixture.env, encoding: 'utf8', timeout: 20000
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    console.log('Synthetic OMP calls:', JSON.stringify(fixture.calls()));
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally { fixture.cleanup(); }
}
