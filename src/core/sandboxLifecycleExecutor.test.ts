import test from "node:test";
import assert from "node:assert/strict";
import { buildSandboxExecutionPlan } from "./sandboxExecutionPlan";
import { buildSandboxLifecyclePolicy } from "./sandboxLifecyclePolicy";
import { runApprovedSandboxPlan, type SandboxLifecycleDriver, type SandboxExecEvent } from "./sandboxLifecycleExecutor";

function approvedPlan() {
  const input = {
    commands: ["npm run test:sandbox-policy"],
    files: [{ path: "src/core/example.ts", content: "export const ok = true;" }],
    timeoutSeconds: 30,
    networkPolicy: "deny-all" as const,
  };
  const review = buildSandboxExecutionPlan(input);
  const plan = buildSandboxExecutionPlan({ ...input, approvedPlanHash: review.planHash ?? undefined });
  return { plan, policy: buildSandboxLifecyclePolicy(plan, { maxOutputBytes: 128 }) };
}

function mockDriver(overrides: Partial<SandboxLifecycleDriver> = {}) {
  const calls: string[] = [];
  const driver: SandboxLifecycleDriver = {
    create: async (input) => { calls.push("create:" + input.networkPolicy.type); return { id: "sbx-test-123" }; },
    waitUntilRunning: async () => { calls.push("wait"); },
    upload: async (_id, path) => { calls.push("upload:" + path); },
    exec: async () => {
      calls.push("exec");
      const events: SandboxExecEvent[] = [
        { type: "output", stream: "stdout", data: "ok\n" },
        { type: "exit", exit_code: 0 },
      ];
      return (async function* () { yield* events; })();
    },
    terminate: async () => { calls.push("terminate"); },
    ...overrides,
  };
  return { driver, calls };
}

test("runs approved plan in safe order and always terminates", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver();
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "completed");
  assert.equal(result.cleanup, "terminated");
  assert.equal(result.stdout, "ok\n");
  assert.deepEqual(calls, [
    "create:deny-all",
    "wait",
    "upload:/workspace/src/core/example.ts",
    "exec",
    "terminate",
  ]);
});

test("refuses a plan without exact approval before calling driver", async () => {
  const input = {
    commands: ["npm run test:sandbox-policy"],
    files: [{ path: "src/core/example.ts", content: "ok" }],
    timeoutSeconds: 30,
    networkPolicy: "deny-all" as const,
  };
  const plan = buildSandboxExecutionPlan(input);
  const policy = buildSandboxLifecyclePolicy(plan);
  const { driver, calls } = mockDriver();
  await assert.rejects(
    runApprovedSandboxPlan({ plan, policy, driver }),
    /explicit approval/i,
  );
  assert.deepEqual(calls, []);
});

test("terminates after startup failure", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver({
    waitUntilRunning: async () => { calls.push("wait"); throw new Error("startup failed"); },
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.equal(result.cleanup, "terminated");
  assert.deepEqual(calls, ["create:deny-all", "wait", "terminate"]);
});

test("terminates after upload failure", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver({
    upload: async () => { calls.push("upload-failed"); throw new Error("upload failed"); },
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.equal(result.cleanup, "terminated");
  assert.ok(calls.includes("terminate"));
  assert.ok(!calls.includes("exec"));
});

test("terminates and reports nonzero command exit", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver({
    exec: async () => (async function* () {
      yield { type: "exit", exit_code: 2 } as const;
    })(),
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /exit code 2/);
  assert.equal(result.cleanup, "terminated");
  assert.ok(calls.includes("terminate"));
});

test("terminates and fails closed when output exceeds cap", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver({
    exec: async () => (async function* () {
      yield { type: "output", stream: "stdout", data: "x".repeat(200) } as const;
    })(),
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.equal(result.outputTruncated, true);
  assert.equal(result.cleanup, "terminated");
  assert.ok(calls.includes("terminate"));
});

test("reports cleanup uncertainty without claiming success", async () => {
  const { plan, policy } = approvedPlan();
  const { driver } = mockDriver({
    terminate: async () => { throw new Error("termination unavailable"); },
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.equal(result.cleanup, "unconfirmed");
  assert.match(result.error ?? "", /termination could not be confirmed/i);
});

test("does not upload or run if sandbox creation fails", async () => {
  const { plan, policy } = approvedPlan();
  const { driver, calls } = mockDriver({
    create: async () => { calls.push("create-failed"); throw new Error("create failed"); },
  });
  const result = await runApprovedSandboxPlan({ plan, policy, driver });
  assert.equal(result.status, "failed");
  assert.equal(result.sandboxId, null);
  assert.deepEqual(calls, ["create-failed"]);
});
