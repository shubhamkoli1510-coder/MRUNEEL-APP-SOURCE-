import test from "node:test";
import assert from "node:assert/strict";
import { makeCodingAgentBranch, validateCodingAgentProposal } from "./codingAgentPolicy";

const valid = {
  task: "Add simple greeting UI",
  approved: true,
  files: [{ path: "src/components/Greeting.tsx", content: "export const Greeting = () => <p>Hello</p>;" }],
};

test("allows a reviewed ordinary src change", () => {
  const result = validateCodingAgentProposal(valid);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.branchName, "mruneel-coding/add-simple-greeting-ui");
});

test("blocks missing explicit approval", () => {
  const result = validateCodingAgentProposal({ ...valid, approved: false });
  assert.equal(result.allowed, false);
  assert.match(result.errors.join(" "), /Explicit approval/);
});

test("blocks protected and non-src paths", () => {
  for (const path of ["server.ts", "android/MainActivity.java", "src/utils/security.ts", "src/.env", "../outside.ts"]) {
    const result = validateCodingAgentProposal({ ...valid, files: [{ path, content: "safe content" }] });
    assert.equal(result.allowed, false, path);
  }
});

test("blocks credentials and duplicate paths", () => {
  const secret = validateCodingAgentProposal({ ...valid, files: [{ path: "src/config.ts", content: "const key = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF';" }] });
  assert.equal(secret.allowed, false);
  const duplicate = validateCodingAgentProposal({ ...valid, files: [valid.files[0], valid.files[0]] });
  assert.equal(duplicate.allowed, false);
});

test("rejects empty, oversized and malformed path inputs", () => {
  assert.equal(validateCodingAgentProposal({ ...valid, files: [{ path: "src/a.ts", content: "" }] }).allowed, false);
  assert.equal(validateCodingAgentProposal({ ...valid, files: [{ path: "src/a.ts", content: "x".repeat(20_001) }] }).allowed, false);
  assert.equal(validateCodingAgentProposal({ ...valid, files: [{ path: "src//a.ts", content: "ok" }] }).allowed, false);
});

test("creates deterministic branch slugs", () => {
  assert.equal(makeCodingAgentBranch("Improve coding flow!"), "mruneel-coding/improve-coding-flow");
});
