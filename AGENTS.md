# Repository guidance

Webhook Lens is a Node.js 22+ ES-module CLI and MCP server for inspecting local JSON payload structure. It runs without a build step.

## Workflows

- Install: `npm ci`
- Tests: `npm test`
- Example smoke check: `node bin/webhook-lens.js demo`
- CLI entrypoint: `bin/webhook-lens.js`

Read the relevant implementation and tests before editing. Keep changes focused and preserve unrelated work.

## Product boundaries

- Do not claim live webhook capture or replay support.
- MCP exposes structural inspection, comparison, and local schema validation only. It must not return raw payload values.
- Treat key names and paths as potentially sensitive metadata.
- Preserve root containment across paths, symlinks, and schema references.
- Keep payload processing offline; do not fetch remote schemas.
- Redaction is explicit, best effort, CLI-only, and writes to a separate new file.
- Do not add telemetry or external uploads as part of unrelated work.

## Validation and documentation

For behavior changes, add relevant regression coverage and run `npm test` plus the demo. Test boundary failures with synthetic data. Keep README commands and MCP tool names aligned with implementation.

Never commit production payloads, customer information, access tokens, or private operational details. Report tests actually run and any unresolved limitations; do not imply real-provider acceptance from synthetic fixtures.
