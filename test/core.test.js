import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPayload, comparePayloads, formatMarkdownComparison, redactPayload, validatePayload } from '../src/core.js';

const byPath = result => new Map(result.paths.map(record => [record.path, record]));

test('inspection aggregates nested heterogeneous arrays and counts absent object fields', () => {
  const result = inspectPayload({ orders: [{ id: 12, extra: null }, { id: 'sample-secret' }, null, []], ok: true });
  const paths = byPath(result);
  assert.deepEqual(paths.get('/orders/*').types, ['null', 'array', 'object']);
  assert.deepEqual(paths.get('/orders/*/id').types, ['number', 'string']);
  assert.equal(paths.get('/orders/*/id').occurrences, 2);
  assert.equal(paths.get('/orders/*/id').missingInObjectSamples, 0);
  assert.equal(paths.get('/orders/*/extra').missingInObjectSamples, 1);
  assert.equal(result.nodeCount, 10);
  assert.equal(result.maxDepth, 3);
  assert.ok(!JSON.stringify(result).includes('sample-secret'));
  assert.deepEqual(result.paths.map(record => record.path), [...paths.keys()].sort());
});

test('inspection is deterministic regardless of object insertion order', () => {
  assert.deepEqual(inspectPayload({ b: 1, a: { z: false } }), inspectPayload({ a: { z: false }, b: 1 }));
});

test('JSON Pointer escaping, root values and empty containers remain visible', () => {
  assert.deepEqual(inspectPayload(null).paths, [{ path: '', types: ['null'], occurrences: 1, missingInObjectSamples: 0 }]);
  const paths = byPath(inspectPayload({ 'a/b': { '~token': [] }, empty: {} }));
  assert.deepEqual(paths.get('/a~1b/~0token').types, ['array']);
  assert.equal(paths.has('/a~1b/~0token/*'), false);
  assert.deepEqual(paths.get('/empty').types, ['object']);
});

test('comparison reports observed paths and type drift without any sample values', () => {
  const result = comparePayloads({ event: 'sensitive-before', old: 1, items: [{ a: null }] }, { event: 42, added: false, items: [{ a: 'sensitive-after' }] });
  assert.deepEqual(result, {
    added: ['/added'],
    removed: ['/old'],
    typeChanged: [
      { path: '/event', before: ['string'], after: ['number'] },
      { path: '/items/*/a', before: ['null'], after: ['string'] },
    ],
  });
  assert.ok(!JSON.stringify(result).includes('sensitive-'));
});

test('formatMarkdownComparison formats drift correctly, handles empty sections, and escapes Markdown/HTML', () => {
  const emptyDrift = { added: [], removed: [], typeChanged: [] };
  const emptyReport = formatMarkdownComparison(emptyDrift);
  assert.ok(emptyReport.includes('### Webhook Structural Comparison Report'));
  assert.ok(emptyReport.includes('> **Notice:** This comparison describes structural differences'));
  assert.ok(emptyReport.includes('- **Added paths:** 0'));
  assert.ok(emptyReport.includes('- **Removed paths:** 0'));
  assert.ok(emptyReport.includes('- **Type changes:** 0'));
  assert.ok(emptyReport.includes('#### Added\n_None_'));
  assert.ok(emptyReport.includes('#### Removed\n_None_'));
  assert.ok(emptyReport.includes('#### Type Changes\n_None_'));

  const complexDrift = {
    added: ['/<script>alert(1)</script>', '/markdown_*_bold/[0]'],
    removed: ['/items/*/price_$_total'],
    typeChanged: [
      { path: '/unicode/Türkçe_çşğ', before: ['string'], after: ['number', 'null'] },
      { path: '/table|pipe|break', before: ['boolean'], after: ['array'] },
    ],
  };
  const report = formatMarkdownComparison(complexDrift);
  assert.ok(!report.includes('<script>'));
  assert.ok(report.includes('\\<script\\>alert\\(1\\)\\<\\/script\\>'));
  assert.ok(report.includes('\\*'));
  assert.ok(report.includes('\\|'));
  assert.ok(report.includes('Türkçe\\_çşğ'));
  assert.ok(report.includes('`number, null`'));
  assert.ok(report.includes('| Path | Baseline | Candidate |'));
});

