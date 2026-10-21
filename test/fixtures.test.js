import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { comparePayloads, validatePayload } from '../src/core.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, '..', 'examples');

async function readJson(filename) {
  const content = await readFile(join(examplesDir, filename), 'utf8');
  return JSON.parse(content);
}

test('synthetic inventory.updated fixture pair demonstrates expected drift and schema validation', async () => {
  const v1 = await readJson('inventory.updated.v1.json');
  const v2 = await readJson('inventory.updated.v2.json');
  const schema = await readJson('inventory.schema.json');

  const drift = comparePayloads(v1, v2);

  // Assert drift outcomes:
  // - Added: /inventory/backorder_allowed
  // - Removed: /inventory/location, /inventory/location/aisle, /inventory/location/shelf
  // - Type changed: /inventory/available (from number/integer to string)
  assert.ok(drift.added.includes('/inventory/backorder_allowed'));
  assert.ok(drift.removed.includes('/inventory/location/aisle'));
  assert.ok(drift.removed.includes('/inventory/location/shelf'));

  const typeDrift = drift.typeChanged.find((t) => t.path === '/inventory/available');
  assert.ok(typeDrift, 'Expected /inventory/available to have type drift');
  assert.deepEqual(typeDrift.before, ['number']);
  assert.deepEqual(typeDrift.after, ['string']);

  // Assert schema outcomes:
  // - v1 satisfies schema
  // - v2 fails schema validation because available is a string instead of integer
  const valV1 = validatePayload(v1, schema);
  assert.equal(valV1.valid, true);

  const valV2 = validatePayload(v2, schema);
  assert.equal(valV2.valid, false);
  assert.ok(valV2.errors.some((e) => e.instancePath === '/inventory/available' && e.keyword === 'type'));
});

test('synthetic refund.created fixture pair demonstrates expected drift and schema validation', async () => {
  const v1 = await readJson('refund.created.v1.json');
  const v2 = await readJson('refund.created.v2.json');
  const schema = await readJson('refund.schema.json');

  const drift = comparePayloads(v1, v2);

  // Assert drift outcomes:
  // - Added: /refund/status
  // - Removed: /refund/breakdown, /refund/breakdown/item_total, /refund/breakdown/tax_refunded
  // - Type changed: /refund/amount (from number to string)
  assert.ok(drift.added.includes('/refund/status'));
  assert.ok(drift.removed.includes('/refund/breakdown/item_total'));
  assert.ok(drift.removed.includes('/refund/breakdown/tax_refunded'));

  const typeDrift = drift.typeChanged.find((t) => t.path === '/refund/amount');
  assert.ok(typeDrift, 'Expected /refund/amount to have type drift');
  assert.deepEqual(typeDrift.before, ['number']);
  assert.deepEqual(typeDrift.after, ['string']);

  // Assert schema outcomes:
  // - v1 satisfies schema
  // - v2 fails schema validation because amount is a string instead of number
  const valV1 = validatePayload(v1, schema);
  assert.equal(valV1.valid, true);

  const valV2 = validatePayload(v2, schema);
  assert.equal(valV2.valid, false);
  assert.ok(valV2.errors.some((e) => e.instancePath === '/refund/amount' && e.keyword === 'type'));
});
