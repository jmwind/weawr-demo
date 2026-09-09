# tally

Count things from the command line. This is the codebase the [weawr](https://github.com/jmwind/weawr)
demos work on: small enough to read in a minute, real enough to have bugs and missing features.

## Quick start

```bash
node bin/tally.mjs count coffee      # coffee: 1
node bin/tally.mjs count coffee 2    # coffee: 3
node bin/tally.mjs list              # coffee  3
node bin/tally.mjs top 10            # the ten most counted, like list; three without a number
node bin/tally.mjs reset coffee      # coffee: 0
node bin/tally.mjs undo              # coffee: 3, the reset taken back; again takes back the add before it
```

Counts are kept in `tally.json` in the current directory, or in the file `TALLY_FILE` names, along
with the last hundred changes so `undo` can take them back.

## Tests

```bash
npm test
```
