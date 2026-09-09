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

test('undo reverses successive CLI changes and fails clearly at the beginning', () => {
  const file = tmpFile();
  assert.equal(tally(file, 'add', 'coffee', '3').status, 0);
  assert.equal(tally(file, 'reset', 'coffee').status, 0);
  const resetUndo = tally(file, 'undo');
  assert.equal(resetUndo.status, 0);
  assert.equal(resetUndo.stdout, 'coffee: 3\n');
  assert.equal(tally(file, 'list').stdout, 'coffee\t3\n');
  const addUndo = tally(file, 'undo');
  assert.equal(addUndo.status, 0);
  assert.equal(addUndo.stdout, 'coffee: 0\n');
  assert.equal(tally(file, 'list').stdout, '');
  const run = tally(file, 'undo');
  assert.equal(run.status, 1);
  assert.equal(run.stderr, 'tally: nothing to undo\n');
  assert.equal(run.stdout, '');
});

test('undo reports nothing to undo for new and legacy tally files', () => {
  const file = tmpFile();
  for (const legacy of [false, true]) {
    if (legacy) fs.writeFileSync(file, '{"coffee":5}\n');
    const run = tally(file, 'undo');
    assert.equal(run.status, 1);
    assert.equal(run.stderr, 'tally: nothing to undo\n');
    assert.equal(tally(file, 'list').stdout, legacy ? 'coffee\t5\n' : '');
  }
});

test('undo reports missing or incomplete history without a stack trace or changing counts', () => {
  for (const missing of [true, false]) {
    const file = tmpFile();
    tally(file, 'add', 'coffee');
    const before = fs.readFileSync(file, 'utf8');
    if (missing) fs.unlinkSync(`${file}.history`);
    else fs.truncateSync(`${file}.history`, 0);
    const run = tally(file, 'undo');
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.match(run.stderr, /^tally: .*history[^\n]*\n$/);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  }
});

test('list reports invalid JSON without a stack trace or replacing the file', () => {
  const file = tmpFile();
  fs.writeFileSync(file, 'not JSON');
  const run = tally(file, 'list');
  assert.equal(run.status, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /^tally: [^\n]+\n$/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'not JSON');
});
