import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStore, UNDO_LIMIT } from '../src/store.mjs';

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

test('top returns the most counted names, ties in name order, at most n of them', () => {
  const s = openStore(tmpFile());
  s.add('tea', 2);
  s.add('water', 5);
  s.add('coffee', 5);
  s.add('juice', 2);
  s.add('milk');
  assert.deepEqual(s.top(), [['coffee', 5], ['water', 5], ['juice', 2]]);
  assert.deepEqual(s.top(2), [['coffee', 5], ['water', 5]]);
  assert.deepEqual(s.top(10), s.entries());
  assert.deepEqual(openStore(tmpFile()).top(), []);
});

test('undo takes back the last add or reset, one change at a time, across opens', () => {
  const file = tmpFile();
  const a = openStore(file);
  a.add('coffee', 2);
  a.add('tea');
  const before = a.entries();
  a.add('coffee');
  a.reset('tea');
  assert.deepEqual(a.entries(), [['coffee', 3]]);
  const b = openStore(file);
  assert.equal(b.undo(), 'tea');
  assert.equal(b.undo(), 'coffee');
  assert.deepEqual(b.entries(), before);
  assert.equal(b.undo(), 'tea');
  assert.equal(b.undo(), 'coffee');
  assert.deepEqual(openStore(file).entries(), []);
  assert.equal(b.undo(), null);
});

test('undo on a tally written before undo existed finds nothing to undo, and the counts still load', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{ "coffee": 2 }\n');
  const s = openStore(file);
  assert.equal(s.get('coffee'), 2);
  assert.equal(s.undo(), null);
  s.add('tea');
  assert.equal(openStore(file).undo(), 'tea');
  assert.deepEqual(openStore(file).entries(), [['coffee', 2]]);
});

test('only the last UNDO_LIMIT changes can be undone', () => {
  const s = openStore(tmpFile());
  for (let i = 0; i <= UNDO_LIMIT; i++) s.add('x');
  for (let i = 0; i < UNDO_LIMIT; i++) assert.equal(s.undo(), 'x');
  assert.equal(s.undo(), null);
  assert.equal(s.get('x'), 1);
});
