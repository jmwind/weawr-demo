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
try {
  const store = openStore(process.env.TALLY_FILE || 'tally.json');

  switch (cmd) {
    case 'add': {
      const [name, n = '1'] = rest;
      if (!name) usage('add needs a name');
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
      if (!Number.isInteger(limit) || limit < 1) usage(`top needs a whole number of names, 1 or more, not "${n}"`);
      print(store.top(limit));
      break;
    }
    case 'reset': {
      if (!rest[0]) usage('reset needs a name');
      store.reset(rest[0]);
      console.log(`${rest[0]}: 0`);
      break;
    }
    case 'undo': {
      const name = store.undo();
      if (name === false) {
        console.error('tally: nothing to undo');
        process.exitCode = 1;
      } else {
        console.log(`${name}: ${store.get(name)}`);
      }
      break;
    }
    default:
      usage(cmd ? `unknown command ${cmd}` : null);
  }
} catch (error) {
  console.error(`tally: ${error.message}`);
  process.exitCode = 1;
}

function print(entries) {
  for (const [name, count] of entries) console.log(`${name}\t${count}`);
}

function usage(problem) {
  if (problem) console.error(`tally: ${problem}`);
  console.error('usage: tally add <name> [n] | tally list | tally top [n] | tally reset <name> | tally undo');
  process.exit(problem ? 1 : 0);
}
