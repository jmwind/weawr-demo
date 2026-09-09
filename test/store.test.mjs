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

test('undo reverses add and reset across opens, back to legacy counts', () => {
  const file = tmpFile();
  fs.writeFileSync(file, JSON.stringify({ coffee: 4, tea: 2 }));
  openStore(file).add('coffee', 3);
  openStore(file).reset('tea');
  assert.equal(openStore(file).undo(), true);
  assert.deepEqual(openStore(file).entries(), [['coffee', 7], ['tea', 2]]);
  assert.equal(openStore(file).undo(), true);
  assert.deepEqual(openStore(file).entries(), [['coffee', 4], ['tea', 2]]);
  assert.equal(openStore(file).undo(), false);
});

test('empty and legacy stores have nothing to undo and remain unchanged', () => {
  const file = tmpFile();
  assert.equal(openStore(file).undo(), false);
  assert.equal(fs.existsSync(file), false);
  const legacy = '{"coffee":3}\n';
  fs.writeFileSync(file, legacy);
  assert.equal(openStore(file).undo(), false);
  assert.equal(fs.readFileSync(file, 'utf8'), legacy);
  assert.deepEqual(openStore(file).entries(), [['coffee', 3]]);
});

test('legacy counter names do not collide with snapshot metadata', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"version":1,"counts":2,"undo":3}');
  const before = openStore(file).entries();
  openStore(file).add('counts');
  openStore(file).undo();
  assert.deepEqual(openStore(file).entries(), before);
  assert.equal(openStore(file).undo(), false);
});

test('a damaged snapshot is reported instead of discarding counts and history', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"version":1,');
  assert.throws(() => openStore(file), SyntaxError);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"version":1,');
});

test('undo preserves absent names, zero counts, and multibyte names', () => {
  const file = tmpFile();
  const store = openStore(file);
  store.add('茶', 0);
  store.reset('茶');
  store.reset('missing');
  assert.equal(store.undo(), true);
  assert.deepEqual(store.entries(), []);
  assert.equal(store.undo(), true);
  assert.deepEqual(store.entries(), [['茶', 0]]);
  assert.equal(openStore(file).undo(), true);
  assert.deepEqual(openStore(file).entries(), []);
});

test('new changes after undo keep the remaining history, without redo', () => {
  const file = tmpFile();
  const store = openStore(file);
  store.add('coffee');
  store.add('tea');
  store.undo();
  openStore(file).add('water', 2);
  openStore(file).undo();
  assert.deepEqual(openStore(file).entries(), [['coffee', 1]]);
  openStore(file).undo();
  assert.deepEqual(openStore(file).entries(), []);
  assert.equal(openStore(file).undo(), false);
});

test('failed snapshot saves leave counts and undo history at the last successful change', () => {
  const file = tmpFile();
  const store = openStore(file);
  store.add('coffee');
  fs.mkdirSync(`${file}.tmp`);
  assert.throws(() => store.add('tea'));
  assert.deepEqual(store.entries(), [['coffee', 1]]);
  assert.deepEqual(openStore(file).entries(), [['coffee', 1]]);
  fs.rmdirSync(`${file}.tmp`);
  store.add('water');
  assert.equal(store.undo(), true);
  assert.equal(openStore(file).undo(), true);
  assert.deepEqual(openStore(file).entries(), []);
  assert.equal(openStore(file).undo(), false);
});

test('incomplete history cannot change the saved tally during undo', () => {
  const file = tmpFile();
  openStore(file).add('coffee');
  const saved = fs.readFileSync(file, 'utf8');
  fs.truncateSync(`${file}.history`, 0);
  assert.throws(() => openStore(file).undo(), /incomplete undo history/);
  assert.equal(fs.readFileSync(file, 'utf8'), saved);
});

test('list and add do not read accumulated history', t => {
  const file = tmpFile();
  openStore(file).add('coffee');
  const readFile = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (target, ...args) => {
    assert.equal(target, file, 'only the count snapshot should be read');
    return readFile(target, ...args);
  });
  t.mock.method(fs, 'readSync', () => assert.fail('history must not be read'));
  assert.deepEqual(openStore(file).entries(), [['coffee', 1]]);
  assert.equal(openStore(file).add('coffee'), 2);
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
