import type { CodingLabSourceFile, CodingLabProposalReview } from "./codingLabApproval";

export interface ProposalDiffValidation {
  ok: boolean;
  errors: string[];
  changedPaths: string[];
}

const MAX_DIFF_CHARS = 50_000;
const normalize = (path: string) => path.split(String.fromCharCode(92)).join("/").trim();
const safePath = (path: string) => {
  const normalized = normalize(path).replace(/^(a|b)\\//, "");
  return !!normalized && !normalized.startsWith("/") && !normalized.split("/").includes("..") &&
    !/(^|\\/)\\.env(\\.|$)/i.test(normalized) &&
    !/(secret|credential|keystore|\\.jks|\\.p12)/i.test(normalized) &&
    (normalized.startsWith("src/") || normalized.startsWith("android/app/src/") ||
      normalized === "package.json" || normalized === "server.ts");
};

function headerPath(line: string): string | null {
  const raw = line.slice(4).trim().split("\\t")[0].trim();
  if (raw === "/dev/null") return null;
  return raw.replace(/^(a|b)\\//, "");
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
  const headers = diff.split(/\\r?\\n/).filter(line => line.startsWith("+++ ") || line.startsWith("--- "));
  const changedPaths = [...new Set(headers.map(headerPath).filter((p): p is string => p !== null))];
  if (headers.length < 2 || changedPaths.length === 0) errors.push("Unified diff file headers are missing.");
  for (const p of changedPaths) {
    if (!safePath(p)) errors.push("Unsafe diff path: " + p);
    if (!sourcePaths.has(normalize(p))) errors.push("Diff path was not among fetched sources: " + p);
  }
  if (changedPaths.length > 5) errors.push("Diff touches more than 5 files.");
  return { ok: errors.length === 0, errors, changedPaths };
}
