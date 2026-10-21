import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readJson, writeNewJson, MAX_FILE_BYTES } from '../src/io.js';

test('root rejects traversal and symlink escape, accepts files and BOM', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lens-io-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = path.join(dir, 'root'); await mkdir(root);
  await writeFile(path.join(root, 'ok.json'), '\uFEFF{"a":1}');
  await writeFile(path.join(dir, 'outside.json'), '{"secret":"never-return-this"}');
  await symlink(path.join(dir, 'outside.json'), path.join(root, 'escape.json'));
  assert.deepEqual(await readJson('ok.json', { root }), { a: 1 });
  await assert.rejects(readJson('../outside.json', { root }), /outside/);
  await assert.rejects(readJson('escape.json', { root }), /outside/);
  await assert.rejects(readJson('https://example.test/data.json', { root }), /URLs/);
});

test('errors are bounded and do not echo bad JSON, credentials or filename', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lens-private-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'bad.json'), '{"token":"TOP-SECRET",broken');
  await assert.rejects(readJson('bad.json', { root: dir }), error => !error.message.includes('TOP-SECRET') && /Invalid JSON/.test(error.message));
  await assert.rejects(readJson('TOP-SECRET.json', { root: dir }), error => !error.message.includes('TOP-SECRET'));
  await writeFile(path.join(dir, 'large.json'), ' '.repeat(MAX_FILE_BYTES + 1));
  await assert.rejects(readJson('large.json', { root: dir }), /2 MiB/);
  await writeFile(path.join(dir, 'text.txt'), '{}');
  await assert.rejects(readJson('text.txt', { root: dir }), /Only .json/);
});

test('redacted output is private and cannot overwrite an existing file', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lens-write-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'output.json');
  await writeNewJson(output, { email: '[REDACTED]' });
  await assert.rejects(writeNewJson(output, { email: 'overwrite' }), /already exists/);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { email: '[REDACTED]' });
  if (process.platform !== 'win32') assert.equal((await stat(output)).mode & 0o777, 0o600);
});
