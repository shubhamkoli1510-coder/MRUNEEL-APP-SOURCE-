# MRUNEEL Coding Agent Phase 3 — User Consent & Integration Architecture

## Status
Design-only phase. No endpoint is enabled and no user credentials are collected.

## Required flow before the app can request GitHub writes
1. **Identity:** establish a real authenticated user identity. A shared bearer secret embedded in the APK is not authentication.
2. **Proposal:** the Coding Lab displays the task, exact file paths, complete diff, risk classification, and test plan.
3. **Review:** reject protected paths, secrets, dependency/config/native/security files, and proposals that cannot be validated. Display changed-file and diff summaries.
4. **One-time approval:** approval is bound to a canonical proposal hash, user identity, repository, base branch, file list, and expiry. The challenge must be single-use and server-side.
5. **Revalidation:** on submit, server validates identity, challenge, expiry, proposal hash, path policy, content size, rate limits, and repository/base allowlist. Never trust a client-supplied `approved: true` alone.
6. **Least-privilege GitHub access:** prefer a GitHub App installation token scoped to this repository and short lifetime over a long-lived PAT. Token must remain server-side.
7. **Isolated write:** create a unique feature branch from an explicitly configured base; write only validated files; create a draft PR. Never merge, release, deploy, or write directly to base.
8. **Audit:** record proposal hash, user ID, approval timestamp, branch/PR, result, and failure category without logging source secrets or access tokens.
9. **Cleanup:** if a write partially fails, mark the branch as incomplete and provide safe cleanup instructions. Never silently retry a write.

## Threat model / controls
- APK extraction: no server/GitHub credentials in client.
- Replay: one-time challenge consumed atomically; short expiry; proposal hash binding.
- CSRF: strict origin validation and appropriate session protection for browser-based auth.
- Abuse: per-user and per-IP rate limits, bounded request sizes, monitoring, and kill switch.
- Prompt injection: code/source is untrusted input; proposal must be policy-validated independently of model instructions.
- Path bypass: canonicalize paths; reject absolute paths, traversal, symlinks and protected targets. Allowlist ordinary source files only.
- Partial failure: write on isolated branch; PR creation only after all file writes; report exact status and never claim complete on failure.
- Human review: Draft PR; CI and human review required; no auto-merge.

## Release gate
Do not enable `MRUNEEL_CODING_AGENT_ENABLED` on public Render until identity, consent challenge, audit, token handling, and integration tests are implemented and reviewed. This document alone does not activate any capability.
