import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bin = new URL('../bin/tally.mjs', import.meta.url).pathname;
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');
const tally = (file, ...args) =>
  spawnSync(process.execPath, [bin, ...args], { env: { ...process.env, TALLY_FILE: file }, encoding: 'utf8' });

test('top prints the three most counted names, or as many as asked for', () => {
  const file = tmpFile();
  tally(file, 'add', 'tea', '2');
  tally(file, 'add', 'water', '5');
  tally(file, 'add', 'coffee', '5');
  tally(file, 'add', 'milk');
  assert.equal(tally(file, 'top').stdout, 'coffee\t5\nwater\t5\ntea\t2\n');
  assert.equal(tally(file, 'top', '10').stdout, 'coffee\t5\nwater\t5\ntea\t2\nmilk\t1\n');
});

test('top refuses a limit that is not a whole number of 1 or more', () => {
  for (const bad of ['0', 'lots', '-1', '1.5']) {
    const run = tally(tmpFile(), 'top', bad);
    assert.equal(run.status, 1, `top ${bad} should exit 1`);
    assert.match(run.stderr, /^tally: top needs a whole number of names/);
    assert.equal(run.stdout, '');
  }
});