test('redaction recognizes camelCase, snake_case, kebab-case and explicit custom keys', () => {
  const source = {
    accessToken: 'token-raw', APIKey: 'key-raw', 'client-secret': 'secret-raw',
    full_name: 'person-raw', billingAddress: { city: 'city-raw' },
    nationalId: 12345, tckn: 'id-raw', phoneNumber: 'phone-raw',
    customerCode: 'customer-raw', status: 'ok', monkey: 'still-here',
  };
  const redacted = redactPayload(source, ['CUSTOMERCODE']);
  for (const key of Object.keys(source).filter(key => !['status', 'monkey'].includes(key))) {
    assert.equal(redacted[key], '[REDACTED]', key);
  }
  assert.equal(redacted.status, 'ok');
  assert.equal(redacted.monkey, 'still-here');
  assert.equal(source.billingAddress.city, 'city-raw');
  assert.ok(inspectPayload(source).sensitivePaths.some(record => record.path === '/APIKey'));
});

test('redaction detects common secret and email strings inside arrays and arbitrary fields', () => {
  const source = ['hello person@example.test', 'Bearer abc.def-secret', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature', 3, null];
  assert.deepEqual(redactPayload(source), ['[REDACTED]', '[REDACTED]', '[REDACTED]', 3, null]);
  const sensitive = inspectPayload(source).sensitivePaths;
  assert.deepEqual(sensitive, [{ path: '/*', reasons: ['bearer-like-value', 'email-like-value', 'jwt-like-value'] }]);
  assert.equal(redactPayload('ordinary public message'), 'ordinary public message');
});

test('magic property names are preserved as data without prototype pollution', () => {
  const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"isAdmin":true}},"toString":"safe"}');
  const result = redactPayload(source);
  assert.ok(Object.hasOwn(result, '__proto__'));
  assert.deepEqual(result.__proto__, { polluted: true });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal({}.polluted, undefined);
  assert.equal({}.isAdmin, undefined);
  assert.ok(byPath(inspectPayload(source)).has('/__proto__/polluted'));
  assert.equal(validatePayload(source, { type: 'object' }).valid, true);
});

test('draft-07 validation supports local refs and does not coerce, insert defaults or remove keys', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: { count: { type: 'integer', minimum: 1 } },
    type: 'object', required: ['count'],
    properties: { count: { $ref: '#/definitions/count' }, label: { type: 'string', default: 'hello' } },
    additionalProperties: false,
  };
  const value = { count: '12', unexpected: 'sensitive-extra' };
  const snapshot = structuredClone(value);
  const schemaSnapshot = structuredClone(schema);
  const result = validatePayload(value, schema);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map(error => error.keyword).sort(), ['additionalProperties', 'type']);
  assert.deepEqual(value, snapshot);
  assert.deepEqual(schema, schemaSnapshot);
  assert.ok(!JSON.stringify(result).includes('sensitive-extra'));
  assert.deepEqual(validatePayload({ count: 1 }, schema), { valid: true, errors: [], truncated: false });
  assert.equal(validatePayload({ count: 2 }, { ...schema, $schema: 'https://json-schema.org/draft-07/schema' }).valid, true);
});

test('validation diagnostics exclude values, custom messages, schema literals and error params', () => {
  const value = { payload: 'private-value' };
  const result = validatePayload(value, {
    properties: { payload: { const: 'private-schema-literal', description: 'private-description' } },
  });
  assert.deepEqual(result.errors, [{ instancePath: '/payload', keyword: 'const', schemaPath: '#/properties/payload/const' }]);
  assert.ok(!JSON.stringify(result).includes('private-'));
  assert.equal(validatePayload(null, true).valid, true);
  assert.equal(validatePayload(null, false).valid, false);
});

