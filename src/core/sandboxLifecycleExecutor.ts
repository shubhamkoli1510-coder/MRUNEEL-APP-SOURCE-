import type { SandboxExecutionPlan } from "./sandboxExecutionPlan";
import type { SandboxLifecyclePolicyResult } from "./sandboxLifecyclePolicy";

export type SandboxExecEvent =
  | { type: "output"; stream: "stdout" | "stderr"; data: string }
  | { type: "exit"; exit_code: number };

export interface SandboxLifecycleDriver {
  create(input: {
    timeoutSeconds: number;
    networkPolicy: { type: "deny-all" };
  }): Promise<{ id: string }>;
  waitUntilRunning(id: string, options: { timeoutMs: number }): Promise<unknown>;
  upload(id: string, remotePath: string, data: Uint8Array): Promise<unknown>;
  exec(id: string, command: string): Promise<AsyncIterable<SandboxExecEvent>>;
  terminate(id: string): Promise<unknown>;
}

export interface SandboxLifecycleRunResult {
  status: "completed" | "failed";
  sandboxId: string | null;
  exitCodes: number[];
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
  cleanup: "terminated" | "unconfirmed" | "not-needed";
  error?: string;
}

export interface SandboxLifecycleRunOptions {
  plan: SandboxExecutionPlan;
  policy: SandboxLifecyclePolicyResult;
  driver: SandboxLifecycleDriver;
}

/** Shell-quotes one value for the SDK's bash -c execution model. */
function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + " timed out.")), timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Executes only a content-bound, explicitly approved plan through an injected driver.
 * This is not wired to an API route or app UI; tests use a mock driver.
 */
export async function runApprovedSandboxPlan(
  options: SandboxLifecycleRunOptions,
): Promise<SandboxLifecycleRunResult> {
  const { plan, policy, driver } = options;
  if (!plan.valid || !plan.approved || plan.status !== "approved-plan-only" ||
      !plan.request || !plan.planHash) {
    throw new Error("Sandbox execution requires explicit approval for the exact plan hash.");
  }
  if (!policy.allowedToPrepare) {
    throw new Error("Sandbox lifecycle policy rejected this execution.");
  }
  if (policy.executionEnabled !== true) {
    throw new Error("Sandbox execution is not enabled.");
  }
  if (plan.request.networkPolicy !== "deny-all") {
    throw new Error("Sandbox network policy must be deny-all.");
  }

  let sandboxId: string | null = null;
  let primaryError: unknown;
  let exitCodes: number[] = [];
  let stdout = "";
  let stderr = "";
  let outputBytes = 0;
  let outputTruncated = false;
  let cleanup: SandboxLifecycleRunResult["cleanup"] = "not-needed";

  try {
    const sandbox = await withDeadline(
      driver.create({
        timeoutSeconds: plan.request.timeoutSeconds,
        networkPolicy: { type: "deny-all" },
      }),
      policy.limits.startupTimeoutSeconds * 1000,
      "Sandbox creation",
    );
    if (!sandbox || typeof sandbox.id !== "string" || !sandbox.id.trim()) {
      throw new Error("Render did not return a usable Sandbox ID.");
    }
    sandboxId = sandbox.id;

    const startupDeadlineMs = policy.limits.startupTimeoutSeconds * 1000;
    await withDeadline(
      driver.waitUntilRunning(sandboxId, { timeoutMs: startupDeadlineMs }),
      startupDeadlineMs,
      "Sandbox startup",
    );

    for (const file of plan.files) {
      const remotePath = "/workspace/" + file.path;
      await withDeadline(
        driver.upload(sandboxId, remotePath, new TextEncoder().encode(file.content)),
        policy.limits.startupTimeoutSeconds * 1000,
        "Sandbox file upload",
      );
    }

    const batchTimeoutMs = (plan.request.timeoutSeconds * plan.request.commands.length + 2) * 1000;
  const batchStartedAt = Date.now();
  for (const command of plan.request.commands) {
    const remainingBatchMs = batchTimeoutMs - (Date.now() - batchStartedAt);
    if (remainingBatchMs <= 0) throw new Error("Sandbox command batch timed out.");
      const boundedCommand = "timeout -k 2 " + plan.request.timeoutSeconds +
        " bash -lc " + shellQuote(command);
      const events = await withDeadline(
        driver.exec(sandboxId, boundedCommand),
        policy.limits.startupTimeoutSeconds * 1000,
        "Sandbox command setup",
      );
      let sawExit = false;
      const iterator = events[Symbol.asyncIterator]();
      const streamDeadlineMs = Math.min((plan.request.timeoutSeconds + 2) * 1000, batchTimeoutMs - (Date.now() - batchStartedAt));
      const streamStartedAt = Date.now();
      while (true) {
        const remainingStreamMs = Math.min(
          streamDeadlineMs - (Date.now() - streamStartedAt),
          batchTimeoutMs - (Date.now() - batchStartedAt),
        );
        if (remainingStreamMs <= 0) {
          throw new Error("Sandbox command event stream timed out.");
        }
        const next = await withDeadline(iterator.next(), remainingStreamMs, "Sandbox command event stream");
        if (next.done) break;
        const event = next.value;
        if (sawExit) {
          throw new Error("Sandbox command emitted an event after its exit event.");
        }
        if (!event || typeof event !== "object") {
          throw new Error("Sandbox command emitted an invalid event.");
        }
        if (event.type === "output") {
          if ((event.stream !== "stdout" && event.stream !== "stderr") ||
              typeof event.data !== "string") {
            throw new Error("Sandbox command emitted malformed output.");
          }
          const bytes = new TextEncoder().encode(event.data).byteLength;
          const remaining = Math.max(0, policy.limits.maxOutputBytes - outputBytes);
          const accepted = Math.min(bytes, remaining);
          if (accepted > 0) {
            const clipped = new TextDecoder().decode(new TextEncoder().encode(event.data).slice(0, accepted));
            if (event.stream === "stderr") stderr += clipped;
            else stdout += clipped;
            outputBytes += accepted;
          }
          if (accepted < bytes) {
            outputTruncated = true;
            throw new Error("Sandbox output exceeded the configured byte limit.");
          }
        } else if (event.type === "exit") {
          if (!Number.isInteger(event.exit_code)) {
            throw new Error("Sandbox command emitted an invalid exit code.");
          }
          sawExit = true;
          exitCodes.push(event.exit_code);
          if (event.exit_code !== 0) {
            throw new Error("Sandbox command failed with exit code " + event.exit_code + ".");
          }
        } else {
          throw new Error("Sandbox command emitted an unknown event type.");
        }
      }
      if (!sawExit) throw new Error("Sandbox command ended without a verified exit event.");
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (sandboxId) {
      try {
        await withDeadline(
          driver.terminate(sandboxId),
          policy.limits.cleanupTimeoutSeconds * 1000,
          "Sandbox termination",
        );
        cleanup = "terminated";
      } catch {
        cleanup = "unconfirmed";
      }
    }
  }

  const failed = primaryError !== undefined || cleanup === "unconfirmed";
  const message = primaryError instanceof Error
    ? primaryError.message
    : primaryError === undefined ? undefined : "Sandbox execution failed.";
  return {
    status: failed ? "failed" : "completed",
    sandboxId,
    exitCodes,
    stdout,
    stderr,
    outputTruncated,
    cleanup,
    ...(message ? { error: message } : cleanup === "unconfirmed"
      ? { error: "Sandbox termination could not be confirmed; retain the Sandbox ID for recovery." }
      : {}),
  };
}
