// Counts stay in the JSON file; previous values form a stack in its .history sidecar.
import fs from 'node:fs';

// Read only the final record, even when the history is large.
function lastChange(file) {
  let fd;
  try { fd = fs.openSync(file, 'r'); } catch (err) {
    if (err.code === 'ENOENT') throw new Error('nothing to undo');
    throw err;
  }
  try {
    let end = fs.fstatSync(fd).size;
    if (!end) throw new Error('nothing to undo');
    end--; // Skip the trailing newline.
    const chunks = [];
    while (end > 0) {
      const start = Math.max(0, end - 4096);
      const chunk = Buffer.alloc(end - start);
      fs.readSync(fd, chunk, 0, chunk.length, start);
      const newline = chunk.lastIndexOf(10);
      chunks.unshift(chunk.subarray(newline + 1));
      if (newline !== -1) {
        return { offset: start + newline + 1, change: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
      }
      end = start;
    }
    return { offset: 0, change: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } finally { fs.closeSync(fd); }
}

export function openStore(file) {
  let counts = {};
  try { counts = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* a new tally */ }
  const history = `${file}.history`;
  const save = () => fs.writeFileSync(file, JSON.stringify(counts, null, 2) + '\n');
  const previous = name => Object.hasOwn(counts, name) ? counts[name] : null;
  const restore = (name, value) => {
    if (value === null) delete counts[name];
    else Object.defineProperty(counts, name, { value, enumerable: true, configurable: true, writable: true });
  };
  const change = (name, value) => {
    const before = previous(name);
    const record = JSON.stringify([name, before]) + '\n';
    fs.appendFileSync(history, record);
    restore(name, value);
    try { save(); } catch (err) {
      restore(name, before);
      fs.truncateSync(history, fs.statSync(history).size - Buffer.byteLength(record));
      throw err;
    }
  };
  return {
    /** Count `name` `by` more times (once by default). `by` must be a positive integer. */
    add(name, by = 1) {
      if (!Number.isInteger(by) || by <= 0) {
        throw new RangeError(`count must be a positive integer, got ${by}`);
      }
      change(name, (previous(name) || 0) + by);
      return counts[name];
    },
    get(name) { return previous(name) || 0; },
    reset(name) { change(name, null); },
    /** Take back the most recent add or reset, including across opens. */
    undo() {
      const { offset, change: [name, value] } = lastChange(history);
      const before = previous(name);
      restore(name, value);
      try { save(); } catch (err) { restore(name, before); throw err; }
      fs.truncateSync(history, offset);
    },
    /** Every name and its count, most counted first. */
    entries() { return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); },
  };
}
