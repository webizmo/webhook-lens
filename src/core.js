import Ajv from 'ajv';

const MAX_DEPTH = 64;
const MAX_NODES = 100_000;
const MAX_ERRORS = 50;
const REDACTED = '[REDACTED]';
const TYPE_ORDER = ['null', 'boolean', 'number', 'string', 'array', 'object'];
const SENSITIVE_WORDS = new Set([
  'authorization', 'auth', 'password', 'passwd', 'pwd', 'passphrase',
  'token', 'secret', 'key', 'apikey', 'credential', 'credentials',
  'cookie', 'cookies', 'sessionid', 'signature', 'email', 'mail',
  'phone', 'telephone', 'mobile', 'address', 'name', 'firstname',
  'lastname', 'fullname', 'ssn', 'nationalid', 'nationalidentifier',
  'passport', 'tckn', 'kimlik', 'iban', 'creditcard', 'cardnumber',
  'bankaccount', 'cvv', 'cvc', 'dob', 'birthdate', 'birthday', 'ip',
  'ipaddress', 'postalcode', 'zipcode', 'socialsecuritynumber',
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function typeOf(value) {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

function escapePointer(key) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

// Inspect descriptors rather than invoking getters. Public functions accept JSON
// trees, including JSON.parse objects with an own "__proto__" property.
function checkJson(value, label = 'Payload') {
  const stack = [{ value, depth: 0, exit: false }];
  const ancestors = new WeakSet();
  let nodeCount = 0;
  let maxDepth = 0;
  while (stack.length) {
    const current = stack.pop();
    if (current.exit) {
      ancestors.delete(current.value);
      continue;
    }
    if (++nodeCount > MAX_NODES || current.depth > MAX_DEPTH) {
      fail('LIMIT_EXCEEDED', `${label} exceeds the limit of 100000 nodes or 64 nesting levels.`);
    }
    maxDepth = Math.max(maxDepth, current.depth);
    const item = current.value;
    const type = typeOf(item);
    if (type === 'null' || type === 'string' || type === 'boolean') continue;
    if (type === 'number' && Number.isFinite(item)) continue;
    if (type !== 'object' && type !== 'array') {
      fail('INVALID_JSON_VALUE', `${label} must contain only JSON-compatible values.`);
    }
    if (type === 'object' && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) {
      fail('INVALID_JSON_VALUE', `${label} must contain only plain JSON objects.`);
    }
    if (ancestors.has(item)) fail('INVALID_JSON_VALUE', `${label} must not contain cycles.`);
    ancestors.add(item);
    stack.push({ value: item, exit: true });
    const keys = Reflect.ownKeys(item);
    if (keys.length > MAX_NODES + 1 || (type === 'array' && item.length > MAX_NODES)) {
      fail('LIMIT_EXCEEDED', `${label} exceeds the limit of 100000 nodes or 64 nesting levels.`);
    }
    let arrayEntries = 0;
    for (const key of keys) {
      if (type === 'array' && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        fail('INVALID_JSON_VALUE', `${label} must contain only ordinary JSON properties.`);
      }
      if (type === 'array') {
        if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= item.length) {
          fail('INVALID_JSON_VALUE', `${label} must contain only ordinary JSON arrays.`);
        }
        arrayEntries++;
      }
      stack.push({ value: descriptor.value, depth: current.depth + 1, exit: false });
    }
    if (type === 'array' && arrayEntries !== item.length) {
      fail('INVALID_JSON_VALUE', `${label} must not contain sparse arrays.`);
    }
  }
  return { nodeCount, maxDepth };
}

function keyIsSensitive(key, extraKeys = new Set()) {
  const lower = key.toLowerCase();
  if (extraKeys.has(lower)) return true;
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/);
  return words.some(word => SENSITIVE_WORDS.has(word)) || SENSITIVE_WORDS.has(words.join(''));
}

function valueReasons(value) {
  if (typeof value !== 'string') return [];
  const reasons = [];
  // Bounded token lengths keep these heuristics cheap on long arbitrary strings.
  if (value.includes('@') && /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Z0-9-]{1,63}(?:\.[A-Z0-9-]{1,63}){1,5}/i.test(value)) {
    reasons.push('email-like-value');
  }
  if (/(?:^|\s)bearer\s+[A-Za-z0-9._~+\/-]{1,1024}/i.test(value)) reasons.push('bearer-like-value');
  if (/(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{3,4096}\.[A-Za-z0-9_-]{1,4096}\.[A-Za-z0-9_-]{1,4096}(?:$|[^A-Za-z0-9_-])/.test(value)) {
    reasons.push('jwt-like-value');
  }
  return reasons;
}

/** Inspect observations only: never return scalar values or examples. */
export function inspectPayload(value) {
  const summary = checkJson(value);
  const paths = new Map();
  const sensitive = new Map();
  const objectCounts = new Map();
  const propertyCounts = new Map();
  const stack = [{ value, path: '', key: null }];
  while (stack.length) {
    const current = stack.pop();
    let record = paths.get(current.path);
    if (!record) {
      record = { types: new Set(), occurrences: 0 };
      paths.set(current.path, record);
    }
    const type = typeOf(current.value);
    record.types.add(type);
    record.occurrences++;
    const reasons = valueReasons(current.value);
    if (current.key !== null && keyIsSensitive(current.key)) reasons.push('sensitive-key');
    if (reasons.length) {
      const existing = sensitive.get(current.path) ?? new Set();
      reasons.forEach(reason => existing.add(reason));
      sensitive.set(current.path, existing);
    }
    if (type === 'array') {
      for (const item of current.value) stack.push({ value: item, path: `${current.path}/*`, key: null });
    } else if (type === 'object') {
      objectCounts.set(current.path, (objectCounts.get(current.path) ?? 0) + 1);
      for (const [key, item] of Object.entries(current.value)) {
        const path = `${current.path}/${escapePointer(key)}`;
        const property = propertyCounts.get(path) ?? { parent: current.path, count: 0 };
        property.count++;
        propertyCounts.set(path, property);
        stack.push({ value: item, path, key });
      }
    }
  }
  const sortPaths = (a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  return {
    ...summary,
    paths: [...paths].sort(sortPaths).map(([path, record]) => {
      const property = propertyCounts.get(path);
      return {
        path,
        types: TYPE_ORDER.filter(type => record.types.has(type)),
        occurrences: record.occurrences,
        missingInObjectSamples: property ? Math.max(0, objectCounts.get(property.parent) - property.count) : 0,
      };
    }),
    sensitivePaths: [...sensitive].sort(sortPaths).map(([path, reasons]) => ({ path, reasons: [...reasons].sort() })),
  };
}

/** Differences between samples are observations, not compatibility guarantees. */
export function comparePayloads(before, after) {
  const previous = new Map(inspectPayload(before).paths.map(item => [item.path, item.types]));
  const next = new Map(inspectPayload(after).paths.map(item => [item.path, item.types]));
  return {
    added: [...next.keys()].filter(path => !previous.has(path)),
    removed: [...previous.keys()].filter(path => !next.has(path)),
    typeChanged: [...next].filter(([path, types]) => previous.has(path) && types.join() !== previous.get(path).join())
      .map(([path, types]) => ({ path, before: previous.get(path), after: types })),
  };
}

/** Best-effort masking. Review the returned fixture before sharing it. */
export function redactPayload(value, extraKeys = []) {
  checkJson(value);
  if (!Array.isArray(extraKeys) || extraKeys.length > 1000 || extraKeys.some(key => typeof key !== 'string')) {
    fail('INVALID_REDACTION_KEYS', 'Extra redaction keys must be an array of at most 1000 strings.');
  }
  const additional = new Set(extraKeys.map(key => key.toLowerCase()));
  function copy(item, key = null) {
    if ((key !== null && keyIsSensitive(key, additional)) || valueReasons(item).length) return REDACTED;
    if (Array.isArray(item)) return item.map(child => copy(child));
    if (item !== null && typeof item === 'object') {
      const output = {};
      for (const [childKey, child] of Object.entries(item)) {
        Object.defineProperty(output, childKey, { value: copy(child, childKey), enumerable: true, writable: true, configurable: true });
      }
      return output;
    }
    return item;
  }
  return copy(value);
}

const SINGLE_SCHEMAS = ['additionalItems', 'additionalProperties', 'contains', 'else', 'if', 'not', 'propertyNames', 'then'];
const ARRAY_SCHEMAS = ['allOf', 'anyOf', 'oneOf'];
const MAP_SCHEMAS = ['definitions', '$defs', 'properties', 'patternProperties', 'dependencies'];

function checkSchema(schema) {
  checkJson(schema, 'Schema');
  if (typeof schema !== 'boolean' && (schema === null || typeof schema !== 'object' || Array.isArray(schema))) {
    fail('INVALID_SCHEMA', 'Schema must be a draft-07 schema object or boolean.');
  }
  const stack = [{ node: schema, resource: schema }];
  const visited = new WeakMap();
  while (stack.length) {
    const entry = stack.pop();
    const current = entry.node;
    if (current === null || typeof current !== 'object' || Array.isArray(current)) continue;
    const resource = typeof current.$id === 'string' && current.$id.length && !current.$id.startsWith('#') ? current : entry.resource;
    const resources = visited.get(current) ?? new Set();
    if (resources.has(resource)) continue;
    resources.add(resource);
    visited.set(current, resources);
    const enqueue = node => stack.push({ node, resource });
    if (Object.hasOwn(current, '$async')) {
      fail('UNSUPPORTED_ASYNC_SCHEMA', 'Asynchronous schemas are not supported.');
    }
    if (Object.hasOwn(current, '$schema') && (typeof current.$schema !== 'string' || !/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/.test(current.$schema))) {
      fail('UNSUPPORTED_DRAFT', 'Only JSON Schema draft-07 is supported.');
    }
    if (Object.hasOwn(current, '$ref') && (typeof current.$ref !== 'string' || !current.$ref.startsWith('#'))) {
      fail('UNSUPPORTED_REFERENCE', 'Only local fragment schema references are supported; remote references are disabled.');
    }
    if (typeof current.$ref === 'string') {
      let pointer;
      try { pointer = decodeURIComponent(current.$ref.slice(1)); }
      catch { fail('INVALID_SCHEMA', 'Schema contains an invalid local reference.'); }
      // A reference may make an annotation or const object act as a schema.
      // Follow those targets too; ordinary annotation data stays untouched.
      if (pointer === '') enqueue(resource);
      else if (pointer.startsWith('/')) {
        let target = resource;
        for (const token of pointer.slice(1).split('/')) {
          if (/~(?![01])/.test(token)) fail('INVALID_SCHEMA', 'Schema contains an invalid local reference.');
          const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
          if (target === null || typeof target !== 'object' || !Object.hasOwn(target, key)) {
            target = undefined;
            break;
          }
          target = target[key];
        }
        if (target !== undefined) enqueue(target);
      }
    }
    if (Object.hasOwn(current, 'format')) {
      fail('UNSUPPORTED_FORMAT', 'Schema format validation is not supported. Remove format or use another validator.');
    }
    for (const keyword of SINGLE_SCHEMAS) if (Object.hasOwn(current, keyword)) enqueue(current[keyword]);
    if (Object.hasOwn(current, 'items')) (Array.isArray(current.items) ? current.items : [current.items]).forEach(enqueue);
    for (const keyword of ARRAY_SCHEMAS) if (Array.isArray(current[keyword])) current[keyword].forEach(enqueue);
    for (const keyword of MAP_SCHEMAS) {
      const map = current[keyword];
      if (map !== null && typeof map === 'object' && !Array.isArray(map)) Object.values(map).forEach(enqueue);
    }
  }
}

/** Validate without coercion, defaults, mutation, or raw values in diagnostics. */
export function validatePayload(value, schema) {
  checkJson(value);
  checkSchema(schema);
  try {
    const ajv = new Ajv({
      strict: false,
      strictSchema: true,
      allErrors: true,
      ownProperties: true,
      validateFormats: true,
      messages: false,
      verbose: false,
      coerceTypes: false,
      useDefaults: false,
      removeAdditional: false,
      inlineRefs: false,
      logger: false,
    });
    // Ajv supports OpenAPI's nullable extension by default. Removing it makes
    // strictSchema reject it even when a $ref targets an annotation's contents.
    ajv.removeKeyword('nullable');
    // Ajv registers the HTTP spelling; both official draft-07 URLs are accepted.
    ajv.addMetaSchema(ajv.getSchema('http://json-schema.org/draft-07/schema').schema, 'https://json-schema.org/draft-07/schema');
    const validate = ajv.compile(schema);
    const valid = validate(value);
    if (typeof valid !== 'boolean') {
      // Defensive guard: a future validator change must never expose a Promise.
      // A rejection handler also prevents private Ajv errors becoming unhandled.
      if (valid && typeof valid.catch === 'function') valid.catch(() => {});
      fail('INVALID_SCHEMA', 'Schema validation must return a synchronous result.');
    }
    const errors = validate.errors ?? [];
    return {
      valid,
      errors: errors.slice(0, MAX_ERRORS).map(error => ({
        instancePath: error.instancePath,
        keyword: error.keyword,
        schemaPath: error.schemaPath,
      })),
      truncated: errors.length > MAX_ERRORS,
    };
  } catch {
    fail('INVALID_SCHEMA', 'Schema could not be compiled or evaluated. Check draft-07 syntax and local references.');
  }
}
