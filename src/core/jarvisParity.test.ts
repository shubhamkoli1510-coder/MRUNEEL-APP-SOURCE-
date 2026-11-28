import test from "node:test";
import assert from "node:assert/strict";
import { createTaskPlan } from "./taskPlanner";
import { capabilitySummary, getCapability, listCapabilities } from "./jarvisParity";

test("coding request produces isolated patch, tests, review and approval steps", () => {
  const plan = createTaskPlan("debug this code and prepare a patch");
  assert.equal(plan.status, "plan_only");
  assert.ok(plan.steps.some((step) => step.id === "verify"));
  assert.ok(plan.steps.some((step) => step.id === "approval" && step.requiresApproval));
  assert.ok(plan.steps.every((step) => step.status === "proposed"));
});

test("sensitive external action requires explicit approval", () => {
  const plan = createTaskPlan("send a message to my contact");
  assert.equal(plan.requiresApproval, true);
  assert.ok(plan.steps.find((step) => step.id === "execute")?.requiresApproval);
});

test("device task is planned but not executed", () => {
  const plan = createTaskPlan("open Wi-Fi settings");
  assert.equal(plan.status, "plan_only");
  assert.ok(plan.guardrails.some((item) => item.includes("no tool")));
  assert.ok(plan.steps.some((step) => step.id === "permission"));
});

test("unknown task asks for clarification", () => {
  const plan = createTaskPlan("make the thing better");
  assert.equal(plan.steps[0]?.id, "clarify");
});

test("capability inventory accurately marks planned and partial domains", () => {
  const summary = capabilitySummary();
  assert.equal(summary.total, 12);
  assert.ok(summary.partial > 0 && summary.planned > 0);
  assert.equal(getCapability("research")?.status, "planned");
  assert.ok(listCapabilities("partial").every((item) => item.status === "partial"));
});
