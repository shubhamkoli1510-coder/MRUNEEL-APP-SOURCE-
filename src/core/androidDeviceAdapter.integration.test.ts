import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createTaskPlan } from "./taskPlanner";
import { executePlanStep } from "./taskExecutor";
import { createAndroidDeviceAdapter } from "./androidDeviceAdapter";

test("planned direct command can pass through executor to allowlisted Android adapter", async () => {
  const opened: string[] = [];
  const adapter = createAndroidDeviceAdapter({
    isAndroid: () => true,
    openScreen: async (target) => { opened.push(target); },
    volumeUp: async () => ({ volume: 7, max: 15 }),
    volumeDown: async () => ({ volume: 6, max: 15 }),
    launchApp: async (appId) => ({ appId, packageName: "com.whatsapp" }),
    requestSystemAlarm: async (hour, minute) => ({ hour, minute, awaitingUserConfirmation: true }),
  });
  const plan = createTaskPlan("open wifi settings");
  const result = await executePlanStep({ plan, adapter, approved: true });
  assert.equal(result.status, "completed");
  assert.equal(result.executionStarted, true);
  assert.deepEqual(opened, ["wifi"]);
});

test("device executor refuses direct command when adapter says platform unavailable", async () => {
  const adapter = createAndroidDeviceAdapter({
    isAndroid: () => false,
    openScreen: async () => { assert.fail("must not invoke native action"); },
    volumeUp: async () => ({ volume: 1, max: 10 }),
    volumeDown: async () => ({ volume: 1, max: 10 }),
    launchApp: async (appId) => ({ appId, packageName: "com.whatsapp" }),
    requestSystemAlarm: async (hour, minute) => ({ hour, minute, awaitingUserConfirmation: true }),
  });
  const result = await executePlanStep({ plan: createTaskPlan("open camera"), adapter, approved: true });
  assert.equal(result.status, "failed");
  assert.equal(result.executionStarted, true);
  assert.match(result.summary, /unavailable/);
});

test("executor confirms a planned allowlisted app launch", async () => {
  const launched: string[] = [];
  const adapter = createAndroidDeviceAdapter({
    isAndroid: () => true,
    openScreen: async () => {},
    volumeUp: async () => ({ volume: 1, max: 10 }),
    volumeDown: async () => ({ volume: 1, max: 10 }),
    launchApp: async (appId) => { launched.push(appId); return { appId, packageName: "com.whatsapp" }; },
    requestSystemAlarm: async (hour, minute) => ({ hour, minute, awaitingUserConfirmation: true }),
  });
  const plan = createTaskPlan("open WhatsApp");
  const result = await executePlanStep({ plan, adapter, approved: true });
  assert.equal(result.status, "completed");
  assert.deepEqual(launched, ["whatsapp"]);
});

test("plan/executor routes alarm setup to a system clock handoff", async () => {
  const requested: number[] = [];
  const adapter = createAndroidDeviceAdapter({
    isAndroid: () => true,
    openScreen: async () => {},
    volumeUp: async () => ({ volume: 1, max: 10 }),
    volumeDown: async () => ({ volume: 1, max: 10 }),
    launchApp: async (appId) => ({ appId, packageName: "com.whatsapp" }),
    requestSystemAlarm: async (hour, minute) => { requested.push(hour, minute); return { hour, minute, awaitingUserConfirmation: true }; },
  });
  const result = await executePlanStep({ plan: createTaskPlan("set alarm 7:30"), adapter, approved: true });
  assert.equal(result.status, "completed");
  assert.match(result.summary, /awaiting user confirmation/i);
  assert.deepEqual(requested, [7, 30]);
});
