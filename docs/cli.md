# CLI reference

The CLI requires Node.js 22 or newer. Commands return JSON to make results useful in scripts as well as terminals.

Run from the repository after `npm ci`:

```sh
node bin/webhook-lens.js <command>
```

## Inspect

```sh
node bin/webhook-lens.js inspect examples/order.created.json
```

Inspect the structural shape of a JSON document. Fields include paths, types, occurrence counts, and `missingInObjectSamples` where applicable. Occurrence information describes the sample; it is not a guarantee about future events.

## Compare

```sh
node bin/webhook-lens.js compare examples/order.created.json examples/order.updated.json
```

Compare structure and return `added`, `removed`, and `typeChanged` differences. The first argument is the baseline; the second is the candidate.

By default, finding drift is a successful inspection and exits with `0`. To fail a script when structural drift is found:

```sh
node bin/webhook-lens.js compare before.json after.json --fail-on-drift
```

This is a structural comparison. A price changing from `100` to `1000` can keep the same type and still have an important business effect.

## Validate

```sh
node bin/webhook-lens.js validate examples/order.created.json --schema examples/order.schema.json
```

Validate a payload against a local Draft-07 JSON Schema. Validation exits with `0` for a valid payload and `1` for an invalid payload. Invalid command arguments, file access failures, and other execution errors exit with `2`.

Only same-document schema fragment references such as `#/definitions/order` are supported. References to other local files or remote URLs are rejected. Unsupported `format` keywords are rejected rather than silently ignored. Validation runs in a bounded worker with a three-second execution timeout and a 128 MiB V8 old-generation heap limit. In MCP mode, the schema file is subject to the configured root boundary.

## Redact

```sh
node bin/webhook-lens.js redact input.json --output redacted.json
```

Redaction requires a separate output path and refuses to overwrite an existing file. New output files are created with mode `0600` where supported by the operating system.

Add project-specific sensitive key names with a comma-separated list:

```sh
node bin/webhook-lens.js redact input.json \
  --output redacted.json \
  --keys account_reference,internal_note
```

Review the resulting file before sharing it. Redaction cannot guarantee that every secret or personal detail is removed, especially from free text or unexpected field names.

## Demo

```sh
node bin/webhook-lens.js demo
```

Run inspection, comparison, and validation using the included synthetic fixtures. The demo does not contact a provider or receive a real webhook.

## MCP server

```sh
node bin/webhook-lens.js mcp --root /absolute/path/fixtures
```

Start the stdio MCP server. An explicit root is required. It accepts regular `.json` files under the configured root, with a maximum size of 2 MiB per file. It does not accept URLs.

This command is designed to be launched by an MCP client. See [the Claude guide](claude.md) for configuration.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Command succeeded; validation passed, or comparison completed without an enabled drift failure. |
| `1` | Schema validation failed, or structural drift was found with `--fail-on-drift`. |
| `2` | The command could not run successfully, such as invalid arguments, invalid JSON, or a file access failure. |
