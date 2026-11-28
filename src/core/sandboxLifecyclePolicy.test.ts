import test from "node:test";
import assert from "node:assert/strict";
import { buildSandboxExecutionPlan } from "./sandboxExecutionPlan";
import { buildSandboxLifecyclePolicy } from "./sandboxLifecyclePolicy";

const input = {
  commands: ["npm run test:sandbox-policy"],
  files: [{ path: "src/core/example.ts", content: "export const ok = true;" }],
  timeoutSeconds: 120,
  networkPolicy: "deny-all" as const,
};

test("refuses lifecycle preparation until the exact plan hash is approved", () => {
  const plan = buildSandboxExecutionPlan(input);
  const policy = buildSandboxLifecyclePolicy(plan);
  assert.equal(policy.allowedToPrepare, false);
  assert.equal(policy.executionEnabled, false);
  assert.match(policy.errors.join(" "), /Explicit approval/);
});

test("allows only a lifecycle plan after exact approval; still does not execute", () => {
  const review = buildSandboxExecutionPlan(input);
  const approvedPlan = buildSandboxExecutionPlan({
    ...input,
    approvedPlanHash: review.planHash ?? undefined,
  });
  const policy = buildSandboxLifecyclePolicy(approvedPlan);
  assert.equal(policy.allowedToPrepare, true);
  assert.equal(policy.executionEnabled, false);
  assert.equal(policy.requiresExplicitApproval, true);
  assert.equal(policy.createOnlyAfterApproval, true);
  assert.equal(policy.waitForRunningBeforeUpload, true);
  assert.equal(policy.terminateInFinally, true);
});

test("fixes the required order: create, record ID, wait, upload, run, terminate", () => {
  const review = buildSandboxExecutionPlan(input);
  const approvedPlan = buildSandboxExecutionPlan({
    ...input,
    approvedPlanHash: review.planHash ?? undefined,
  });
  const policy = buildSandboxLifecyclePolicy(approvedPlan);
  const stages = [...policy.stages];
  assert.ok(stages.indexOf("record-sandbox-id") < stages.indexOf("wait-until-running"));
  assert.ok(stages.indexOf("wait-until-running") < stages.indexOf("upload-explicit-files"));
  assert.ok(stages.indexOf("upload-explicit-files") < stages.indexOf("run-allowlisted-commands-with-guest-timeout"));
  assert.ok(stages.indexOf("run-allowlisted-commands-with-guest-timeout") < stages.indexOf("terminate-in-finally"));
});

test("rejects unbounded startup, cleanup, and output limits", () => {
  const review = buildSandboxExecutionPlan(input);
  const approvedPlan = buildSandboxExecutionPlan({
    ...input,
    approvedPlanHash: review.planHash ?? undefined,
  });
  const policy = buildSandboxLifecyclePolicy(approvedPlan, {
    startupTimeoutSeconds: 301,
    cleanupTimeoutSeconds: 61,
    maxOutputBytes: 1_000_001,
  });
  assert.equal(policy.allowedToPrepare, false);
  assert.equal(policy.executionEnabled, false);
  assert.equal(policy.errors.length, 3);
});

test("does not allow a stale approval after input content changes", () => {
  const review = buildSandboxExecutionPlan(input);
  const changed = buildSandboxExecutionPlan({
    ...input,
    files: [{ path: "src/core/example.ts", content: "export const changed = true;" }],
    approvedPlanHash: review.planHash ?? undefined,
  });
  const policy = buildSandboxLifecyclePolicy(changed);
  assert.equal(policy.allowedToPrepare, false);
  assert.equal(policy.executionEnabled, false);
});
