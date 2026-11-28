# MRUNEEL Coding Lab — safe review workflow

## Current capability
Coding Lab asks Gemini for a plan and unified diff based on a source file you provide. It does **not** read the repository automatically, write files, run shell commands, push commits, create PRs, or install APKs. The UI can copy or download a proposed patch.

## Human-reviewed patch flow
1. In Coding Lab, provide a task, exact source path, and the complete source of that file (never include secrets).
2. Generate the proposal. Review the summary, file list, risks, test suggestions, and every line in the diff.
3. Download the patch. Create a fresh branch named `mruneel-coding/<short-task>` from the intended base branch.
4. Apply the patch locally. If it fails to apply cleanly, stop and regenerate against the current source rather than forcing it.
5. Inspect `git diff`; do not accept changes to Android native code, device controls, permissions, lock/security, memory, backend, CI, dependencies, signing, or secret files from Coding Lab proposals.
6. Run `npm run lint` and `npm run build`. For Android-related work, use a separate manual review and Android build.
7. Push the branch and open a PR. The Coding Lab safety workflow runs only for PR branches named `mruneel-coding/*`, checks the allowed file scope and common secret patterns, then type-checks and builds.
8. Human review remains required. A green CI check is not proof that behavior is safe. Never auto-merge or auto-release.

## PR guard allowlist
Only ordinary `src/` files are allowed. The guard blocks CI, Android, server, dependencies, environment files, and selected sensitive device/security/memory/permission files. If a task requires one of these protected areas, create a human-managed branch and review it separately.
