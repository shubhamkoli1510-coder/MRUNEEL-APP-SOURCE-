import test from "node:test";
import assert from "node:assert/strict";
import { canRouteToTool, getTool, listTools } from "./toolsRegistry";

test("registry contains unique tool ids", () => {
  const all = listTools({ includeDisabled: true });
  assert.equal(new Set(all.map((tool) => tool.id)).size, all.length);
});
test("device bridge remains disabled while research and coding tools are enabled", () => {
  assert.equal(canRouteToTool("device_bridge"), false);
  assert.equal(canRouteToTool("coding_lab"), true);
});
test("only enabled tools appear in default list", () => {
  assert.deepEqual(listTools().map((tool) => tool.id), ["conversation", "research", "coding_lab"]);
});
test("high-impact external action is approval-gated", () => {
  const tool = getTool("external_action");
  assert.equal(tool?.risk, "high");
  assert.equal(tool?.requiresApproval, true);
  assert.equal(tool?.enabled, false);
});
test("unknown tool ids return undefined and cannot route", () => {
  assert.equal(getTool("made_up"), undefined);
  assert.equal(canRouteToTool("made_up"), false);
});
