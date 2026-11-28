import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createAndroidDeviceAdapter } from "./androidDeviceAdapter";

test("opens only a parsed allowlisted screen on Android", async () => {
  const opened: string[] = [];
  const adapter = createAndroidDeviceAdapter({ isAndroid: () => true, openScreen: async (t) => { opened.push(t); }, volumeUp: async () => ({volume:2,max:10}), volumeDown: async () => ({volume:1,max:10}) });
  const result = await adapter.execute("open wifi settings", {id:"execute",title:"execute",purpose:"",risk:"medium",requiresApproval:true,status:"proposed"});
  assert.equal(result.ok, true); assert.deepEqual(opened, ["wifi"]);
});
test("does not call native port for unsupported requests", async () => {
  let called = false;
  const adapter = createAndroidDeviceAdapter({ isAndroid: () => true, openScreen: async () => { called = true; }, volumeUp: async () => ({volume:2,max:10}), volumeDown: async () => ({volume:1,max:10}) });
  const result = await adapter.execute("delete all files", {id:"execute",title:"execute",purpose:"",risk:"medium",requiresApproval:true,status:"proposed"});
  assert.equal(result.ok, false); assert.equal(called, false);
});
test("refuses to execute on non-Android platforms", async () => {
  let called = false;
  const adapter = createAndroidDeviceAdapter({ isAndroid: () => false, openScreen: async () => { called = true; }, volumeUp: async () => ({volume:2,max:10}), volumeDown: async () => ({volume:1,max:10}) });
  const result = await adapter.execute("open camera", {id:"execute",title:"execute",purpose:"",risk:"medium",requiresApproval:true,status:"proposed"});
  assert.equal(result.ok, false); assert.equal(called, false);
});
test("returns actual volume reading from injected native result", async () => {
  const adapter = createAndroidDeviceAdapter({ isAndroid: () => true, openScreen: async () => {}, volumeUp: async () => ({volume:4,max:15}), volumeDown: async () => ({volume:3,max:15}) });
  const result = await adapter.execute("volume up", {id:"execute",title:"execute",purpose:"",risk:"medium",requiresApproval:true,status:"proposed"});
  assert.equal(result.ok, true); assert.deepEqual(result.data, {volume:4,max:15});
});
