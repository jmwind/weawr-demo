import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const bin = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'bin', 'tally.mjs');
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');

function run(args, file) {
  return spawnSync(process.execPath, [bin, ...args], {
    env: { ...process.env, TALLY_FILE: file },
    encoding: 'utf8',
  });
}

test('list --json prints the entries as a JSON array of {name, count}, in list order, and nothing else', () => {
  const file = tmpFile();
  run(['add', 'tea', '3'], file);
  run(['add', 'coffee', '5'], file);
  const result = run(['list', '--json'], file);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), [
    { name: 'coffee', count: 5 },
    { name: 'tea', count: 3 },
  ]);
});

test('list without --json is unchanged', () => {
  const file = tmpFile();
  run(['add', 'coffee', '2'], file);
  const result = run(['list'], file);
  assert.equal(result.stdout, 'coffee\t2\n');
});
