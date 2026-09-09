import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');
const tally = (file, ...args) =>
  spawnSync(process.execPath, ['bin/tally.mjs', ...args], { encoding: 'utf8', env: { ...process.env, TALLY_FILE: file } });

test('top prints the leaders, three by default', () => {
  const file = tmpFile();
  for (const [name, n] of [['tea', '3'], ['coffee', '3'], ['water', '5'], ['juice', '1']]) tally(file, 'add', name, n);
  assert.equal(tally(file, 'top').stdout, 'water\t5\ncoffee\t3\ntea\t3\n');
  assert.equal(tally(file, 'top', '10').stdout, 'water\t5\ncoffee\t3\ntea\t3\njuice\t1\n');
});

test('top rejects a limit that is not a positive number', () => {
  const file = tmpFile();
  for (const bad of ['0', 'lots', '-1']) {
    const r = tally(file, 'top', bad);
    assert.equal(r.status, 1, `top ${bad} should exit 1`);
    assert.match(r.stderr, /top needs a positive number/);
  }
});
