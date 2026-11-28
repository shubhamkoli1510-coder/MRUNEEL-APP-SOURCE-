import test from "node:test";
import assert from "node:assert/strict";
import { createProposalReviewSnapshot, isProposalReviewApproved } from "./codingLabApproval";

const proposal = { summary: "Add guard", filesToChange: ["src/a.ts"], risks: [], testsToRun: ["npm test"], unifiedDiff: "@@ -1 +1 @@\n-old\n+new" };

test("approval matches exact task, source context and proposal", () => {
  const snapshot = createProposalReviewSnapshot("Add guard", "src/a.ts", "old source", proposal);
  assert.equal(isProposalReviewApproved(snapshot, "Add guard", "src/a.ts", "old source", proposal), true);
});

test("task, source or diff changes invalidate approval", () => {
  const snapshot = createProposalReviewSnapshot("Add guard", "src/a.ts", "old source", proposal);
  assert.equal(isProposalReviewApproved(snapshot, "Different task", "src/a.ts", "old source", proposal), false);
  assert.equal(isProposalReviewApproved(snapshot, "Add guard", "src/a.ts", "changed source", proposal), false);
  assert.equal(isProposalReviewApproved(snapshot, "Add guard", "src/a.ts", "old source", { ...proposal, unifiedDiff: proposal.unifiedDiff + "\nchanged" }), false);
});

test("approval requires a non-empty diff and proposal", () => {
  assert.equal(isProposalReviewApproved("anything", "task", "file", "source", null), false);
  assert.equal(isProposalReviewApproved("anything", "task", "file", "source", { ...proposal, unifiedDiff: "" }), false);
});
