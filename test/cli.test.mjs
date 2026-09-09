import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const bin = new URL('../bin/tally.mjs', import.meta.url).pathname;
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tally-')), 'tally.json');
const tally = (file, ...args) =>
  execFileSync(process.execPath, [bin, ...args], { env: { ...process.env, TALLY_FILE: file }, encoding: 'utf8' });

test('list --json prints only a JSON array of { name, count }, in list order', () => {
  const file = tmpFile();
  tally(file, 'add', 'coffee', '2');
  tally(file, 'add', 'tea', '3');
  const out = tally(file, 'list', '--json');
  assert.deepEqual(JSON.parse(out), [{ name: 'tea', count: 3 }, { name: 'coffee', count: 2 }]);
  assert.equal(out, JSON.stringify([{ name: 'tea', count: 3 }, { name: 'coffee', count: 2 }]) + '\n');
});

test('list --json on an empty tally is an empty array; list without the flag is still a table', () => {
  const file = tmpFile();
  assert.equal(tally(file, 'list', '--json'), '[]\n');
  tally(file, 'add', 'coffee');
  assert.equal(tally(file, 'list'), 'coffee\t1\n');
});
