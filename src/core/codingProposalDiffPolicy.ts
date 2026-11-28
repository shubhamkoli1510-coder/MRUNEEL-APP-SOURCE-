import type { CodingLabSourceFile, CodingLabProposalReview } from "./codingLabApproval";

export interface ProposalDiffValidation {
  ok: boolean;
  errors: string[];
  changedPaths: string[];
}

const MAX_DIFF_CHARS = 50_000;
const normalize = (path: string) => path.split(String.fromCharCode(92)).join("/").trim();
const safePath = (path: string) => {
  const normalized = normalize(path).replace(/^(a|b)\//, "");
  return !!normalized && !normalized.startsWith("/") && !normalized.split("/").includes("..") &&
    !/(^|\/)\.env(\.|$)/i.test(normalized) &&
    !/(secret|credential|keystore|\.jks|\.p12)/i.test(normalized) &&
    (normalized.startsWith("src/") || normalized.startsWith("android/app/src/") ||
      normalized === "package.json" || normalized === "server.ts");
};

function headerPath(line: string): string | null {
  const raw = line.slice(4).trim().split("\t")[0].trim();
  if (raw === "/dev/null") return null;
  return raw.replace(/^(a|b)\//, "");
}

/** Structural policy only; this does not compile or execute proposed code. */
export function validateCodingProposalDiff(
  proposal: CodingLabProposalReview,
  sourceFiles: CodingLabSourceFile[],
): ProposalDiffValidation {
  const errors: string[] = [];
  const diff = proposal.unifiedDiff ?? "";
  if (!diff.trim()) errors.push("Diff is empty.");
  if (diff.length > MAX_DIFF_CHARS) errors.push("Diff exceeds 50,000 characters.");
  const sourcePaths = new Set(sourceFiles.map(f => normalize(f.path)));
  for (const p of proposal.filesToChange ?? []) {
    const normalized = normalize(p);
    if (!safePath(normalized)) errors.push("Unsafe changed-file path: " + p);
    if (!sourcePaths.has(normalized)) errors.push("Changed file was not among fetched sources: " + p);
  }

  const lines = diff.split(/\r?\n/);
  const headerPairs: Array<{ oldPath: string | null; newPath: string | null }> = [];
  let inHunk = false;
  let oldRemaining = 0;
  let newRemaining = 0;
  let sawHunk = false;
  let sawChangedHunkLine = false;

  // Parse file headers only outside hunks. Added/removed source lines can
  // legitimately begin with "+++" or "---" and must not be mistaken for headers.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inHunk) {
      if (line.startsWith("\\")) continue; // no-newline marker
      if (line.startsWith(" ")) {
        oldRemaining--;
        newRemaining--;
      } else if (line.startsWith("-")) {
        oldRemaining--;
        sawChangedHunkLine = true;
      } else if (line.startsWith("+")) {
        newRemaining--;
        sawChangedHunkLine = true;
      } else {
        errors.push("Malformed unified diff hunk content.");
        continue;
      }
      if (oldRemaining < 0 || newRemaining < 0) {
        errors.push("Unified diff hunk contains more lines than its header declares.");
        inHunk = false;
      } else if (oldRemaining === 0 && newRemaining === 0) {
        inHunk = false;
      }
      continue;
    }

    const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/);
    if (hunk) {
      sawHunk = true;
      oldRemaining = hunk[2] === undefined ? 1 : Number(hunk[2]);
      newRemaining = hunk[4] === undefined ? 1 : Number(hunk[4]);
      if (!Number.isSafeInteger(oldRemaining) || !Number.isSafeInteger(newRemaining) ||
          oldRemaining > MAX_DIFF_CHARS || newRemaining > MAX_DIFF_CHARS) {
        errors.push("Unified diff hunk line counts are invalid or exceed the diff limit.");
        oldRemaining = 0;
        newRemaining = 0;
        continue;
      }
      inHunk = oldRemaining > 0 || newRemaining > 0;
      continue;
    }
    if (line.startsWith("@@")) {
      errors.push("Malformed unified diff hunk header.");
      continue;
    }

    if (line.startsWith("--- ")) {
      const next = lines[i + 1];
      if (!next?.startsWith("+++ ")) {
        errors.push("Unified diff headers must use ordered --- / +++ pairs.");
        continue;
      }
      if (!line.startsWith("--- a/") || !next.startsWith("+++ b/")) {
        errors.push("Diff headers must use --- a/old-path and +++ b/new-path for in-place edits.");
      }
      headerPairs.push({ oldPath: headerPath(line), newPath: headerPath(next) });
      i++;
      continue;
    }
    if (line.startsWith("+++ ")) {
      errors.push("Unified diff contains an unpaired +++ header.");
      continue;
    }
    if (line.trim() && !line.startsWith("diff --git ") && !/^index [0-9a-f]+\\.\\.[0-9a-f]+(?: [0-7]{6})?$/i.test(line)) {
      errors.push("Unified diff contains unexpected content outside a file header or hunk.");
    }
  }
  if (inHunk) errors.push("Unified diff hunk ended before all declared lines were present.");
  if (!headerPairs.length) errors.push("Unified diff file headers are missing.");

  const changedPaths = [...new Set(headerPairs.flatMap(pair => [pair.oldPath, pair.newPath].filter((p): p is string => p !== null)))];
  for (const pair of headerPairs) {
    if (!pair.oldPath || !pair.newPath || pair.oldPath !== pair.newPath) errors.push("Only in-place edits are allowed; file add/delete/rename headers are rejected.");
  }
  if (changedPaths.length !== headerPairs.length) errors.push("Diff contains duplicate or ambiguous file headers.");
  if (!sawHunk) errors.push("Diff contains no hunk.");
  if (!sawChangedHunkLine) errors.push("Diff contains no changed lines.");
  if (proposal.filesToChange?.length && proposal.filesToChange.map(normalize).sort().join("|") !== changedPaths.map(normalize).sort().join("|")) errors.push("filesToChange list does not match diff headers.");
  for (const p of changedPaths) {
    if (!safePath(p)) errors.push("Unsafe diff path: " + p);
    if (!sourcePaths.has(normalize(p))) errors.push("Diff path was not among fetched sources: " + p);
  }
  if (changedPaths.length > 5) errors.push("Diff touches more than 5 files.");
  return { ok: errors.length === 0, errors, changedPaths };
}
