import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBounded } from '../src/validate.js';

test('schema execution timeout terminates catastrophic regular expressions', async () => {
  const value = 'a'.repeat(60) + '!';
  const start = Date.now();
  await assert.rejects(validateBounded(value, { type: 'string', pattern: '^(a+)+$' }, { timeoutMs: 500 }), /time limit/);
  assert.ok(Date.now() - start < 5000);
});
