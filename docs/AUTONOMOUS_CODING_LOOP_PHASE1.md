# Autonomous Coding Loop — Phase 1

This is a deterministic lifecycle controller for the MRUNEEL Coding Lab. It does not call models, GitHub, a shell, or device APIs.

Flow: start → planning → proposing → validating → (bounded revising) → awaiting_review → explicit_approval → export.

Safety:
- Task text is bounded to 4,000 characters.
- Maximum three validation attempts and two revisions.
- Unsafe request events block and invalidate approval.
- Export is impossible before explicit approval in the state machine.
- No automatic Git write, merge, deploy, release, device action, or external communication.
- This is core foundation; UI integration and real sandbox test execution are later phases.
