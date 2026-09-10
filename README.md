# tally

Count things from the command line. This is the codebase the [weawr](https://github.com/jmwind/weawr)
demos work on: small enough to read in a minute, real enough to have bugs and missing features.

## Quick start

```bash
node bin/tally.mjs add coffee        # coffee: 1
node bin/tally.mjs add coffee 2      # coffee: 3
node bin/tally.mjs list              # coffee  3
node bin/tally.mjs list --json       # [{"name":"coffee","count":3}]
node bin/tally.mjs reset coffee      # coffee: 0
node bin/tally.mjs undo              # coffee: 3
node bin/tally.mjs undo              # coffee: 1
```

Counts are kept in `tally.json` in the current directory, or in the file `TALLY_FILE` names.
Undo history is kept beside it with `.history` appended; keep both files together.
`undo` takes back one `add` or `reset` at a time, and exits with status 1 when there
is nothing to undo. Existing counts without a history file still load normally.

## Tests

```bash
npm test
```
