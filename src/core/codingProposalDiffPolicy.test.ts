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

test("rejects orphan +++ headers and malformed header prefixes", () => {
 const orphan = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -1 +1 @@\n-old\n+new"), sources);
 assert.ok(orphan.errors.some(e => e.includes("unpaired +++")));
 const malformed = validateCodingProposalDiff(proposal("--- b/src/core/a.ts\n+++ a/src/core/a.ts\n@@ -1 +1 @@\n-old\n+new"), sources);
 assert.ok(malformed.errors.some(e => e.includes("must use --- a/old-path")));
});

test("does not confuse added or removed source lines with file headers", () => {
 const added = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -0,0 +1,1 @@\n+++ this is source content"));
 assert.equal(added.ok, true, added.errors.join("; "));
 const removed = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -1,1 +0,0 @@\n--- this is source content"));
 assert.equal(removed.ok, true, removed.errors.join("; "));
});

test("parses a second file header only after the previous hunk is complete", () => {
 const multi = [
  "--- a/src/core/a.ts", "+++ b/src/core/a.ts", "@@ -1 +1 @@", "-old", "+new",
  "--- a/src/core/b.ts", "+++ b/src/core/b.ts", "@@ -1 +1 @@", "-before", "+after"
 ].join("\n");
 const twoSources: CodingLabSourceFile[] = [
  {path:"src/core/a.ts",content:"old"}, {path:"src/core/b.ts",content:"before"}
 ];
 const r = validateCodingProposalDiff(proposal(multi, ["src/core/a.ts", "src/core/b.ts"]), twoSources);
 assert.equal(r.ok, true, r.errors.join("; "));
 assert.deepEqual(r.changedPaths.sort(), ["src/core/a.ts", "src/core/b.ts"]);
});

test("rejects hunks whose declared line counts are incomplete", () => {
 const incomplete = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -1,2 +1,2 @@\n-old\n+new"));
 assert.ok(incomplete.errors.some(e => e.includes("ended before all declared lines")));
});

test("rejects context-only hunks with no actual edit", () => {
 const contextOnly = validateCodingProposalDiff(proposal("--- a/src/core/a.ts\n+++ b/src/core/a.ts\n@@ -1 +1 @@\n same"));
 assert.ok(contextOnly.errors.some(e => e.includes("no changed lines")));
});
