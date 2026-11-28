import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMemoryWrite } from "./memoryPolicy";

test("rejects empty memory", () => {
  assert.equal(evaluateMemoryWrite({ text: " ", sensitivity: "ordinary", explicitConsent: true }).decision, "blocked");
});
test("blocks secrets regardless of consent", () => {
  const result = evaluateMemoryWrite({ text: "password/token", sensitivity: "secret", explicitConsent: true });
  assert.equal(result.decision, "blocked");
  assert.equal(result.requiresApproval, false);
});
test("sensitive data needs item-specific approval", () => {
  const result = evaluateMemoryWrite({ text: "sensitive note", sensitivity: "sensitive", explicitConsent: true });
  assert.equal(result.decision, "approval_required");
  assert.equal(result.requiresApproval, true);
});
test("ordinary memory without consent is held", () => {
  assert.equal(evaluateMemoryWrite({ text: "remember my preference", sensitivity: "ordinary", explicitConsent: false }).decision, "approval_required");
});
test("ordinary memory with consent can be handed to a storage adapter", () => {
  assert.equal(evaluateMemoryWrite({ text: "remember my preference", sensitivity: "ordinary", explicitConsent: true }).decision, "allow_with_consent");
});
