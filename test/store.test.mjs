import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStore } from '../src/store.mjs';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');

test('counts, and keeps the counts across opens', () => {
  const file = tmpFile();
  const a = openStore(file);
  assert.equal(a.add('coffee'), 1);
  assert.equal(a.add('coffee'), 2);
  assert.equal(a.add('tea', 3), 3);
  const b = openStore(file);
  assert.equal(b.get('coffee'), 2);
  assert.deepEqual(b.entries(), [['tea', 3], ['coffee', 2]]);
});

test('reset forgets a name; an unknown name counts as zero', () => {
  const s = openStore(tmpFile());
  s.add('x');
  s.reset('x');
  assert.equal(s.get('x'), 0);
  assert.equal(s.get('never'), 0);
});

test('add refuses a count that is not a positive integer, and leaves the tally unchanged', () => {
  const s = openStore(tmpFile());
  s.add('coffee', 2);
  for (const by of [NaN, -3, 0, 1.5]) {
    assert.throws(() => s.add('coffee', by), RangeError);
  }
  assert.equal(s.get('coffee'), 2);
});

test('undo reverses the last add or reset, one step at a time, across opens', () => {
  const file = tmpFile();
  openStore(file).add('coffee'); // coffee: 1
  openStore(file).reset('coffee'); // coffee: 0 (forgotten)

  openStore(file).undo(); // undoes the reset
  assert.equal(openStore(file).get('coffee'), 1);

  openStore(file).undo(); // undoes the add
  assert.equal(openStore(file).get('coffee'), 0);
});

test('undo with nothing to undo throws', () => {
  const s = openStore(tmpFile());
  assert.throws(() => s.undo(), /nothing to undo/);
});

test('a plain tally.json with no history still loads, and has nothing to undo', () => {
  const file = tmpFile();
  fs.writeFileSync(file, JSON.stringify({ coffee: 3 }));
  const s = openStore(file);
  assert.equal(s.get('coffee'), 3);
  assert.throws(() => s.undo(), /nothing to undo/);
});
