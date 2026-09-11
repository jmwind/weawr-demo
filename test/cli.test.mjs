import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../bin/tally.mjs', import.meta.url));
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');

const run = (file, args) =>
  execFileSync(process.execPath, [cli, ...args], { env: { ...process.env, TALLY_FILE: file } }).toString();

test('list --json prints entries as a JSON array of {name, count}, in list order', () => {
  const file = tmpFile();
  run(file, ['add', 'coffee']);
  run(file, ['add', 'coffee']);
  run(file, ['add', 'tea', '3']);

  const out = run(file, ['list', '--json']);
  assert.deepEqual(JSON.parse(out), [
    { name: 'tea', count: 3 },
    { name: 'coffee', count: 2 },
  ]);
});

test('undo, undo after add and reset leaves the tally as it was before both changes', () => {
  const file = tmpFile();
  run(file, ['add', 'coffee']);
  run(file, ['reset', 'coffee']);

  run(file, ['undo']); // takes back the reset
  assert.deepEqual(JSON.parse(run(file, ['list', '--json'])), [{ name: 'coffee', count: 1 }]);

  run(file, ['undo']); // takes back the add
  assert.deepEqual(JSON.parse(run(file, ['list', '--json'])), []);
});

test('undo with nothing to undo fails with a message and exit code 1', () => {
  const file = tmpFile();
  assert.throws(
    () => run(file, ['undo']),
    (err) => err.status === 1 && /nothing to undo/.test(err.stderr.toString()),
  );
});

test('undo on a tally.json from before undo existed says there is nothing to undo', () => {
  const file = tmpFile();
  fs.writeFileSync(file, JSON.stringify({ coffee: 3 }));
  assert.throws(
    () => run(file, ['undo']),
    (err) => err.status === 1 && /nothing to undo/.test(err.stderr.toString()),
  );
  assert.deepEqual(JSON.parse(run(file, ['list', '--json'])), [{ name: 'coffee', count: 3 }]);
});
