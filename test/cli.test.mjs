import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');
const tally = (file, ...args) =>
  spawnSync(process.execPath, ['bin/tally.mjs', ...args], { encoding: 'utf8', env: { ...process.env, TALLY_FILE: file } });

test('add refuses a count that is not a positive integer with exit code 1', () => {
  const file = tmpFile();
  assert.equal(tally(file, 'add', 'coffee', '2').stdout, 'coffee: 2\n');
  for (const bad of ['lots', '-3', '0']) {
    const r = tally(file, 'add', 'coffee', bad);
    assert.equal(r.status, 1, `add coffee ${bad} should exit 1`);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /^tally: add coffee .*positive integer\n$/);
  }
  assert.equal(tally(file, 'list').stdout, 'coffee\t2\n');
});
