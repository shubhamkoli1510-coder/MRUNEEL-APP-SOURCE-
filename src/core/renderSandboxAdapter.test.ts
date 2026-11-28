import test from "node:test";
import assert from "node:assert/strict";
import { createRenderSandboxClient, getRenderSandboxReadiness } from "./renderSandboxAdapter";

test("reports missing Render credentials without exposing secret values", () => {
  const readiness = getRenderSandboxReadiness({});
  assert.equal(readiness.configured, false);
  assert.deepEqual(readiness.missing, ["RENDER_API_KEY", "RENDER_WORKSPACE_ID"]);
  assert.equal(JSON.stringify(readiness).includes("secret"), false);
});

test("rejects malformed workspace identifiers", () => {
  const readiness = getRenderSandboxReadiness({
    RENDER_API_KEY: "test-token",
    RENDER_WORKSPACE_ID: "not-a-workspace",
  });
  assert.equal(readiness.configured, false);
  assert.deepEqual(readiness.missing, ["RENDER_WORKSPACE_ID"]);
});

test("accepts configured server-side credentials", () => {
  const readiness = getRenderSandboxReadiness({
    RENDER_API_KEY: "test-token",
    RENDER_WORKSPACE_ID: "tea-dbotcbhsrm7s73d24jrg",
  });
  assert.equal(readiness.configured, true);
  assert.deepEqual(readiness.missing, []);
});

test("fails closed before constructing a client when credentials are absent", () => {
  assert.throws(
    () => createRenderSandboxClient({}),
    /RENDER_API_KEY, RENDER_WORKSPACE_ID/,
  );
});

test("constructs an SDK client without making a network request", () => {
  const client = createRenderSandboxClient({
    RENDER_API_KEY: "test-token",
    RENDER_WORKSPACE_ID: "tea-dbotcbhsrm7s73d24jrg",
  });
  assert.ok(client.sandboxes);
});
