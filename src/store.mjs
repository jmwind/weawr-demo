// The tally store: names and how many times each was counted, kept in one JSON file together
// with a short journal of what each recent change overwrote, so `undo` can put it back.
import fs from 'node:fs';

/** How many changes `undo` can take back. Older ones fall off so the file stays small. */
export const UNDO_LIMIT = 100;

/** Files written before `undo` existed hold the counts alone, not `{ counts, history }`. */
const isJournalled = (data) =>
  data?.counts && typeof data.counts === 'object' && Array.isArray(data.history);

export function openStore(file) {
  let counts = {};
  let history = [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isJournalled(data)) ({ counts, history } = data);
    else counts = data;
  } catch { /* a new tally */ }
  const save = () => fs.writeFileSync(file, JSON.stringify({ counts, history }, null, 2) + '\n');
  /** Note what `name` counts now, so the change about to be made to it can be undone. */
  const remember = (name) => {
    history.push({ name, prev: counts[name] ?? null });
    if (history.length > UNDO_LIMIT) history.shift();
  };
  /** Every name and its count, most counted first; ties in name order. */
  const entries = () => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    /** Count `name` `by` more times (once by default). */
    add(name, by = 1) {
      remember(name);
      counts[name] = (counts[name] || 0) + by;
      save();
      return counts[name];
    },
    get(name) { return counts[name] || 0; },
    reset(name) { remember(name); delete counts[name]; save(); },
    /** Take back the last add or reset. The name it restored, or null when there is nothing to undo. */
    undo() {
      const last = history.pop();
      if (!last) return null;
      if (last.prev === null) delete counts[last.name];
      else counts[last.name] = last.prev;
      save();
      return last.name;
    },
    entries,
    /** The `n` most counted names and their counts, in the order `entries` uses. */
    top(n = 3) { return entries().slice(0, n); },
  };
}
