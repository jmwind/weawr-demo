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

test('undo takes back the last add or reset and prints the count it restored', () => {
  const file = tmpFile();
  tally(file, 'add', 'coffee', '2');
  tally(file, 'add', 'tea');
  tally(file, 'reset', 'coffee');
  assert.equal(tally(file, 'undo').stdout, 'coffee: 2\n');
  assert.equal(tally(file, 'undo').stdout, 'tea: 0\n');
  assert.equal(tally(file, 'list').stdout, 'coffee\t2\n');
});

test('undo with nothing to undo fails, including on a tally written before undo existed', () => {
  const fresh = tally(tmpFile(), 'undo');
  assert.equal(fresh.status, 1);
  assert.equal(fresh.stderr, 'tally: nothing to undo\n');
  assert.equal(fresh.stdout, '');
  const file = tmpFile();
  fs.writeFileSync(file, '{ "coffee": 2 }\n');
  const old = tally(file, 'undo');
  assert.equal(old.status, 1);
  assert.equal(old.stderr, 'tally: nothing to undo\n');
  assert.equal(tally(file, 'list').stdout, 'coffee\t2\n');
});
