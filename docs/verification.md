# Verification notes

The initial `v0.1.0` implementation was checked on 22 October 2026 using synthetic fixtures. These checks verify the workflows described below; they do not establish compatibility with a live provider or the security of arbitrary data.

## Reproduce the local checks

With Node.js 22 or newer:

```sh
npm ci
npm run check
npm test
npm run demo
```

The initial local suite passed **22 tests**. The suite covers the core inspection, comparison, redaction, validation, and file-boundary behavior. The test suite is the current source of truth as the project changes.

The included comparison returns:

```json
{
  "added": ["/order/status"],
  "removed": ["/customer/phone"],
  "typeChanged": [
    { "path": "/order/total", "before": ["number"], "after": ["string"] }
  ]
}
```

## Claude Code MCP smoke check

An actual Claude Code session connected to the local stdio MCP server with a strict configuration allowing only `compare_payloads` and `validate_payload`. Other tools were unavailable in that check. The session completed within three turns without permission denials.

Using the synthetic fixtures, Claude reported:

- `/order/status` was added.
- `/customer/phone` was removed.
- `/order/total` changed from a number to a string.
- The updated sample failed the schema's type constraint at `#/properties/order/properties/total/type`.

To reproduce the workflow, follow [the Claude setup guide](claude.md), use the repository's `examples` directory as the fixture root, and request a comparison followed by validation of `order.updated.json` against `order.schema.json`.

This confirms a local Claude Code interaction with these fixtures. It does not establish support for every MCP client, every Claude version, or real provider payloads. The inspection tool is covered separately by the local test and demo workflow.

## CI and release evidence

The repository includes a GitHub Actions matrix for Node.js 22 and 24 on Linux, Windows, and macOS. A configured workflow is not a successful run: consult the [live Actions results](https://github.com/webizmo/webhook-lens/actions/workflows/ci.yml) for the current commit's status.

Publication, stars, traffic, and commercial enquiries are separate observations. No growth or conversion results are asserted by these verification notes.
