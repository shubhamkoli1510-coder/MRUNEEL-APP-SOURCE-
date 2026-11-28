# Coding Lab Phase 5 — Multi-file review foundation

## Added
- Multi-file review snapshot helper binding the approval to task, ordered source paths and exact contents, summary, proposed file list, risks, test plan and exact diff.
- Validation guard: 1–5 source files, each <=20,000 characters, total <=50,000 characters, non-empty paths/content, unique paths.
- Unit tests for approvals and invalidation, ordering, duplicate paths, and size limits.

## Current limitation
This is a tested core foundation only. Coding Lab UI still submits one pasted source file. Repository file retrieval and multi-file UI are separate follow-on work. No repository writes or GitHub access were added.
