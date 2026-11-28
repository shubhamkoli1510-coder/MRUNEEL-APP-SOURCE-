# MRUNEEL Coding Agent — Phase 1 approval gate

This phase adds a pure policy gate for a future GitHub-writing agent. It does not connect to GitHub, create commits, run commands, or write repository files.

## Gate requirements
- An explicit `approved: true` flag is required.
- Up to five files and 50,000 characters total.
- Only ordinary files under `src/` are accepted.
- Android, backend, CI, dependency, environment, security, permission, device bridge, memory, speech and lock-related paths are blocked.
- Traversal/absolute paths, duplicate paths, empty/oversized files and common credential patterns are rejected.
- Accepted task names produce a deterministic `mruneel-coding/<slug>` branch name.

## Next phase
Wire this gate into a backend GitHub integration protected by a server-side secret; create only isolated branches and draft PRs. Never merge, deploy, release, or modify protected paths automatically.
