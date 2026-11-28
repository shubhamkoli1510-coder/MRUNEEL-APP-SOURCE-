export interface CodingLabProposalReview {
  summary?: string;
  filesToChange?: string[];
  risks?: string[];
  testsToRun?: string[];
  unifiedDiff?: string;
}

export function createProposalReviewSnapshot(task: string, filePath: string, source: string, proposal: CodingLabProposalReview): string {
  return JSON.stringify({
    task: task.trim(),
    sourcePath: filePath.trim(),
    source,
    summary: proposal.summary ?? "",
    filesToChange: [...(proposal.filesToChange ?? [])],
    risks: [...(proposal.risks ?? [])],
    testsToRun: [...(proposal.testsToRun ?? [])],
    unifiedDiff: proposal.unifiedDiff ?? "",
  });
}

export function isProposalReviewApproved(snapshot: string | null, task: string, filePath: string, source: string, proposal: CodingLabProposalReview | null): boolean {
  if (!snapshot || !proposal || !proposal.unifiedDiff?.trim()) return false;
  return snapshot === createProposalReviewSnapshot(task, filePath, source, proposal);
}

export interface CodingLabSourceFile {
  path: string;
  content: string;
}

function isCanonicalSourcePath(path: string): boolean {
  const normalized = path.trim().replace(/\\\\/g, "/");
  const segments = normalized.split("/");
  return !!normalized && !normalized.startsWith("/") &&
    !segments.some((segment) => !segment || segment === "." || segment === "..") &&
    !/[\\u0000-\\u001f\\u007f\\s"'<>:|?*]/.test(normalized);
}

/** Snapshot for proposals reviewed against multiple exact source files. */
export function createMultiFileProposalReviewSnapshot(
  task: string,
  files: CodingLabSourceFile[],
  proposal: CodingLabProposalReview,
): string {
  return JSON.stringify({
    task: task.trim(),
    files: files.map((file) => ({ path: file.path.trim(), content: file.content })),
    summary: proposal.summary ?? "",
    filesToChange: [...(proposal.filesToChange ?? [])],
    risks: [...(proposal.risks ?? [])],
    testsToRun: [...(proposal.testsToRun ?? [])],
    unifiedDiff: proposal.unifiedDiff ?? "",
  });
}

export function isMultiFileProposalReviewApproved(
  snapshot: string | null,
  task: string,
  files: CodingLabSourceFile[],
  proposal: CodingLabProposalReview | null,
): boolean {
  if (!snapshot || !proposal || !proposal.unifiedDiff?.trim() || files.length === 0) return false;
  if (files.some((file) => !file.path.trim() || !file.content.trim())) return false;
  if (files.length > 5 || files.some((file) => file.content.length > 20_000)) return false;
  const total = files.reduce((sum, file) => sum + file.content.length, 0);
  if (total > 50_000) return false;
  const paths = files.map((file) => file.path.trim().replace(/\\\\/g, "/"));
  if (files.some((file) => !isCanonicalSourcePath(file.path))) return false;
  if (new Set(paths).size !== paths.length) return false;
  return snapshot === createMultiFileProposalReviewSnapshot(task, files, proposal);
}
