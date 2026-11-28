import test from "node:test";
import assert from "node:assert/strict";
import { authenticateBiometric } from "./security";

test("biometric fallback never reports simulated success", async () => {
  const result = await authenticateBiometric();
  assert.equal(result.success, false);
  assert.match(result.message, /not implemented|use your PIN/i);
});
