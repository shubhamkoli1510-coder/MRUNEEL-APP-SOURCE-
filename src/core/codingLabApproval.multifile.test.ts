import test from "node:test";
import assert from "node:assert/strict";
import {
 createMultiFileProposalReviewSnapshot,
 isMultiFileProposalReviewApproved,
} from "./codingLabApproval";

const files = [
 { path: "src/a.ts", content: "old A" },
 { path: "src/b.ts", content: "old B" },
];
const proposal = { summary: "Cross-file change", filesToChange: ["src/a.ts", "src/b.ts"], risks: [], testsToRun: ["npm test"], unifiedDiff: "@@ multi @@\n-old\n+new" };

test("multi-file approval binds exact ordered file paths and contents", () => {
 const snap = createMultiFileProposalReviewSnapshot("task", files, proposal);
 assert.equal(isMultiFileProposalReviewApproved(snap, "task", files, proposal), true);
 assert.equal(isMultiFileProposalReviewApproved(snap, "task", [{...files[0],content:"changed"},files[1]], proposal), false);
 assert.equal(isMultiFileProposalReviewApproved(snap, "task", [files[1],files[0]], proposal), false);
});

test("multi-file approval invalidates task, proposal and diff changes", () => {
 const snap = createMultiFileProposalReviewSnapshot("task", files, proposal);
 assert.equal(isMultiFileProposalReviewApproved(snap, "other", files, proposal), false);
 assert.equal(isMultiFileProposalReviewApproved(snap, "task", files, {...proposal,summary:"changed"}), false);
 assert.equal(isMultiFileProposalReviewApproved(snap, "task", files, {...proposal,unifiedDiff:"changed"}), false);
});

test("rejects empty, duplicate, oversized or excessive file inputs", () => {
 const snap = "irrelevant";
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",[],proposal),false);
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",[{path:"",content:"x"}],proposal),false);
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",[{path:"src/a.ts",content:"x"},{path:"src/a.ts",content:"y"}],proposal),false);
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",Array.from({length:6},(_,i)=>({path:`src/${i}.ts`,content:"x"})),proposal),false);
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",[{path:"src/a.ts",content:"x".repeat(20001)}],proposal),false);
 assert.equal(isMultiFileProposalReviewApproved(snap,"task",[{path:"src/a.ts",content:"x".repeat(50001)}],proposal),false);
});
