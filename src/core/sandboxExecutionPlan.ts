import { createHash } from "node:crypto";
import { validateSandboxJobRequest, type SandboxJobRequest } from "./sandboxJobPolicy";

const MAX_FILE_CHARACTERS = 20_000;
const MAX_TOTAL_CHARACTERS = 50_000;

export interface SandboxInputFile {
  path: string;
  content: string;
}

export interface SandboxExecutionPlanInput {
  commands: string[];
  files: SandboxInputFile[];
  timeoutSeconds: number;
  networkPolicy: "deny-all";
  /** Must equal the hash returned by a prior review of this exact plan. */
  approvedPlanHash?: string;
}

export interface SandboxExecutionPlan {
  valid: boolean;
  approved: boolean;
  executionEnabled: false;
  status: "invalid" | "review-required" | "approved-plan-only";
  planHash: string | null;
  errors: string[];
  request: SandboxJobRequest | null;
  files: SandboxInputFile[];
}

/**
 * Builds a deterministic, content-bound plan for human review.
 * This module never creates a Render Sandbox, uploads files, or runs commands.
 */
export function buildSandboxExecutionPlan(
  input: Partial<SandboxExecutionPlanInput>,
): SandboxExecutionPlan {
  const files = Array.isArray(input.files) ? input.files : [];
  const errors: string[] = [];

  if (!files.length) errors.push("At least one explicit source file is required.");
  if (files.some((file) => !file || typeof file.path !== "string" || typeof file.content !== "string")) {
    errors.push("Every sandbox input must contain a string path and string content.");
  }

  const safeFiles = files.filter(
    (file): file is SandboxInputFile =>
      !!file && typeof file.path === "string" && typeof file.content === "string",
  );

  for (const file of safeFiles) {
    if (!file.content.trim()) errors.push(`Sandbox input file is empty: ${file.path.slice(0, 160)}`);
    if (file.content.length > MAX_FILE_CHARACTERS) {
      errors.push(`Sandbox input file exceeds ${MAX_FILE_CHARACTERS} characters: ${file.path.slice(0, 160)}`);
    }
  }

  const totalCharacters = safeFiles.reduce((total, file) => total + file.content.length, 0);
  if (totalCharacters > MAX_TOTAL_CHARACTERS) {
    errors.push(`Sandbox input exceeds the ${MAX_TOTAL_CHARACTERS}-character aggregate limit.`);
  }

  const requestResult = validateSandboxJobRequest({
    commands: input.commands,
    inputPaths: safeFiles.map((file) => file.path),
    timeoutSeconds: input.timeoutSeconds,
    networkPolicy: input.networkPolicy,
  });

  errors.push(...requestResult.errors);
  if (new Set(safeFiles.map((file) => file.path)).size !== safeFiles.length) {
    errors.push("Duplicate sandbox input file paths are not allowed.");
  }

  if (errors.length) {
    return {
      valid: false,
      approved: false,
      executionEnabled: false,
      status: "invalid",
      planHash: null,
      errors: [...new Set(errors)],
      request: null,
      files: [],
    };
  }

  // The hash binds approval to exact commands, limits, paths, and source contents.
  const canonicalPlan = JSON.stringify({
    commands: requestResult.request.commands,
    timeoutSeconds: requestResult.request.timeoutSeconds,
    networkPolicy: requestResult.request.networkPolicy,
    files: safeFiles.map((file) => ({ path: file.path, content: file.content })),
  });
  const planHash = createHash("sha256").update(canonicalPlan).digest("hex");
  const approved = typeof input.approvedPlanHash === "string" &&
    input.approvedPlanHash.length === 64 &&
    input.approvedPlanHash === planHash;

  return {
    valid: true,
    approved,
    executionEnabled: false,
    status: approved ? "approved-plan-only" : "review-required",
    planHash,
    errors: [],
    request: requestResult.request,
    files: safeFiles.map((file) => ({ path: file.path, content: file.content })),
  };
}
