import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;

// Read a bounded snapshot through a file descriptor. Never fetch URLs.
export async function readJson(file, { root } = {}) {
  if (typeof file !== 'string' || !file || file.includes('\0') || /^[a-z][a-z0-9+.-]*:\/\//i.test(file)) {
    throw new Error('Provide a local JSON file path. URLs are not supported.');
  }
  let handle;
  try {
    const base = root ? await realpath(root) : undefined;
    const target = await realpath(base ? path.resolve(base, file) : path.resolve(file));
    if (base) {
      const relative = path.relative(base, target);
      if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error('File is outside the configured root.');
      }
    }
    if (path.extname(target).toLowerCase() !== '.json') throw new Error('Only .json files are supported.');
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const info = await handle.stat();
    if (!info.isFile()) throw new Error('Input must be a regular JSON file.');
    if (info.size > MAX_FILE_BYTES) throw new Error('JSON file exceeds the 2 MiB limit.');
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (!bytesRead) break;
      total += bytesRead;
    }
    if (total > MAX_FILE_BYTES) throw new Error('JSON file exceeds the 2 MiB limit.');
    try {
      return JSON.parse(buffer.subarray(0, total).toString('utf8').replace(/^\uFEFF/, ''));
    } catch {
      // Native JSON errors can contain snippets of confidential input.
      throw new Error('Invalid JSON. Fix syntax locally; input content is not included in this error.');
    }
  } catch (error) {
    if (error.code) throw new Error('Cannot read the JSON file. Check its path, type and permissions.');
    throw error;
  } finally {
    await handle?.close();
  }
}

export async function writeNewJson(file, value) {
  let handle;
  try {
    handle = await open(path.resolve(file), 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Output already exists. Choose a new output path.');
    throw new Error('Cannot create the output file. Check its directory and permissions.');
  } finally {
    await handle?.close();
  }
}
