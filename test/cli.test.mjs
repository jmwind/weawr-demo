import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../bin/tally.mjs', import.meta.url));
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');

function run(args, file) {
  return execFileSync(process.execPath, [cli, ...args], {
    env: { ...process.env, TALLY_FILE: file },
    encoding: 'utf8',
  });
}

test('list --json prints entries as a JSON array of {name, count}, in list order', () => {
  const file = tmpFile();
  run(['add', 'tea', '3'], file);
  run(['add', 'coffee', '2'], file);
  const out = run(['list', '--json'], file);
  assert.deepEqual(JSON.parse(out), [
    { name: 'tea', count: 3 },
    { name: 'coffee', count: 2 },
  ]);
});

test('list --json prints nothing but the JSON on stdout', () => {
  const file = tmpFile();
  run(['add', 'coffee'], file);
  const out = run(['list', '--json'], file);
  assert.equal(out, `${JSON.stringify([{ name: 'coffee', count: 1 }])}\n`);
});

test('list without --json is unchanged', () => {
  const file = tmpFile();
  run(['add', 'coffee', '2'], file);
  const out = run(['list'], file);
  assert.equal(out, 'coffee\t2\n');
});
