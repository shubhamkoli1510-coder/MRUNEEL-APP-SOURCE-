export type SandboxNetworkPolicy = "deny-all";

export interface SandboxJobRequest {
  commands: string[];
  inputPaths: string[];
  timeoutSeconds: number;
  networkPolicy: SandboxNetworkPolicy;
}

export interface SandboxJobPolicyResult {
  allowed: boolean;
  errors: string[];
  request: SandboxJobRequest;
}

const MAX_COMMANDS = 8;
const MAX_INPUT_FILES = 40;
const MAX_TIMEOUT_SECONDS = 600;
const SAFE_COMMANDS = new Set(["npm run test", "npm run lint", "npm run build"]);
const SAFE_TEST_SCRIPT = /^npm run test:[a-z0-9-]+$/;

function isSafeInputPath(raw: string): boolean {
  if (typeof raw !== "string" || !raw.trim()) return false;
  const path = raw.trim().replace(/\\/g, "/");
  if (path.startsWith("/") || path.split("/").some(part => !part || part === "." || part === "..")) return false;
  if (/(^|\/)(\.env(?:\.|$)|\.git|node_modules|dist|build|secrets?)(\/|$)/i.test(path)) return false;
  if (/\.(?:pem|key|p12|pfx|jks)$/i.test(path)) return false;
  return path.startsWith("src/") || path.startsWith("android/app/src/") ||
    ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts"].includes(path);
}

function isSafeCommand(command: string): boolean {
  return SAFE_COMMANDS.has(command) || SAFE_TEST_SCRIPT.test(command);
}

/**
 * Builds a constrained job request for a future isolated sandbox adapter.
 * This is policy validation only: it does not create a sandbox or execute code.
 */
export function validateSandboxJobRequest(input: Partial<SandboxJobRequest>): SandboxJobPolicyResult {
  const errors: string[] = [];
  const commands = Array.isArray(input.commands) ? input.commands : [];
  const inputPaths = Array.isArray(input.inputPaths) ? input.inputPaths : [];
  const timeoutSeconds = Number.isInteger(input.timeoutSeconds) ? Number(input.timeoutSeconds) : 0;

  if (!commands.length || commands.length > MAX_COMMANDS) errors.push(`Sandbox job must contain 1–${MAX_COMMANDS} commands.`);
  for (const command of commands) {
    if (typeof command !== "string" || command.length > 120 || !isSafeCommand(command)) {
      errors.push(`Command is not in the test/build allowlist: ${String(command).slice(0, 120)}`);
    }
  }
  if (new Set(commands).size !== commands.length) errors.push("Duplicate commands are not allowed.");
  if (!inputPaths.length || inputPaths.length > MAX_INPUT_FILES) errors.push(`Sandbox input must contain 1–${MAX_INPUT_FILES} explicit paths.`);
  for (const path of inputPaths) {
    if (!isSafeInputPath(path)) errors.push(`Unsafe or unsupported sandbox input path: ${String(path).slice(0, 160)}`);
  }
  if (new Set(inputPaths).size !== inputPaths.length) errors.push("Duplicate input paths are not allowed.");
  if (timeoutSeconds < 1 || timeoutSeconds > MAX_TIMEOUT_SECONDS) errors.push(`Sandbox timeout must be 1–${MAX_TIMEOUT_SECONDS} seconds.`);
  if (input.networkPolicy !== "deny-all") errors.push("Sandbox network policy must be deny-all.");

  return {
    allowed: errors.length === 0,
    errors,
    request: {
      commands: commands.filter((value): value is string => typeof value === "string"),
      inputPaths: inputPaths.filter((value): value is string => typeof value === "string"),
      timeoutSeconds,
      networkPolicy: "deny-all",
    },
  };
}