test('unknown refs, remote refs, unsupported drafts/formats and invalid schemas fail safely', () => {
  const cases = [
    [{ $ref: '#/definitions/private-secret' }, 'INVALID_SCHEMA'],
    [{ $ref: 'https://private-secret.test/schema' }, 'UNSUPPORTED_REFERENCE'],
    [{ $schema: 'https://private-secret.test/draft/2020-12/schema' }, 'UNSUPPORTED_DRAFT'],
    [{ $schema: { toString: 'private-secret' } }, 'UNSUPPORTED_DRAFT'],
    [{ properties: { contact: { format: 'email' } } }, 'UNSUPPORTED_FORMAT'],
    [{ $async: true, type: 'string' }, 'UNSUPPORTED_ASYNC_SCHEMA'],
    [{ definitions: { task: { $async: false } } }, 'UNSUPPORTED_ASYNC_SCHEMA'],
    [{ requireds: ['private-secret'] }, 'INVALID_SCHEMA'],
    [{ dependentRequired: { field: ['private-secret'] } }, 'INVALID_SCHEMA'],
    [{ type: 'string', nullable: true }, 'INVALID_SCHEMA'],
    [{ $ref: '#/examples/0', examples: [{ type: 'string', nullable: true }] }, 'INVALID_SCHEMA'],
    [{ $ref: '#/examples/0', examples: [{ type: 'string', format: 'email' }] }, 'UNSUPPORTED_FORMAT'],
    [{ $ref: '#/examples/0', examples: [{ $async: true, type: 'string' }] }, 'UNSUPPORTED_ASYNC_SCHEMA'],
    [{ $ref: '#/examples/0', examples: [{ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'string' }] }, 'UNSUPPORTED_DRAFT'],
    [{ $ref: '#/examples/0', examples: [{ $ref: 'http://json-schema.org/draft-07/schema' }] }, 'UNSUPPORTED_REFERENCE'],
    [{ type: 'private-secret' }, 'INVALID_SCHEMA'],
    [null, 'INVALID_SCHEMA'],
  ];
  for (const [schema, code] of cases) {
    assert.throws(() => validatePayload({}, schema), error => error.code === code && !error.message.includes('private-secret'));
  }
});

test('schema const data is not mistaken for schema keywords', () => {
  const data = { format: 'anything', $ref: 'https://example.test/data', $schema: 'data' };
  assert.equal(validatePayload(data, { const: data }).valid, true);
});

test('validation errors are capped and explicitly indicate truncation', () => {
  const result = validatePayload(Array.from({ length: 80 }, () => false), { type: 'array', items: { type: 'number' } });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 50);
  assert.equal(result.truncated, true);
});

test('depth and node limits reject oversized data with sanitized errors', () => {
  let exactDepth = null;
  for (let i = 0; i < 64; i++) exactDepth = [exactDepth];
  assert.equal(inspectPayload(exactDepth).maxDepth, 64);
  assert.throws(() => inspectPayload([exactDepth]), { code: 'LIMIT_EXCEEDED' });
  assert.throws(() => redactPayload(Array.from({ length: 100_000 }, () => 0)), { code: 'LIMIT_EXCEEDED' });
  assert.throws(() => validatePayload({}, { const: [exactDepth] }), { code: 'LIMIT_EXCEEDED' });
});

test('cycles, sparse arrays, non-finite numbers and accessors are rejected without executing getters', () => {
  const cyclic = {}; cyclic.self = cyclic;
  const accessor = { get token() { throw new Error('private-secret'); } };
  for (const value of [cyclic, new Array(2), NaN, Infinity, undefined, new Date(), accessor]) {
    assert.throws(() => inspectPayload(value), error => error.code === 'INVALID_JSON_VALUE' && !error.message.includes('private-secret'));
  }
  assert.throws(() => redactPayload({}, ['safe', 42]), { code: 'INVALID_REDACTION_KEYS' });
  assert.deepEqual(redactPayload(Object.assign(Object.create(null), { status: 'ok' })), { status: 'ok' });
});
