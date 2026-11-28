import test from "node:test";
import assert from "node:assert/strict";
import { routeRequest } from "./brainRouter";

test("routes conversational request to enabled conversation tool", () => {
  const result = routeRequest("Explain this in simple words");
  assert.equal(result.selectedToolId, "conversation");
  assert.equal(result.disposition, "route");
  assert.equal(result.available, true);
  assert.equal(result.requiresApproval, false);
});
test("research intent routes to enabled grounded research adapter", () => {
  const result = routeRequest("Search for latest AI news");
  assert.equal(result.selectedToolId, "research");
  assert.equal(result.disposition, "route");
  assert.equal(result.available, true);
});
test("coding request points to coding lab but does not execute", () => {
  const result = routeRequest("Fix this bug in App.tsx");
  assert.equal(result.selectedToolId, "coding_lab");
  assert.equal(result.disposition, "approval_required");
  assert.equal(result.available, false);
  assert.equal(result.requiresApproval, true);
});
test("device request remains gated and disabled", () => {
  const result = routeRequest("Bluetooth चालू कर");
  assert.equal(result.selectedToolId, "device_bridge");
  assert.equal(result.disposition, "approval_required");
  assert.equal(result.available, false);
});
test("sensitive external action is never routed automatically", () => {
  const result = routeRequest("Send this message to my contact");
  assert.equal(result.selectedToolId, "external_action");
  assert.equal(result.disposition, "approval_required");
  assert.equal(result.requiresApproval, true);
  assert.equal(result.available, false);
});
test("empty or unknown input has no route", () => {
  assert.equal(routeRequest("  ").disposition, "no_route");
  assert.equal(routeRequest("abracadabra").disposition, "no_route");
});
