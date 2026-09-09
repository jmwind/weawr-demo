// Counts and the undo head live in JSON; inverse changes live in an append-only journal.
import fs from 'node:fs';

export function openStore(file) {
  let counts = {};
  let head = null;
  const journal = `${file}.history`;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version === 1 && typeof data.counts === 'object' && data.counts !== null) {
      counts = data.counts;
      head = data.undo;
    } else {
      counts = data; // Older files are plain name-to-count maps, with no undo history.
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const save = (next, undo) => {
    fs.writeFileSync(`${file}.tmp`, JSON.stringify({ version: 1, counts: next, undo }, null, 2) + '\n');
    fs.renameSync(`${file}.tmp`, file);
    counts = next;
    head = undo;
  };
  const get = name => Object.hasOwn(counts, name) ? counts[name] : 0;
  const change = (name, next) => {
    const record = JSON.stringify({ name, existed: Object.hasOwn(counts, name), count: get(name), previous: head }) + '\n';
    const fd = fs.openSync(journal, 'a');
    let offset;
    try {
      offset = fs.fstatSync(fd).size;
      fs.writeFileSync(fd, record);
    } finally {
      fs.closeSync(fd);
    }
    // Publish counts and their head together, only after the record is complete.
    // Unreferenced records (from undo or a failed save) can safely stay in the journal.
    save(next, { offset, size: Buffer.byteLength(record) });
  };
  /** Every name and its count, most counted first; ties in name order. */
  const entries = () => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    /** Count `name` `by` more times (once by default). */
    add(name, by = 1) {
      change(name, { ...counts, [name]: get(name) + by });
      return counts[name];
    },
    get,
    reset(name) {
      const next = { ...counts };
      delete next[name];
      change(name, next);
    },
    /** Revert one add/reset and return its name, or false when there is no earlier change. */
    undo() {
      if (!head) return false;
      const fd = fs.openSync(journal, 'r');
      const buffer = Buffer.alloc(head.size);
      try {
        if (fs.readSync(fd, buffer, 0, buffer.length, head.offset) !== buffer.length) {
          throw new Error('incomplete undo history');
        }
      } finally {
        fs.closeSync(fd);
      }
      const record = JSON.parse(buffer.toString('utf8'));
      const next = { ...counts, [record.name]: record.count };
      if (!record.existed) delete next[record.name];
      save(next, record.previous);
      return record.name;
    },
    entries,
    /** The `n` most counted names and their counts, in the order `entries` uses. */
    top(n = 3) { return entries().slice(0, n); },
  };
}
