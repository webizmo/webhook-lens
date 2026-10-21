<p align="center">
  <img src="assets/webhook-lens.svg" alt="Webhook Lens by Webizmo. Inspect JSON payloads, compare structural drift, and work with Claude through MCP." width="100%">
</p>

# Webhook Lens

[![CI](https://github.com/webizmo/webhook-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/webizmo/webhook-lens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-68d6b3.svg)](LICENSE)

**See what changed in a webhook before you change your integration.**

Webhook Lens is a small, local-first JSON inspection toolkit with a CLI and an MCP server for Claude. Compare two payloads, find added or missing fields and type changes, and validate a payload against a JSON Schema—all without setting up a webhook endpoint.

[Quick start](#quick-start) · [Use with Claude](#use-with-claude) · [Data boundaries](#data-boundaries) · [Türkçe](README.tr.md)

## Why use it?

A provider changes `amount` from a number to a string. An optional field disappears. A nested object arrives as `null`. Your integration needs a clear description of the difference before it needs a fix.

Use Webhook Lens to:

- **Inspect a sample:** understand its field paths, types, and structure.
- **Compare samples:** spot additions, removals, and type changes.
- **Check a contract:** validate JSON against a local Draft-07 schema.
- **Give Claude structure:** expose a restricted fixture directory through MCP, with no raw-value read tool.
- **Prepare a redacted copy:** run explicit, best-effort redaction from the CLI before sharing a sample.

It works on JSON files you already have. It does not capture live webhooks or replay requests.

## Quick start

Requires **Node.js 22 or newer** and Git. Installation needs access to the npm registry; payload processing runs locally.

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci

# Try the included sample workflow.
node bin/webhook-lens.js demo

# Inspect field paths and types.
node bin/webhook-lens.js inspect examples/order.created.json

# Compare payload structure.
node bin/webhook-lens.js compare examples/order.created.json examples/order.updated.json

# Validate a payload against a local JSON Schema.
node bin/webhook-lens.js validate examples/order.created.json --schema examples/order.schema.json
```

The comparison above returns:

```json
{
  "added": ["/order/status"],
  "removed": ["/customer/phone"],
  "typeChanged": [
    { "path": "/order/total", "before": ["number"], "after": ["string"] }
  ]
}
```

The examples are synthetic. Start with them before using your own data. All CLI results are JSON; see the [CLI reference](docs/cli.md) for exit codes and options, or the [verification notes](docs/verification.md) for what has been exercised.

## Use with Claude

Add the MCP server to Claude Code using absolute paths:

```sh
claude mcp add --transport stdio webhook-lens -- \
  node /absolute/path/webhook-lens/bin/webhook-lens.js mcp \
  --root /absolute/path/fixtures
```

Create a dedicated fixture directory containing only the JSON samples and schemas you intend to make available. The root is a file-access boundary, not an operating-system sandbox. Use a trusted directory that a hostile local user cannot modify concurrently, and review the files you place there.

Then ask Claude:

> Use Webhook Lens to compare `order.before.json` and `order.after.json`. Explain the added, removed, and type-changed fields, and suggest which integration assumptions I should review.

| MCP tool | Purpose |
| --- | --- |
| `inspect_payload(file)` | Return structural metadata for a JSON file. |
| `compare_payloads(before, after)` | Compare the structure of two JSON files. |
| `validate_payload(file, schema)` | Check a JSON file against a local Draft-07 schema. |

MCP results contain paths, types, counts, and validation metadata. There is no MCP tool for reading raw payload values or redacting files. **Claude still receives the returned metadata:** field names and paths can themselves be sensitive.

See the [Claude setup guide](docs/claude.md) for configuration, a sample workflow, and troubleshooting.

## Redact before sharing

Redaction is an explicit CLI operation. Write a separate output file, then review it:

```sh
node bin/webhook-lens.js redact input.json --output redacted.json
```

The command refuses to overwrite an existing output file. Redaction is best effort; it is not an anonymization guarantee. Sensitive information can appear under unexpected keys or inside free text. Inspect the resulting file before sending it to another person or service.

## Data boundaries

- The toolkit processes local JSON; it does not require a hosted account or an API key.
- Payload processing does not send network requests. MCP clients control what they do with returned tool results.
- The MCP server requires an explicit root directory and restricts file access to JSON files under that root.
- JSON Schema validation supports Draft-07. Only same-document schema fragment references such as `#/definitions/order` are supported; other local files and remote schemas are not fetched.
- Structural comparisons do not prove that an integration is compatible. A changed value can matter even when the type stays the same.
- Sample inspection cannot prove that every event from a provider follows the same shape.

See [security and disclosure](SECURITY.md) for the trust boundaries and reporting guidance.

## Useful places to start

| Situation | Try this |
| --- | --- |
| A webhook handler broke after a provider update | Compare a known-working sample with the new sample. |
| You are writing an integration for a new event | Inspect a sample, then write a schema for the fields your handler needs. |
| You want Claude to help review payload drift | Put reviewed fixtures in a dedicated root and use the MCP tools. |
| You need to share a sample in an issue | Redact a copy, review it manually, and use synthetic data where possible. |

## Contribute

Bug reports with small synthetic fixtures are especially useful. See [CONTRIBUTING.md](CONTRIBUTING.md) for local development and [the issue forms](https://github.com/webizmo/webhook-lens/issues/new/choose) to report a bug or suggest an improvement.

If the toolkit helps you, a star makes the project easier to discover. Useful fixtures, clear bug reports, and focused pull requests help it improve.

## Built by Webizmo

Webizmo builds websites, business software, and API integrations. We maintain this toolkit to make integration work easier to inspect and discuss.

Need help turning a webhook into a reliable business workflow? [Work with Webizmo](https://webizmo.tr/api-entegrasyon?utm_source=github&utm_medium=referral&utm_campaign=webhook_lens&utm_content=readme).

Independent community project; not affiliated with or endorsed by Anthropic. Claude is an Anthropic product.

[MIT license](LICENSE).
