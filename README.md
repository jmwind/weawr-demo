# tally

Count things from the command line. This is the codebase the [weawr](https://github.com/jmwind/weawr)
demos work on: small enough to read in a minute, real enough to have bugs and missing features.

## Quick start

```bash
node bin/tally.mjs add coffee        # coffee: 1
node bin/tally.mjs list              # coffee  1
node bin/tally.mjs top 10            # coffee  1  (the ten most counted; three without a number)
node bin/tally.mjs reset coffee      # coffee: 0
```

Counts are kept in `tally.json` in the current directory, or in the file `TALLY_FILE` names.

## Tests

```bash
npm test
```
