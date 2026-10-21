# Use Webhook Lens with Claude

Webhook Lens runs as a local MCP server over standard input/output. Claude can request a structural inspection, a comparison, or a schema validation. The server exposes no raw-value reader and no redaction tool.

## 1. Install and try the fixtures

Install Node.js 22 or newer, then:

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci
node bin/webhook-lens.js demo
```

No npm package publication is required for this setup. Use the checked-out entrypoint directly.

## 2. Choose a narrow root

Create a dedicated directory for reviewed fixtures and schemas. A useful layout is:

```text
webhook-fixtures/
  order.before.json
  order.after.json
  order.schema.json
```

Use synthetic data while learning the workflow. For real samples, review their field names as well as their values. Put only the files intended for this workflow in the root; do not point it at your home directory or an entire application repository.

## 3. Connect Claude Code

Replace both placeholder paths with absolute paths on your computer:

```sh
claude mcp add --transport stdio webhook-lens -- \
  node /absolute/path/webhook-lens/bin/webhook-lens.js mcp \
  --root /absolute/path/webhook-fixtures
```

Use Claude Code's MCP management interface to verify that the server connects. Node must be available to the process launching Claude. If a desktop client cannot locate `node`, use its absolute executable path in the configuration.

For an MCP client that accepts a JSON `mcpServers` configuration, the equivalent server entry is:

```json
{
  "mcpServers": {
    "webhook-lens": {
      "command": "node",
      "args": [
        "/absolute/path/webhook-lens/bin/webhook-lens.js",
        "mcp",
        "--root",
        "/absolute/path/webhook-fixtures"
      ]
    }
  }
}
```

Follow your client's instructions for its configuration location. Restart or reconnect the client after changing its server configuration. No credentials belong in this configuration.

## 4. Try a focused conversation

Ask:

> Inspect `order.before.json` using Webhook Lens. Summarize its fields and types without guessing what the values are.

Then:

> Compare `order.before.json` with `order.after.json`. Group the structural changes into added fields, removed fields, and type changes. Explain which handler assumptions deserve review; do not claim compatibility from these samples alone.

Finally:

> Validate `order.after.json` against `order.schema.json`. Explain the failing paths and propose changes for review. Do not change the schema merely to make validation pass.

The available tools are:

| Tool | Arguments | Result scope |
| --- | --- | --- |
| `inspect_payload` | `file` | Field paths, types, counts, and structural metadata. |
| `compare_payloads` | `before`, `after` | Structural differences between two samples. |
| `validate_payload` | `file`, `schema` | Validation status and metadata about validation failures. |

Use paths relative to the configured root. Keep the schema under that root as well. Only same-document schema fragment references such as `#/definitions/order` are supported. References to other local files or remote URLs are rejected. Only JSON files inside the permitted directory can be accessed.

## What leaves the local tool?

Webhook Lens processes the files locally. It sends its tool results back to the MCP client, and the client can send them to Claude. A local tool does **not** make the whole conversation offline.

Tool results omit raw payload values, but field names, paths, types, counts, and schema validation details may reveal business information. An object that uses a customer email as a key, for example, can expose that email in a field path. Review files before making them available.

Your MCP root limits this server's file access; it is not an operating-system sandbox. Use a trusted directory that a hostile local user cannot modify concurrently. It does not restrict other tools your Claude client may have, such as a terminal or a general-purpose file reader.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Server does not connect | Confirm Node.js 22+, run `npm ci`, and check the absolute entrypoint path. |
| File cannot be accessed | Check the root, the relative file path, and the `.json` extension. |
| A schema cannot resolve a reference | Use only same-document `#/...` references; references to other local files and remote schemas are not supported. |
| Comparison misses a behavioral change | The tool compares structure. Value changes with the same type can still affect behavior. |
| Output has no payload values | This is the intended MCP boundary. Review original data locally with your own editor. |

For reproducible bugs, open an issue with synthetic fixtures and your Node version. Never attach production payloads or secrets to a public issue.
