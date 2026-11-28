export type CodingLoopStage = "idle" | "planning" | "proposing" | "validating" | "revising" | "awaiting_review" | "approved" | "exported" | "blocked" | "failed" | "cancelled";
export type CodingLoopEvent =
  | { type: "start"; task: string }
  | { type: "plan_ready" }
  | { type: "proposal_ready" }
  | { type: "validation_passed" }
  | { type: "validation_failed"; reason: string }
  | { type: "revision_ready" }
  | { type: "explicit_approval" }
  | { type: "export_completed" }
  | { type: "unsafe_request"; reason: string }
  | { type: "cancel" };

export interface CodingLoopState {
  stage: CodingLoopStage;
  task: string;
  validationAttempts: number;
  revisions: number;
  lastError: string;
  approvalRequired: boolean;
  approved: boolean;
}

export const MAX_VALIDATION_ATTEMPTS = 3;
export const MAX_REVISIONS = 2;

export const initialCodingLoopState: CodingLoopState = {
  stage: "idle", task: "", validationAttempts: 0, revisions: 0, lastError: "",
  approvalRequired: true, approved: false,
};

export function transitionCodingLoop(state: CodingLoopState, event: CodingLoopEvent): CodingLoopState {
  const stop = (stage: CodingLoopStage, reason = state.lastError): CodingLoopState => ({ ...state, stage, lastError: reason, approved: false });
  if (event.type === "cancel") return stop("cancelled", "Cancelled by user.");
  if (event.type === "unsafe_request") return stop("blocked", event.reason || "Blocked by safety policy.");
  switch (event.type) {
    case "start":
      if (state.stage !== "idle" && state.stage !== "failed" && state.stage !== "cancelled") return stop("blocked", "A task is already active.");
      if (!event.task.trim() || event.task.length > 4000) return stop("blocked", "Task must be 1–4000 characters.");
      return { ...initialCodingLoopState, stage: "planning", task: event.task.trim() };
    case "plan_ready":
      return state.stage === "planning" ? { ...state, stage: "proposing" } : stop("blocked", "Unexpected plan event.");
    case "proposal_ready":
      return state.stage === "proposing" ? { ...state, stage: "validating", validationAttempts: state.validationAttempts + 1 } : stop("blocked", "Unexpected proposal event.");
    case "validation_passed":
      return state.stage === "validating" ? { ...state, stage: "awaiting_review", lastError: "", approved: false } : stop("blocked", "Unexpected validation event.");
    case "validation_failed":
      if (state.stage !== "validating") return stop("blocked", "Unexpected validation failure event.");
      if (state.validationAttempts >= MAX_VALIDATION_ATTEMPTS) return stop("failed", event.reason || "Validation retry limit reached.");
      if (state.revisions >= MAX_REVISIONS) return stop("failed", event.reason || "Revision limit reached.");
      return { ...state, stage: "revising", revisions: state.revisions + 1, lastError: event.reason, approved: false };
    case "revision_ready":
      return state.stage === "revising" ? { ...state, stage: "proposing" } : stop("blocked", "Unexpected revision event.");
    case "explicit_approval":
      return state.stage === "awaiting_review" ? { ...state, stage: "approved", approved: true } : stop("blocked", "Approval is only valid after review.");
    case "export_completed":
      return state.stage === "approved" && state.approved ? { ...state, stage: "exported" } : stop("blocked", "Export requires explicit review approval.");
    default:
      return state;
  }
}

export function canCodingLoopExport(state: CodingLoopState): boolean {
  return state.stage === "approved" && state.approved && state.approvalRequired;
}

export function isCodingLoopTerminal(stage: CodingLoopStage): boolean {
  return ["exported", "blocked", "failed", "cancelled"].includes(stage);
}
