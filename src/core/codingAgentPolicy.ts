export interface CodingAgentFileProposal {
  path: string;
  content: string;
}

export interface CodingAgentCommitProposal {
  task: string;
  approved: boolean;
  files: CodingAgentFileProposal[];
}

export interface CodingAgentPolicyResult {
  allowed: boolean;
  errors: string[];
  normalizedFiles: CodingAgentFileProposal[];
  branchName: string;
}

const MAX_FILES = 5;
const MAX_FILE_CHARS = 20_000;
const MAX_TOTAL_CHARS = 50_000;

const blockedPathPatterns = [
  /^\.github\//i,
  /^android\//i,
  /^server\.ts$/i,
  /^package(?:-lock)?\.json$/i,
  /^capacitor\.config/i,
  /(^|\/)\.env(?:$|[./])/i,
  /(^|\/)secrets?\//i,
  /\.(?:pem|key|p12|pfx|jks)$/i,
  /(^|\/)(security|auth|permissions?|devicebridge|offlineengine|speechservice|memorymanager|lockscreen|androidpermissionshub|settingsmodal)(\.[^/]+)?$/i,
];

const secretPatterns = [
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/,
];

function normalizePath(raw: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const path = raw.trim().replace(/\\/g, "/");
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.split("/").some((part) => part === ".." || part === "." || part === "")) return null;
  return path;
}

export function makeCodingAgentBranch(task: string): string {
  const slug = task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "change";
  return `mruneel-coding/${slug}`;
}

export function validateCodingAgentProposal(input: CodingAgentCommitProposal): CodingAgentPolicyResult {
  const errors: string[] = [];
  const normalizedFiles: CodingAgentFileProposal[] = [];
  const branchName = makeCodingAgentBranch(input?.task ?? "");

  if (!input || input.approved !== true) errors.push("Explicit approval is required before a write proposal can be accepted.");
  if (typeof input?.task !== "string" || !input.task.trim() || input.task.length > 4000) errors.push("Task must be 1–4000 characters.");
  if (!Array.isArray(input?.files) || input.files.length === 0 || input.files.length > MAX_FILES) errors.push(`Proposal must contain 1–${MAX_FILES} files.`);

  let totalChars = 0;
  for (const file of Array.isArray(input?.files) ? input.files : []) {
    const path = normalizePath(file?.path);
    if (!path) {
      errors.push("File path is invalid or contains traversal/absolute-path syntax.");
      continue;
    }
    if (!path.startsWith("src/") || blockedPathPatterns.some((pattern) => pattern.test(path))) {
      errors.push(`Protected or out-of-scope path blocked: ${path}`);
      continue;
    }
    if (typeof file.content !== "string" || !file.content.trim() || file.content.length > MAX_FILE_CHARS) {
      errors.push(`File content must be non-empty and at most ${MAX_FILE_CHARS} characters: ${path}`);
      continue;
    }
    totalChars += file.content.length;
    if (secretPatterns.some((pattern) => pattern.test(file.content))) {
      errors.push(`Potential secret detected in file: ${path}`);
      continue;
    }
    if (normalizedFiles.some((item) => item.path === path)) {
      errors.push(`Duplicate file path in proposal: ${path}`);
      continue;
    }
    normalizedFiles.push({ path, content: file.content });
  }
  if (totalChars > MAX_TOTAL_CHARS) errors.push(`Total proposal content exceeds ${MAX_TOTAL_CHARS} characters.`);

  return { allowed: errors.length === 0, errors, normalizedFiles, branchName };
}
