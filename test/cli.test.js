import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const cli = (...args) => spawnSync(process.execPath, ['bin/webhook-lens.js', ...args], { cwd, encoding: 'utf8', timeout: 10000 });

test('documented demo finds the deliberate drift and validates both samples', () => {
  const result = cli('demo'); assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.validation.before.valid, true);
  assert.equal(data.validation.after.valid, false);
  assert.ok(data.drift.typeChanged.some(item => item.path === '/order/total'));
  assert.ok(!result.stdout.includes('alex@example.test'));
  assert.ok(!result.stdout.includes('demo-token-not-a-credential'));
});

test('exit codes support CI without confusing drift with tool failure', () => {
  const args = ['compare', 'examples/order.created.json', 'examples/order.updated.json'];
  assert.equal(cli(...args).status, 0);
  assert.equal(cli(...args, '--fail-on-drift').status, 1);
  assert.equal(cli('validate', 'examples/order.created.json', '--schema', 'examples/order.schema.json').status, 0);
  assert.equal(cli('validate', 'examples/order.updated.json', '--schema', 'examples/order.schema.json').status, 1);
  assert.equal(cli('mcp').status, 2);
  assert.equal(cli('inspect', 'examples/order.created.json', '--output', 'never.json').status, 2);
  assert.equal(cli('inspect', '--unknown=secret-value').status, 2);
  assert.ok(!cli('inspect', '--unknown=secret-value').stderr.includes('secret-value'));
});

test('redact CLI does not print payload and refuses overwrite', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lens-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'redacted.json');
  const result = cli('redact', 'examples/order.created.json', '--output', output);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes('alex@example.test'));
  const data = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(data.customer.email, '[REDACTED]');
  assert.equal(data.metadata.apiToken, '[REDACTED]');
  assert.equal(cli('redact', 'examples/order.created.json', '--output', output).status, 2);
});
