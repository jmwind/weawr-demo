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

test('toJSON gives entries() order as { name, count } objects', () => {
  const s = openStore(tmpFile());
  s.add('coffee');
  s.add('coffee');
  s.add('tea', 3);
  assert.deepEqual(s.toJSON(), [{ name: 'tea', count: 3 }, { name: 'coffee', count: 2 }]);
});

test('add refuses a count that is not a positive integer, and leaves the tally unchanged', () => {
  const s = openStore(tmpFile());
  s.add('coffee', 2);
  for (const by of [NaN, -3, 0, 1.5]) {
    assert.throws(() => s.add('coffee', by), RangeError);
  }
  assert.equal(s.get('coffee'), 2);
});
