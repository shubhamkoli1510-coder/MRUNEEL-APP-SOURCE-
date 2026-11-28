import test from "node:test";
import assert from "node:assert/strict";
import { buildSandboxExecutionPlan } from "./sandboxExecutionPlan";

const valid = {
  commands: ["npm run test:sandbox-policy", "npm run lint"],
  files: [
    { path: "package.json", content: '{"scripts":{"test":"node --test"}}' },
    { path: "src/core/example.ts", content: "export const safe = true;" },
  ],
  timeoutSeconds: 300,
  networkPolicy: "deny-all" as const,
};

test("creates a review-required plan without enabling execution", () => {
  const result = buildSandboxExecutionPlan(valid);
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.approved, false);
  assert.equal(result.executionEnabled, false);
  assert.equal(result.status, "review-required");
  assert.match(result.planHash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(result.files.length, 2);
});

test("accepts approval only when it matches the exact reviewed plan hash", () => {
  const first = buildSandboxExecutionPlan(valid);
  const approved = buildSandboxExecutionPlan({ ...valid, approvedPlanHash: first.planHash ?? undefined });
  assert.equal(approved.valid, true);
  assert.equal(approved.approved, true);
  assert.equal(approved.status, "approved-plan-only");
  assert.equal(approved.executionEnabled, false);
});

test("invalidates approval when command, timeout, path, or file content changes", () => {
  const first = buildSandboxExecutionPlan(valid);
  const hash = first.planHash ?? undefined;
  const changedContent = buildSandboxExecutionPlan({
    ...valid,
    approvedPlanHash: hash,
    files: [{ ...valid.files[0], content: '{"changed":true}' }, valid.files[1]],
  });
  const changedCommand = buildSandboxExecutionPlan({
    ...valid,
    approvedPlanHash: hash,
    commands: ["npm run build"],
  });
  assert.equal(changedContent.approved, false);
  assert.equal(changedCommand.approved, false);
});

test("rejects secret paths, traversal, and unsupported commands", () => {
  const result = buildSandboxExecutionPlan({
    ...valid,
    commands: ["npm run test && echo unsafe"],
    files: [{ path: "../.env", content: "DO_NOT_UPLOAD" }],
  });
  assert.equal(result.valid, false);
  assert.equal(result.executionEnabled, false);
  assert.equal(result.planHash, null);
});

test("rejects oversized individual and aggregate file contents", () => {
  const tooLargeFile = buildSandboxExecutionPlan({
    ...valid,
    files: [{ path: "src/core/large.ts", content: "x".repeat(20_001) }],
  });
  const tooLargeAggregate = buildSandboxExecutionPlan({
    ...valid,
    files: [
      { path: "src/core/a.ts", content: "a".repeat(20_000) },
      { path: "src/core/b.ts", content: "b".repeat(20_000) },
      { path: "src/core/c.ts", content: "c".repeat(10_001) },
    ],
  });
  assert.equal(tooLargeFile.valid, false);
  assert.equal(tooLargeAggregate.valid, false);
});

test("rejects empty and duplicate source files", () => {
  assert.equal(buildSandboxExecutionPlan({ ...valid, files: [] }).valid, false);
  assert.equal(buildSandboxExecutionPlan({
    ...valid,
    files: [valid.files[0], valid.files[0]],
  }).valid, false);
});
