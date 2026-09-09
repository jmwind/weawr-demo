# tally

Count things from the command line. This is the codebase the [weawr](https://github.com/jmwind/weawr)
demos work on: small enough to read in a minute, real enough to have bugs and missing features.

## Quick start

```bash
node bin/tally.mjs add coffee        # coffee: 1
node bin/tally.mjs add coffee 2      # coffee: 3
node bin/tally.mjs list              # coffee  3
node bin/tally.mjs top 10            # the ten most counted, like list; three without a number
node bin/tally.mjs reset coffee      # coffee: 0
node bin/tally.mjs undo              # undone (coffee is back to 3)
node bin/tally.mjs undo              # undone (coffee is back to 1)
```

Counts are kept in `tally.json` in the current directory, or in the file `TALLY_FILE` names.
Undo history is kept beside it in `<file>.history`; keep both files together when moving or
backing up a tally. Each `undo` takes back one `add` or `reset`, including a reset of a missing
name. With nothing left to undo, it prints `tally: nothing to undo` and exits with status 1.
Older count files still load, but only changes made with this version can be undone. The
history journal grows with changes and retains undone records; there is no redo command.

## Tests

```bash
npm test
```
