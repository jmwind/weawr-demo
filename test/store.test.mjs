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

test('undo reverses add then reset across opens, preserving older counts', () => {
  const file = tmpFile();
  fs.writeFileSync(file, JSON.stringify({ coffee: 2, tea: 3 }));
  openStore(file).add('coffee', 4);
  openStore(file).reset('tea');
  openStore(file).undo();
  assert.deepEqual(openStore(file).entries(), [['coffee', 6], ['tea', 3]]);
  openStore(file).undo();
  assert.deepEqual(openStore(file).entries(), [['tea', 3], ['coffee', 2]]);
  assert.throws(() => openStore(file).undo(), /nothing to undo/);
});

test('new and legacy tallies have nothing to undo and are not modified', () => {
  const file = tmpFile();
  assert.throws(() => openStore(file).undo(), /nothing to undo/);
  assert.equal(fs.existsSync(file), false);
  const legacy = '{"coffee": 7, "zero": 0}\n';
  fs.writeFileSync(file, legacy);
  assert.throws(() => openStore(file).undo(), /nothing to undo/);
  assert.equal(fs.readFileSync(file, 'utf8'), legacy);
  assert.deepEqual(openStore(file).entries(), [['coffee', 7], ['zero', 0]]);
});

test('undo removes new names, restores zero, and supports changes after undo', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"zero":0}');
  const s = openStore(file);
  s.reset('zero');
  s.undo();
  assert.deepEqual(s.entries(), [['zero', 0]]);
  s.add('coffee');
  s.undo();
  s.add('tea', 2);
  s.undo();
  assert.deepEqual(s.entries(), [['zero', 0]]);
  assert.throws(() => s.undo(), /nothing to undo/);
});

test('reset of an absent name is undoable and rejected adds do not enter history', () => {
  const s = openStore(tmpFile());
  s.add('coffee');
  s.reset('absent');
  assert.throws(() => s.add('coffee', -1), RangeError);
  s.undo();
  assert.equal(s.get('coffee'), 1);
  s.undo();
  assert.deepEqual(s.entries(), []);
  assert.throws(() => s.undo(), /nothing to undo/);
});

test('history handles long Unicode names, escaped newlines, and object property names', () => {
  const file = tmpFile();
  const names = ['first', '☕'.repeat(5000) + '\nlast', '__proto__', 'constructor'];
  for (const name of names) openStore(file).add(name, 2);
  for (const name of names.toReversed()) {
    assert.equal(openStore(file).get(name), 2);
    openStore(file).undo();
    assert.equal(openStore(file).get(name), 0);
  }
  assert.deepEqual(openStore(file).entries(), []);
});

test('list and add do not parse earlier history', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"coffee":2}');
  fs.writeFileSync(`${file}.history`, 'unread earlier history\n');
  const s = openStore(file);
  assert.deepEqual(s.entries(), [['coffee', 2]]);
  s.add('coffee');
  s.undo();
  assert.equal(s.get('coffee'), 2);
  assert.equal(fs.readFileSync(`${file}.history`, 'utf8'), 'unread earlier history\n');
});

test('a failed counts write does not leave a change in memory or history', () => {
  const file = tmpFile();
  const s = openStore(file);
  fs.mkdirSync(file);
  assert.throws(() => s.add('coffee'));
  assert.deepEqual(s.entries(), []);
  assert.throws(() => s.undo(), /nothing to undo/);
});
