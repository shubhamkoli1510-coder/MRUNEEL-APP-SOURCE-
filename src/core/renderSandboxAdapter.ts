import { Render } from "@renderinc/sdk";
import type { SandboxLifecycleDriver } from "./sandboxLifecycleExecutor";

export interface RenderSandboxEnvironment {
  RENDER_API_KEY?: string;
  RENDER_WORKSPACE_ID?: string;
}

export interface RenderSandboxReadiness {
  configured: boolean;
  missing: Array<"RENDER_API_KEY" | "RENDER_WORKSPACE_ID">;
  workspaceIdPresent: boolean;
}

export function getRenderSandboxReadiness(
  env: RenderSandboxEnvironment = process.env,
): RenderSandboxReadiness {
  const missing: RenderSandboxReadiness["missing"] = [];
  if (typeof env.RENDER_API_KEY !== "string" || !env.RENDER_API_KEY.trim()) {
    missing.push("RENDER_API_KEY");
  }
  if (typeof env.RENDER_WORKSPACE_ID !== "string" || !/^tea-[a-z0-9]+$/i.test(env.RENDER_WORKSPACE_ID.trim())) {
    missing.push("RENDER_WORKSPACE_ID");
  }
  return {
    configured: missing.length === 0,
    missing,
    workspaceIdPresent: typeof env.RENDER_WORKSPACE_ID === "string" && /^tea-[a-z0-9]+$/i.test(env.RENDER_WORKSPACE_ID.trim()),
  };
}

/**
 * Creates an SDK client only. This function makes no Render API request and
 * does not create a Sandbox or execute commands.
 */
export function createRenderSandboxClient(
  env: RenderSandboxEnvironment = process.env,
): Render {
  const readiness = getRenderSandboxReadiness(env);
  if (!readiness.configured) {
    throw new Error(`Render Sandbox integration is not configured: ${readiness.missing.join(", ")}.`);
  }

  return new Render({
    token: env.RENDER_API_KEY!.trim(),
    ownerId: env.RENDER_WORKSPACE_ID!.trim() as `tea-${string}`,
  });
}
/**
 * Adapts the pinned Render SDK v1.9.0 to the lifecycle executor contract.
 * Constructing this adapter makes no API request; calls happen only if a caller
 * explicitly invokes the returned driver's methods.
 */
export function createRenderSandboxDriver(client: Render): SandboxLifecycleDriver {
  return {
    async create(input) {
      const sandbox = await client.sandboxes.create({
        timeoutSeconds: input.timeoutSeconds,
        networkPolicy: input.networkPolicy,
        wait: false,
      });
      return { id: sandbox.id };
    },
    async waitUntilRunning(id, options) {
      return client.sandboxes.waitUntilRunning(id, { timeoutMs: options.timeoutMs });
    },
    async upload(id, remotePath, data) {
      await client.sandboxes.upload(id, remotePath, data);
    },
    async exec(id, command) {
      return client.sandboxes.exec(id, command);
    },
    async terminate(id) {
      await client.sandboxes.terminate(id);
    },
  };
}
