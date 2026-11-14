'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

// Execute the generated factory, with only its ESM export/import adapted for VM.
function loadHook(file, env, api = {}, diagnostics = []) {
  const handlers = new Map();
  const pi = { ...api, on(name, handler) { handlers.set(name, handler); } };
  const source = fs.readFileSync(file, 'utf8')
    .replace('import { writeSync } from "node:fs";', '')
    .replace('export default function', 'function');
  vm.runInNewContext(source + '\nompT3SubagentPolicy(pi);', {
    process: { env, exit(code) { throw Error('Unexpected registration refusal: ' + code); } },
    console: { error: (...args) => diagnostics.push(args) },
    writeSync: fs.writeSync, pi
  });
  return handlers;
}
module.exports = { loadHook };
