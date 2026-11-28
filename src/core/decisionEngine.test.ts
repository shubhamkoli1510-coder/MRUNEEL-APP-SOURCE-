import test from "node:test";
import assert from "node:assert/strict";
import { decide } from "./decisionEngine";

test("routes coding requests to coding", () => {
  assert.equal(decide("Fix this bug in App.tsx").intent, "coding");
});
test("recognizes Marathi device requests and requires confirmation", () => {
  const result = decide("Bluetooth चालू कर");
  assert.equal(result.intent, "device");
  assert.equal(result.requiresApproval, true);
});
test("sensitive send requests always require approval", () => {
  const result = decide("Send this message to my contact");
  assert.equal(result.intent, "sensitive");
  assert.equal(result.risk, "high");
  assert.equal(result.requiresApproval, true);
});
test("research requests route to research", () => {
  assert.equal(decide("Search for latest AI news").intent, "research");
});
test("empty requests are safely unknown", () => {
  const result = decide("  ");
  assert.equal(result.intent, "unknown");
  assert.equal(result.requiresApproval, false);
});
test("normalizes whitespace", () => {
  assert.equal(decide("  explain   this  ").normalizedInput, "explain this");
});
