'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createCheckFixture } = require('./check-fixture.js');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('--check uses literal executable and inherited process context; failures exit nonzero', { skip: process.platform === 'win32' }, (t) => {
  const fixture = createCheckFixture();
  t.after(() => fixture.cleanup());
  const run = () => spawnSync(process.execPath, [path.resolve('bin/omp-t3'), '--check'], {
    env: fixture.env, cwd: fixture.cwd, encoding: 'utf8', timeout: 20000
  });
  const success = run();
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /Model catalog discovery succeeded: 1 models/);
  assert.match(success.stdout, /All checks passed/);
  assert.equal(fs.readFileSync(fixture.cache, 'utf8'), fixture.legacy);
  const calls = fixture.calls();
  assert.deepEqual(calls.map((c) => c.args), [['--version'], ['models', '--json']]);
  for (const call of calls) {
    assert.equal(call.cwd, fixture.cwd);
    for (const [key, value] of Object.entries(call.env)) assert.equal(value, fixture.env[key], key);
  }
  assert.equal(fs.existsSync(fixture.env.SHELL_MARKER), false);
  assert.equal(fs.readlinkSync(path.join(fixture.env.HOME, '.pi/agent/sessions')),
    path.join(fixture.env.HOME, '.omp/agent/sessions'));

  for (const scenario of ['nonzero', 'invalid', 'malformed', 'empty', 'oversize']) {
    fixture.scenario(scenario);
    const before = fixture.calls().length;
    const result = run();
    assert.equal(result.status, 1, `${scenario}: ${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /Model catalog discovery succeeded|All checks passed/);
    assert.match(result.stderr, /Model discovery error/);
    assert.deepEqual(fixture.calls().slice(before).map((c) => c.args), [['--version'], ['models', '--json']]);
    assert.equal(fs.readFileSync(fixture.cache, 'utf8'), fixture.legacy);
  }
  fs.chmodSync(fixture.env.OMP_PATH, 0o644);
  const unspawnable = run();
  assert.equal(unspawnable.status, 1);
  assert.doesNotMatch(unspawnable.stdout, /Model catalog discovery succeeded|All checks passed/);
  assert.equal(fs.existsSync(fixture.env.GH_RECORD), false);
});

test('standalone discovery cannot reuse a previous success or legacy cache', { skip: process.platform === 'win32' }, (t) => {
  const fixture = createCheckFixture();
  t.after(() => fixture.cleanup());
  // Run in a separate controlled process: never mutate the test runner environment.
  const script = `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const { ModelCatalogManager } = require(${JSON.stringify(path.resolve('src/model_catalog.js'))});
    const manager = new ModelCatalogManager();
    assert.equal(manager.discoverModels(process.env.OMP_PATH)[0].id, 'fixture-model');
    fs.writeFileSync(process.env.SCENARIO, 'nonzero');
    assert.throws(() => manager.discoverModels(process.env.OMP_PATH));
    const { createProxyPipeline } = require(${JSON.stringify(path.resolve('src/proxy.js'))});
    const { createMockStreams, collectLines } = require(${JSON.stringify(path.resolve('test/helpers.js'))});
    const { stdin: clientIn, stdout: clientOut } = createMockStreams();
    const { stdin: childIn, stdout: childOut } = createMockStreams();
    const lines = collectLines(clientOut);
    const pipeline = createProxyPipeline({
      clientIn, clientOut, childIn, childOut,
      onFatalStop() { childIn.destroy(); childOut.destroy(); },
      doctor: { observeDownstream() {}, stop() {} }
    });
    pipeline.start();
    try {
      childOut.write(JSON.stringify({type:'response',command:'get_available_models',success:true,data:{models:[{id:'live'}]}})+'\\n');
      const failure = JSON.stringify({type:'response',command:'get_available_models',success:false,error:'protocol-1 overflow'});
      childOut.write(failure+'\\n');
      assert.equal(lines.lines.length, 2);
      assert.equal(lines.lines[1], failure);
    } finally { pipeline.stop(); }
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: fixture.cwd, env: fixture.env, encoding: 'utf8', timeout: 20000
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fixture.calls().map((c) => c.args), [['models', '--json'], ['models', '--json']]);
  assert.equal(fs.readFileSync(fixture.cache, 'utf8'), fixture.legacy);
});
