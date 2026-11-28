import test from "node:test";
import assert from "node:assert/strict";
import { validateCodingProposalDiff } from "./codingProposalDiffPolicy";
import type { CodingLabSourceFile } from "./codingLabApproval";

const sources: CodingLabSourceFile[] = [{path:"src/core/a.ts",content:"old"}];
const proposal = (diff:string, files=["src/core/a.ts"]) => ({unifiedDiff:diff,filesToChange:files});
test("accepts diff limited to fetched allowlisted file",()=>{
 const r=validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -1 +1 @@\n-old\n+new"),sources);
 assert.equal(r.ok,true); assert.deepEqual(r.changedPaths,["src/core/a.ts"]);
});
test("rejects traversal and files not fetched",()=>{
 const r=validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/../../.env\n@@ -1 +1 @@\n-old\n+secret",["../../.env"]),sources);
 assert.equal(r.ok,false); assert.ok(r.errors.some(e=>e.includes("Unsafe")));
});
test("rejects missing headers and excessive diff size",()=>{
 assert.equal(validateCodingProposalDiff(proposal("just text"),sources).ok,false);
 assert.equal(validateCodingProposalDiff(proposal("x".repeat(50001)),sources).ok,false);
});
test("rejects a diff touching an unfetched file",()=>{
 const r=validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/b.ts\n@@ -1 +1 @@\n-a\n+b"),sources);
 assert.ok(r.errors.some(e=>e.includes("not among fetched")));
});

test("rejects diff without hunk and mismatched file manifest",()=>{
 const noHunk=validateCodingProposalDiff(proposal("--- a/src/core/a.ts\\n+++ b/src/core/a.ts\\n-old\\n+new"),sources);
 assert.ok(noHunk.errors.some(e=>e.includes("no hunk")));
 const mismatch=validateCodingProposalDiff(proposal("--- a/src/core/a.ts\\n+++ b/src/core/a.ts\\n@@ -1 +1 @@\\n-old\\n+new",["src/core/not-fetched.ts"]),sources);
 assert.ok(mismatch.errors.some(e=>e.includes("does not match")));
});

test("rejects header pairs with path mismatch, missing pair, or rename", () => {
 const mismatch = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/b.ts\n@@ -1 +1 @@\n-old\n+new", ["src/core/a.ts"]), sources);
 assert.ok(mismatch.errors.some(e => e.includes("in-place edits")));
 const unpaired = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n@@ -1 +1 @@\n-old\n+new"), sources);
 assert.ok(unpaired.errors.some(e => e.includes("ordered")));
});
