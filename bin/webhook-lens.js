#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { inspectPayload, comparePayloads, redactPayload } from '../src/core.js';
import { readJson, writeNewJson } from '../src/io.js';
import { validateBounded } from '../src/validate.js';

const HELP = `Webhook Lens 0.1.0 — understand webhook JSON before handing it to Claude.

Usage:
  webhook-lens inspect <payload.json>
  webhook-lens compare <before.json> <after.json> [--fail-on-drift]
  webhook-lens redact <payload.json> --output <new.json> [--keys email,customField]
  webhook-lens validate <payload.json> --schema <schema.json>
  webhook-lens demo
  webhook-lens mcp --root <fixture-directory>

JSON reports contain paths/types/counts, not raw scalar values. Redaction is
best-effort and must be reviewed before sharing. MCP never returns redacted
payload values. Files must be local .json files, up to 2 MiB each.
Exit codes: 0 success; 1 invalid fixture / --fail-on-drift; 2 usage/input error.
`;

function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function needCount(args, n) { if (args.length !== n) throw new Error('Incorrect arguments. Run webhook-lens --help.'); }

try {
  let parsed;
  try {
    parsed = parseArgs({ allowPositionals: true, options: {
      output: { type: 'string' }, keys: { type: 'string' }, schema: { type: 'string' },
      root: { type: 'string' }, 'fail-on-drift': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' }
    } });
  } catch {
    throw new Error('Invalid command options. Run webhook-lens --help.');
  }
  const { values, positionals: [command, ...args] } = parsed;
  if (values.version) process.stdout.write('0.1.0\n');
  else if (values.help || !command) process.stdout.write(HELP);
  else {
    const allowed = { inspect: [], compare: ['fail-on-drift'], redact: ['output', 'keys'], validate: ['schema'], mcp: ['root'], demo: [] };
    if (!Object.hasOwn(allowed, command)) throw new Error('Unknown command. Run webhook-lens --help.');
    if (Object.keys(values).some(key => !allowed[command].includes(key))) throw new Error('This option is not supported for the selected command.');
    if (command === 'inspect') {
      needCount(args, 1); print(inspectPayload(await readJson(args[0])));
    } else if (command === 'compare') {
      needCount(args, 2);
      const result = comparePayloads(await readJson(args[0]), await readJson(args[1]));
      print(result);
      if (values['fail-on-drift'] && (result.added.length || result.removed.length || result.typeChanged.length)) process.exitCode = 1;
    } else if (command === 'redact') {
      needCount(args, 1);
      if (!values.output) throw new Error('Redaction requires --output pointing to a new file.');
      const result = redactPayload(await readJson(args[0]), values.keys?.split(',').map(key => key.trim()).filter(Boolean) ?? []);
      await writeNewJson(values.output, result);
      print({ written: true, warning: 'Best-effort redaction. Review the new file locally before sharing; unrecognized sensitive data may remain.' });
    } else if (command === 'validate') {
      needCount(args, 1);
      if (!values.schema) throw new Error('Validation requires --schema pointing to a local draft-07 JSON Schema.');
      const result = await validateBounded(await readJson(args[0]), await readJson(values.schema));
      print(result); if (!result.valid) process.exitCode = 1;
    } else if (command === 'demo') {
      needCount(args, 0);
      const example = name => fileURLToPath(new URL(`../examples/${name}`, import.meta.url));
      const before = await readJson(example('order.created.json'));
      const after = await readJson(example('order.updated.json'));
      const schema = await readJson(example('order.schema.json'));
      print({ project: 'Webhook Lens', fixture: 'Synthetic order webhook',
        inspection: inspectPayload(before), drift: comparePayloads(before, after),
        validation: { before: await validateBounded(before, schema), after: await validateBounded(after, schema) }
      });
    } else if (command === 'mcp') {
      needCount(args, 0);
      if (!values.root) throw new Error('MCP requires --root pointing to a fixture directory.');
      const { serve } = await import('../src/mcp.js');
      await serve(values.root);
    }
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
  process.exitCode = 2;
}
