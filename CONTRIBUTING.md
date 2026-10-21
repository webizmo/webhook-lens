# Contributing to Webhook Lens

Thanks for helping make webhook integrations easier to inspect.

Useful contributions include small bug reproductions, clearer documentation, JSON edge cases, and focused improvements to the CLI or MCP tools. Please discuss substantial new features in an issue before building them.

## Run locally

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci
node bin/webhook-lens.js demo
npm test
```

Use Node.js 22 or newer. The project uses JavaScript ES modules and runs without a build step.

## Keep changes reviewable

1. Create a branch for one change.
2. Add a small synthetic fixture when reproducing a parsing, comparison, validation, or boundary bug.
3. Add a relevant regression test when changing behavior.
4. Run the tests and the sample demo.
5. Explain the problem, the new behavior, and the checks you ran in your pull request.

Avoid unrelated formatting changes and new runtime dependencies unless they solve a clear problem. Keep documentation consistent with actual tool output.

## Preserve the data boundary

- MCP results must not include raw payload values.
- Error messages must not copy payload values, secrets, or arbitrary parser input into tool results.
- MCP file access must stay within the configured root, including symlink and schema-reference handling.
- Payload processing must not fetch remote schemas or make other network requests.
- Redaction remains an explicit CLI operation with a separate output path.
- Do not add telemetry, hosted-service requirements, or automatic external uploads as incidental changes.

Metadata is still potentially sensitive. Do not describe these boundaries as complete anonymization or a guarantee that any payload is safe to share.

## Reporting bugs

Include your Node version, operating system, the command or MCP tool call, expected behavior, and actual behavior. Use the smallest possible **synthetic** JSON example. Public issues are not a place for production payloads, personal data, or credentials.

For security concerns, use the guidance in [SECURITY.md](SECURITY.md).

By contributing, you agree that your contribution is distributed under the project's [MIT license](LICENSE).
