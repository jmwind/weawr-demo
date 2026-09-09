import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../bin/tally.mjs', import.meta.url));
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');

const run = (file, ...args) =>
  execFileSync(process.execPath, [cli, ...args], { env: { ...process.env, TALLY_FILE: file } }).toString();

test('list --json prints entries as a JSON array of { name, count }, in list order', () => {
  const file = tmpFile();
  run(file, 'add', 'coffee');
  run(file, 'add', 'coffee');
  run(file, 'add', 'tea', '3');

  const out = run(file, 'list', '--json');
  assert.deepEqual(JSON.parse(out), [
    { name: 'tea', count: 3 },
    { name: 'coffee', count: 2 },
  ]);
});

test('list without --json is unchanged', () => {
  const file = tmpFile();
  run(file, 'add', 'coffee');
  assert.equal(run(file, 'list'), 'coffee\t1\n');
});
