#!/usr/bin/env node
// tally: count things from the command line.
//
//   tally add <name> [n]    count <name> once, or n times
//   tally list [--json]     every name and its count, as a table or a JSON array
//   tally reset <name>      forget a name
//
// Counts live in ./tally.json (or the file TALLY_FILE names).
import { openStore } from '../src/store.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const store = openStore(process.env.TALLY_FILE || 'tally.json');

switch (cmd) {
  case 'add': {
    const [name, n = '1'] = rest;
    if (!name) usage('add needs a name');
    console.log(`${name}: ${store.add(name, Number(n))}`);
    break;
  }
  case 'list': {
    const entries = store.entries();
    if (rest.includes('--json')) {
      console.log(JSON.stringify(entries.map(([name, count]) => ({ name, count }))));
    } else {
      for (const [name, count] of entries) console.log(`${name}\t${count}`);
    }
    break;
  }
  case 'reset': {
    if (!rest[0]) usage('reset needs a name');
    store.reset(rest[0]);
    console.log(`${rest[0]}: 0`);
    break;
  }
  default:
    usage(cmd ? `unknown command ${cmd}` : null);
}

function usage(problem) {
  if (problem) console.error(`tally: ${problem}`);
  console.error('usage: tally add <name> [n] | tally list [--json] | tally reset <name>');
  process.exit(problem ? 1 : 0);
}
