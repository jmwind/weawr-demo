// The tally store: names and how many times each was counted, kept in one JSON file.
//
// The file holds `{ counts, history }`. `history` is a stack of `{ name, before }` entries, one
// per `add`/`reset`, recording only what that call changed (`before` is the name's prior count,
// or absent if it had none) — cheap to append and cheap to undo, without snapshotting the whole
// tally on every write. A file from before `undo` existed is just the flat `{name: count}` object;
// it loads straight into `counts` with an empty history, so undo on it correctly says there's
// nothing to undo.
import fs from 'node:fs';

export function openStore(file) {
  let counts = {};
  let history = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        parsed.counts && typeof parsed.counts === 'object' && Array.isArray(parsed.history)) {
      ({ counts, history } = parsed);
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      counts = parsed; // an older tally.json: no history yet
    }
  } catch { /* a new tally */ }

  const save = () => fs.writeFileSync(file, JSON.stringify({ counts, history }, null, 2) + '\n');
  const record = (name) => history.push({ name, before: counts[name] });

  return {
    /** Count `name` `by` more times (once by default). `by` must be a positive integer. */
    add(name, by = 1) {
      if (!Number.isInteger(by) || by <= 0) {
        throw new RangeError(`count must be a positive integer, got ${by}`);
      }
      record(name);
      counts[name] = (counts[name] || 0) + by;
      save();
      return counts[name];
    },
    get(name) { return counts[name] || 0; },
    reset(name) {
      record(name);
      delete counts[name];
      save();
    },
    /** Every name and its count, most counted first. */
    entries() { return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); },
    /** Reverse the most recent `add` or `reset`. Throws if there is nothing to undo. */
    undo() {
      if (history.length === 0) {
        throw new Error('nothing to undo');
      }
      const { name, before } = history.pop();
      if (before === undefined) delete counts[name];
      else counts[name] = before;
      save();
      return { name, count: counts[name] || 0 };
    },
  };
}
