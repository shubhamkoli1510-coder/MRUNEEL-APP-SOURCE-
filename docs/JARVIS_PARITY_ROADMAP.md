# MRUNEEL JARVIS-Parity Roadmap

Goal: combine the JARVIS-inspired domains into one truthful, safety-gated Android AI agent. Movie abilities are aspirational references; implementation status is tracked in `src/core/jarvisParity.ts`.

## Foundations (this phase)
- Capability inventory with explicit implemented/partial/planned status.
- Deterministic task-plan scaffold for coding, research, sensitive external actions, device actions, and unknown requests.
- Plan-only behavior: no executor is called; steps remain proposed.
- Test coverage for plan routing and approval boundaries.

## Subsequent implementation sequence
1. Alarm: user command now opens Android Clock's alarm setup UI; user must confirm there. Notifications for reminders, reboot persistence and cancellation remain.
2. Allowlisted app launcher: resolve installed apps safely, user-selected allowlist, no arbitrary package launch.
3. Unified executor: adapters register availability, input schema, risk, permission checks, approval requirements and result verification.
4. Voice lifecycle: visible microphone state, foreground service policy, user enable/disable, stop/resume handling and battery safeguards.
5. Vision: user-triggered camera capture, OCR/document/object/scene workflows, explicit data-retention rules.
6. Memory: consent-based retrieval/write integration, editable/delete controls, sensitive-data exclusion and no silent cloud sync.
7. Research: connected search adapter with sources, freshness labels and graceful offline fallback.
8. Coding agent: isolated branch/patch, sandboxed tests, diff review and approval for merge/deploy/release.
9. Cloud reliability: health checks, timeout/backoff, provider fallback, monitoring, persistence and verified availability.
10. Proactive assistance: opt-in reminders/suggestions based only on permitted signals; no covert monitoring.

## Safety rules
- Never treat the capability catalog or plan as proof an adapter exists.
- Never claim an action succeeded until its adapter returns success.
- Sensitive/external actions require explicit, item-specific confirmation.
- Keep changes on feature branches and draft PRs; no merge or release without user approval.
