import type { SandboxExecutionPlan } from "./sandboxExecutionPlan";

export interface SandboxLifecycleLimits {
  startupTimeoutSeconds: number;
  cleanupTimeoutSeconds: number;
  maxOutputBytes: number;
}

export interface SandboxLifecyclePolicyResult {
  allowedToPrepare: boolean;
  executionEnabled: false;
  requiresExplicitApproval: true;
  createOnlyAfterApproval: true;
  waitForRunningBeforeUpload: true;
  terminateInFinally: true;
  limits: SandboxLifecycleLimits;
  stages: readonly [
    "validate-plan",
    "verify-exact-approval",
    "create-deny-all-sandbox",
    "record-sandbox-id",
    "wait-until-running",
    "upload-explicit-files",
    "run-allowlisted-commands-with-guest-timeout",
    "cap-and-classify-output",
    "verify-exit-code",
    "terminate-in-finally",
    "report-cleanup-status",
  ];
  errors: string[];
}

const DEFAULT_LIMITS: SandboxLifecycleLimits = {
  startupTimeoutSeconds: 120,
  cleanupTimeoutSeconds: 15,
  maxOutputBytes: 256_000,
};

/**
 * Produces a lifecycle safety contract only.
 * No SDK method is called and no remote resource is created or executed.
 */
export function buildSandboxLifecyclePolicy(
  plan: SandboxExecutionPlan,
  limits: Partial<SandboxLifecycleLimits> = {},
): SandboxLifecyclePolicyResult {
  const selectedLimits: SandboxLifecycleLimits = {
    startupTimeoutSeconds: limits.startupTimeoutSeconds ?? DEFAULT_LIMITS.startupTimeoutSeconds,
    cleanupTimeoutSeconds: limits.cleanupTimeoutSeconds ?? DEFAULT_LIMITS.cleanupTimeoutSeconds,
    maxOutputBytes: limits.maxOutputBytes ?? DEFAULT_LIMITS.maxOutputBytes,
  };
  const errors: string[] = [];

  if (!plan.valid || !plan.request || !plan.planHash) {
    errors.push("A valid content-bound execution plan is required.");
  }
  if (!plan.approved || plan.status !== "approved-plan-only") {
    errors.push("Explicit approval for this exact plan hash is required before Sandbox creation.");
  }
  if (plan.executionEnabled !== false) {
    errors.push("This policy module cannot enable execution.");
  }
  if (!Number.isInteger(selectedLimits.startupTimeoutSeconds) ||
      selectedLimits.startupTimeoutSeconds < 1 || selectedLimits.startupTimeoutSeconds > 300) {
    errors.push("Startup timeout must be between 1 and 300 seconds.");
  }
  if (!Number.isInteger(selectedLimits.cleanupTimeoutSeconds) ||
      selectedLimits.cleanupTimeoutSeconds < 1 || selectedLimits.cleanupTimeoutSeconds > 60) {
    errors.push("Cleanup timeout must be between 1 and 60 seconds.");
  }
  if (!Number.isInteger(selectedLimits.maxOutputBytes) ||
      selectedLimits.maxOutputBytes < 1 || selectedLimits.maxOutputBytes > 1_000_000) {
    errors.push("Output cap must be between 1 and 1,000,000 bytes.");
  }

  return {
    allowedToPrepare: errors.length === 0,
    executionEnabled: false,
    requiresExplicitApproval: true,
    createOnlyAfterApproval: true,
    waitForRunningBeforeUpload: true,
    terminateInFinally: true,
    limits: selectedLimits,
    stages: [
      "validate-plan",
      "verify-exact-approval",
      "create-deny-all-sandbox",
      "record-sandbox-id",
      "wait-until-running",
      "upload-explicit-files",
      "run-allowlisted-commands-with-guest-timeout",
      "cap-and-classify-output",
      "verify-exit-code",
      "terminate-in-finally",
      "report-cleanup-status",
    ],
    errors,
  };
}
