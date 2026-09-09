#!/usr/bin/env node
// tally: count things from the command line.
//
//   tally add <name> [n]    count <name> once, or n times
//   tally list              every name and its count
//   tally top [n]           the n most counted names (three by default)
//   tally reset <name>      forget a name
//   tally undo              take back the last add or reset
//
// Counts live in ./tally.json (or the file TALLY_FILE names).
import { openStore } from '../src/store.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const store = openStore(process.env.TALLY_FILE || 'tally.json');

switch (cmd) {
  case 'add': {
    const [name, n = '1'] = rest;
    if (!name) fail('add needs a name', true);
    console.log(`${name}: ${store.add(name, Number(n))}`);
    break;
  }
  case 'list': {
    print(store.entries());
    break;
  }
  case 'top': {
    const [n = '3'] = rest;
    const limit = Number(n);
    if (!Number.isInteger(limit) || limit < 1) fail(`top needs a whole number of names, 1 or more, not "${n}"`, true);
    print(store.top(limit));
    break;
  }
  case 'reset': {
    if (!rest[0]) fail('reset needs a name', true);
    store.reset(rest[0]);
    console.log(`${rest[0]}: 0`);
    break;
  }
  case 'undo': {
    const name = store.undo();
    if (name === null) fail('nothing to undo');
    console.log(`${name}: ${store.get(name)}`);
    break;
  }
  default:
    fail(cmd ? `unknown command ${cmd}` : null, true);
}

function print(entries) {
  for (const [name, count] of entries) console.log(`${name}\t${count}`);
}

/** Say what went wrong and exit 1; with `showUsage`, print the usage line too (alone, exit 0, when there is no problem). */
function fail(problem, showUsage = false) {
  if (problem) console.error(`tally: ${problem}`);
  if (showUsage) console.error('usage: tally add <name> [n] | tally list | tally top [n] | tally reset <name> | tally undo');
  process.exit(problem ? 1 : 0);
}
