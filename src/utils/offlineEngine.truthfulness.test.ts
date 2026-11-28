import test from "node:test";
import assert from "node:assert/strict";
import { parseOfflineCommand } from "./offlineEngine";

test("alarm command does not claim OS alarm is scheduled", () => {
  const result = parseOfflineCommand("set alarm 7:30", "en-US");
  assert.equal(result.type, "SET_ALARM");
  assert.match(result.spokenResponse, /system alarm has not been scheduled/i);
});

test("reminder command does not promise future notification", () => {
  const result = parseOfflineCommand("remind me to drink water", "en-US");
  assert.equal(result.type, "SET_REMINDER");
  assert.match(result.spokenResponse, /notification has not been scheduled/i);
});

test("battery response does not fabricate a percentage when telemetry is absent", () => {
  const result = parseOfflineCommand("check battery", "en-US");
  assert.equal(result.type, "CHECK_BATTERY");
  assert.match(result.spokenResponse, /data is unavailable/i);
  assert.doesNotMatch(result.spokenResponse, /84%/);
});

test("battery response uses supplied telemetry", () => {
  const result = parseOfflineCommand("check battery", "en-US", { batteryLevel: 0.61, isCharging: true });
  assert.match(result.spokenResponse, /61%/);
  assert.match(result.spokenResponse, /Charging/i);
});

test("alarm request without a time asks for clarification instead of defaulting", () => {
  const result = parseOfflineCommand("set alarm", "en-US");
  assert.equal(result.type, "SET_ALARM");
  assert.equal(result.payload?.time, undefined);
  assert.match(result.spokenResponse, /what time/i);
});
