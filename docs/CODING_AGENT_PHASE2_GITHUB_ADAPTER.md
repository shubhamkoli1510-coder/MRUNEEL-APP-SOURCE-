# MRUNEEL Coding Agent Phase 2 — GitHub Draft PR adapter

The server now contains a GitHub REST adapter and a disabled-by-default endpoint:
`POST /api/coding-agent/draft-pr`.

## Mandatory server-side configuration
- `MRUNEEL_CODING_AGENT_ENABLED=true`
- `MRUNEEL_CODING_AGENT_TOKEN`: long random shared secret for authenticating a trusted caller
- `GITHUB_TOKEN`: fine-grained GitHub token restricted to this repository, with Contents: read/write and Pull requests: read/write
- Optional `MRUNEEL_CODING_BASE_BRANCH` (defaults to the parity foundation feature branch)

Never put either secret in the Android app, frontend bundle, source code, logs, or a public repository. The endpoint is intentionally unavailable until all three required settings are present. Do not enable it on the public server until a real authenticated user-consent flow is added; the shared-secret endpoint is intended only for a trusted server-to-server caller.

## Request
Requires `Authorization: Bearer <MRUNEEL_CODING_AGENT_TOKEN>` and JSON:
```json
{
  "task": "describe a code change",
  "approved": true,
  "files": [
    { "path": "src/example.ts", "content": "full proposed file content" }
  ]
}
```

## Behavior and guardrails
- Revalidates the explicit approval and proposal using `codingAgentPolicy`.
- Only allowed `src/` paths; protected paths, path traversal, common secret patterns, duplicates, and size limits are rejected.
- Creates a uniquely named isolated branch from the configured base.
- Writes each proposed file on that branch only.
- Opens a **draft** pull request for human review.
- Never merges, deploys, releases, executes shell commands, or modifies the base branch.
- Rate-limits authenticated endpoint attempts to two per IP per hour.

## Known limitation
The GitHub Contents API creates a commit for each file; if a later write or PR creation fails, an isolated branch may remain partially populated. Clean up that branch manually after reviewing. Before enabling this endpoint for an app user, implement authenticated user identity, a one-time approval challenge, CSRF/replay protections, audit logging, and a stricter token lifecycle.
