import { test } from "node:test";
import { strict as assert } from "node:assert";
import { executePlanStep } from "./taskExecutor";
import { createTaskPlan } from "./taskPlanner";

test("blocks execution without approval", async () => {
  let called = false;
  const plan = createTaskPlan("open camera");
  const result = await executePlanStep({ plan, adapter: { id: "fake", risk: "medium", execute: async () => { called = true; return { ok: true, summary: "done" }; } } });
  assert.equal(result.status, "blocked");
  assert.equal(called, false);
  assert.equal(result.executionStarted, false);
});
test("reports missing adapter without execution", async () => {
  const result = await executePlanStep({ plan: createTaskPlan("open camera"), approved: true });
  assert.equal(result.status, "adapter_unavailable");
  assert.equal(result.executionStarted, false);
});
test("executes only one approved step and reports adapter result", async () => {
  const result = await executePlanStep({ plan: createTaskPlan("open camera"), approved: true, adapter: { id: "test", risk: "medium", execute: async (_request, step) => ({ ok: true, summary: step.id + " verified" }) } });
  assert.equal(result.status, "completed");
  assert.equal(result.stepId, "execute");
  assert.equal(result.summary, "execute verified");
});
test("does not falsely report failed adapter as completed", async () => {
  const result = await executePlanStep({ plan: createTaskPlan("open camera"), approved: true, adapter: { id: "test", risk: "medium", execute: async () => ({ ok: false, summary: "denied" }) } });
  assert.equal(result.status, "failed");
  assert.equal(result.summary, "denied");
});
test("handles thrown adapter error safely", async () => {
  const result = await executePlanStep({ plan: createTaskPlan("open camera"), approved: true, adapter: { id: "test", risk: "medium", execute: async () => { throw new Error("secret internal detail"); } } });
  assert.equal(result.status, "failed");
  assert.match(result.summary, /not reported as successful/);
});
