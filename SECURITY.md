# Security and data boundaries

Webhook Lens handles files that may contain sensitive business data. Use reviewed, synthetic fixtures whenever possible.

## Intended boundaries

- The CLI processes local JSON files.
- The MCP server requires a configured root and limits access to JSON files under that root.
- MCP results expose structural metadata, not raw payload values.
- Schema validation uses Draft-07 and same-document fragment references only. References to other local files or remote URLs are rejected. Validation runs in a bounded worker with a three-second execution timeout and a 128 MiB V8 old-generation heap limit.
- Redaction is available only through an explicit CLI command and does not overwrite an existing output file.

These are implementation boundaries, not a claim of a complete security audit or a sandbox for untrusted code. Run the tool with the permissions it needs and keep the fixture root small. Use a trusted root directory that a hostile local user cannot modify concurrently.

## What remains sensitive

Field names and paths can contain customer identifiers, emails, internal product names, or other sensitive information. Types, counts, and validation details can also reveal business structure. MCP clients may send tool results to an external model provider. Review the client settings and the data you expose.

Redaction is best effort. It cannot reliably identify every secret or every piece of personal data, particularly in free text or under unexpected field names. Review the generated output before sharing it.

The MCP root controls this server only. It does not limit a client's other tools or grant the server permission to share information elsewhere.

## Report a vulnerability

Please do not publish sensitive payloads, credentials, or a working exploit in a public issue.

Use GitHub's **Report a vulnerability** option in this repository's Security tab when it is available. If it is unavailable, open a minimal issue asking for a private reporting channel, with no sensitive details. Maintainers can then arrange private follow-up.

Include the affected version or commit, the boundary that can be bypassed, a minimal synthetic reproduction, and the expected impact. Avoid testing against other people's systems or data.

Security fixes will be documented in releases. There is currently no guaranteed response-time or long-term support commitment.
