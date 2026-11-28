export type MemorySensitivity = "ordinary" | "sensitive" | "secret";
export type MemoryWriteDecision = "allow_with_consent" | "approval_required" | "blocked";

export interface MemoryWriteRequest {
  text: string;
  sensitivity: MemorySensitivity;
  explicitConsent: boolean;
}

export interface MemoryPolicyResult {
  decision: MemoryWriteDecision;
  requiresApproval: boolean;
  reason: string;
}

/** Policy only: this module never persists, reads, or transmits memory. */
export function evaluateMemoryWrite(request: MemoryWriteRequest): MemoryPolicyResult {
  if (!request.text.trim()) {
    return { decision: "blocked", requiresApproval: false, reason: "Empty memory cannot be stored." };
  }
  if (request.sensitivity === "secret") {
    return { decision: "blocked", requiresApproval: false, reason: "Secrets and credentials must never be stored as assistant memory." };
  }
  if (request.sensitivity === "sensitive") {
    return { decision: "approval_required", requiresApproval: true, reason: "Sensitive personal information requires explicit, item-specific approval and is not stored by this policy module." };
  }
  if (!request.explicitConsent) {
    return { decision: "approval_required", requiresApproval: true, reason: "Persistent memory requires clear user consent." };
  }
  return { decision: "allow_with_consent", requiresApproval: false, reason: "Ordinary memory may be saved only after explicit consent by a connected storage adapter." };
}
