# MRUNEEL JARVIS-Core Roadmap

This roadmap layers the assistant into capabilities without implying features are already live.

## Core layers
- **Memory:** user-approved durable memory; current app has local settings/notes/reminders/memory lists. Cloud sync and encrypted storage are future work.
- **Tools:** typed tool registry with input schemas, capability checks, result receipts, and timeouts. No arbitrary shell or unrestricted network tool.
- **Voice:** native wake word only when the app is unlocked and user-enabled; speech recognition and TTS with explicit state transitions.
- **Device Bridge:** Android APIs behind a permission/capability check; telemetry must be real and unknown values remain unknown.
- **Coding Agent:** branch-isolated patches, allowlisted files, test execution, diff review and draft PR. No merge/release without user approval.
- **Cloud:** Render API with authentication, rate limiting, request validation, durable storage and observability. Secrets stay server-side.
- **Decision Engine:** deterministic classification/routing first; model planning is advisory. This phase adds a pure routing function and tests.

## Execution safety policy
- Conversation and read-only answers may run without approval.
- Device operations require capability verification and user confirmation.
- External actions (messages, calls, payments, publishing, data sharing) require confirmation.
- Coding operations must run in an isolated branch/workspace, pass tests, and remain reviewable.
- Credentials and secrets are blocked from autonomous handling.
- Every action must return an actual tool result; never report success before confirmation.

## Phase status
- [x] Coding Lab proposal + diff + patch export
- [x] CI type-check/build and path/secret guard
- [ ] Decision Engine integration into chat orchestration
- [ ] Typed Tool Registry
- [ ] Persistent memory storage with user controls
- [ ] Device Bridge capability map and receipts
- [ ] Authenticated cloud endpoints and rate limits
- [ ] Isolated Coding Agent apply/test/PR lifecycle
