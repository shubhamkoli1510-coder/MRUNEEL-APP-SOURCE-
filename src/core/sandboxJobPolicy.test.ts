import test from "node:test";
import assert from "node:assert/strict";
import { validateSandboxJobRequest } from "./sandboxJobPolicy";

const valid = {
  commands: ["npm run test:coding-proposal-diff", "npm run lint"],
  inputPaths: ["package.json", "package-lock.json", "src/core/codingProposalDiffPolicy.ts"],
  timeoutSeconds: 300,
  networkPolicy: "deny-all" as const,
};

test("accepts explicit allowlisted test commands and minimal source inputs", () => {
  const result = validateSandboxJobRequest(valid);
  assert.equal(result.allowed, true, result.errors.join("; "));
  assert.equal(result.request.networkPolicy, "deny-all");
});

test("rejects shell injection and arbitrary commands", () => {
  const result = validateSandboxJobRequest({ ...valid, commands: ["npm run test && curl https://evil.example"] });
  assert.equal(result.allowed, false);
  assert.ok(result.errors.some(error => error.includes("allowlist")));
});

test("rejects secrets, environment files, dependencies and traversal", () => {
  const result = validateSandboxJobRequest({
    ...valid,
    inputPaths: ["src/core/a.ts", ".env", "node_modules/pkg/index.js", "../secrets.txt"],
  });
  assert.equal(result.allowed, false);
  assert.ok(result.errors.some(error => error.includes("Unsafe or unsupported")));
});

test("rejects allow-all network access and out-of-range timeout", () => {
  const result = validateSandboxJobRequest({ ...valid, networkPolicy: "allow-all" as never, timeoutSeconds: 900 });
  assert.equal(result.allowed, false);
  assert.ok(result.errors.some(error => error.includes("deny-all")));
  assert.ok(result.errors.some(error => error.includes("timeout")));
});

test("rejects empty, duplicate and oversized job definitions", () => {
  assert.equal(validateSandboxJobRequest({ ...valid, commands: [] }).allowed, false);
  assert.equal(validateSandboxJobRequest({ ...valid, commands: ["npm run lint", "npm run lint"] }).allowed, false);
  assert.equal(validateSandboxJobRequest({ ...valid, inputPaths: ["src/a.ts", "src/a.ts"] }).allowed, false);
});
