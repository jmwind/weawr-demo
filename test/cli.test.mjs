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

test('undo reverses add and reset in separate CLI invocations', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"coffee":2}');
  run(file, ['add', 'tea', '3']);
  run(file, ['reset', 'coffee']);
  assert.equal(run(file, ['undo']), 'undone\n');
  assert.equal(run(file, ['undo']), 'undone\n');
  assert.deepEqual(JSON.parse(run(file, ['list', '--json'])), [{ name: 'coffee', count: 2 }]);
  assert.throws(() => run(file, ['undo']), err => {
    assert.equal(err.status, 1);
    assert.match(err.stderr.toString(), /tally: nothing to undo/);
    return true;
  });
});

test('undo on new and legacy tallies reports nothing to undo with exit 1', () => {
  for (const legacy of [false, true]) {
    const file = tmpFile();
    if (legacy) fs.writeFileSync(file, '{"coffee":2}');
    assert.throws(() => run(file, ['undo']), err => {
      assert.equal(err.status, 1);
      assert.match(err.stderr.toString(), /tally: nothing to undo/);
      return true;
    });
  }
});
