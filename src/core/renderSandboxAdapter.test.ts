import test from "node:test";
import assert from "node:assert/strict";
import { createRenderSandboxClient, createRenderSandboxDriver, getRenderSandboxReadiness } from "./renderSandboxAdapter";
import type { Render } from "@renderinc/sdk";

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


test("maps lifecycle driver operations to Render SDK v1.9.0 without eager calls", async () => {
  const calls: unknown[][] = [];
  const stream = (async function* () {
    yield { type: "exit", exit_code: 0 } as const;
  })();
  const fake = {
    sandboxes: {
      create: async (input: unknown) => { calls.push(["create", input]); return { id: "sbx-mock" }; },
      waitUntilRunning: async (id: string, options: unknown) => { calls.push(["wait", id, options]); return {}; },
      upload: async (id: string, path: string, data: Uint8Array) => { calls.push(["upload", id, path, data.byteLength]); },
      exec: async (id: string, command: string) => { calls.push(["exec", id, command]); return stream; },
      terminate: async (id: string) => { calls.push(["terminate", id]); },
    },
  } as unknown as Render;
  const driver = createRenderSandboxDriver(fake);
  assert.deepEqual(calls, []);

  assert.deepEqual(await driver.create({
    timeoutSeconds: 30,
    networkPolicy: { type: "deny-all" },
  }), { id: "sbx-mock" });
  await driver.waitUntilRunning("sbx-mock", { timeoutMs: 5000 });
  await driver.upload("sbx-mock", "/workspace/a.ts", new Uint8Array([1, 2]));
  assert.equal(await driver.exec("sbx-mock", "npm run test"), stream);
  await driver.terminate("sbx-mock");

  assert.deepEqual(calls.map((call) => call[0]), [
    "create", "wait", "upload", "exec", "terminate",
  ]);
  assert.deepEqual(calls[0][1], {
    timeoutSeconds: 30,
    networkPolicy: { type: "deny-all" },
    wait: false,
  });
});
