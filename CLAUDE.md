# Claude instructions

Read [AGENTS.md](AGENTS.md) for repository commands and implementation boundaries.

This is a JavaScript ES-module project targeting Node.js 22+. Use `npm ci`, `npm test`, and `node bin/webhook-lens.js demo` for the basic development workflow. There is no build step.

Keep the CLI and MCP contracts documented accurately. Never add raw payload values to MCP responses, including errors. Preserve the root restriction and offline schema validation. Use synthetic fixtures in tests and examples.

For connecting this toolkit to Claude as an MCP server, see [docs/claude.md](docs/claude.md).
