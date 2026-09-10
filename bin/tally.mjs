#!/usr/bin/env node
// tally: count things from the command line.
//
//   tally add <name> [n]    count <name> once, or n times
//   tally list              every name and its count
//   tally list --json       every name and its count, as JSON
//   tally reset <name>      forget a name
//   tally undo             take back the last add or reset
//
// Counts live in ./tally.json (or the file TALLY_FILE names).
import { openStore } from '../src/store.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const store = openStore(process.env.TALLY_FILE || 'tally.json');

switch (cmd) {
  case 'add': {
    const [name, n = '1'] = rest;
    if (!name) usage('add needs a name');
    try {
      console.log(`${name}: ${store.add(name, Number(n))}`);
    } catch (err) {
      usage(err.message);
    }
    break;
  }
  case 'list': {
    if (rest[0] === '--json') {
      console.log(JSON.stringify(store.entries().map(([name, count]) => ({ name, count }))));
    } else {
      for (const [name, count] of store.entries()) console.log(`${name}\t${count}`);
    }
    break;
  }
  case 'reset': {
    if (!rest[0]) usage('reset needs a name');
    store.reset(rest[0]);
    console.log(`${rest[0]}: 0`);
    break;
  }
  case 'undo': {
    try {
      const { name, count } = store.undo();
      console.log(`undo: ${name}: ${count}`);
    } catch (err) {
      usage(err.message);
    }
    break;
  }
  default:
    usage(cmd ? `unknown command ${cmd}` : null);
}

function usage(problem) {
  if (problem) console.error(`tally: ${problem}`);
  console.error('usage: tally add <name> [n] | tally list [--json] | tally reset <name> | tally undo');
  process.exit(problem ? 1 : 0);
}
