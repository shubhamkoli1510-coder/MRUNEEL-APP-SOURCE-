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
