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

test('top keeps the most counted names, ties broken by name, and honours the limit', () => {
  const s = openStore(tmpFile());
  s.add('tea', 3);
  s.add('coffee', 3);
  s.add('water', 5);
  s.add('juice', 1);
  assert.deepEqual(s.top(3), [['water', 5], ['coffee', 3], ['tea', 3]]);
  assert.deepEqual(s.top(10), s.entries());
  assert.deepEqual(s.top(1), [['water', 5]]);
});
