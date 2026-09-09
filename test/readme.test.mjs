// The README's quick start must stay true: every line runs as written and prints what its
// comment says (whitespace aside — `list` separates name and count with a tab).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const quickStart = readme.split('## Quick start')[1].match(/```bash\n([\s\S]*?)```/)[1];
const lines = quickStart.trim().split('\n').map((line) => {
  const [command, comment] = line.split('#').map((s) => s.trim());
  return { command, comment };
});

test('quick start lines run as written and print what the comment says', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tally-readme-'));
  const env = { ...process.env, TALLY_FILE: path.join(dir, 'tally.json') };
  assert.ok(lines.length > 0, 'the quick start has commands');
  for (const { command, comment } of lines) {
    const [node, ...args] = command.split(/\s+/);
    const out = execFileSync(node, args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(out.trim().replace(/\s+/g, ' '), comment.replace(/\s+/g, ' '), command);
  }
});

test('quick start shows every command the command line accepts, once each', () => {
  const usage = fs.readFileSync(path.join(root, 'bin/tally.mjs'), 'utf8').match(/usage: (.*)'/)[1];
  const commands = usage.split('|').map((s) => s.trim().split(' ')[1]);
  const shown = lines.map(({ command }) => command.split(/\s+/)[2]);
  assert.deepEqual(shown.sort(), commands.sort());
});
