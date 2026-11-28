import { decide, type Decision } from "./decisionEngine";

export type PlanStepRisk = "low" | "medium" | "high";
export interface TaskStep {
  id: string;
  title: string;
  purpose: string;
  risk: PlanStepRisk;
  requiresApproval: boolean;
  status: "proposed";
}
export interface TaskPlan {
  request: string;
  intent: Decision["intent"];
  overallRisk: PlanStepRisk;
  requiresApproval: boolean;
  status: "plan_only";
  steps: TaskStep[];
  guardrails: string[];
}

/**
 * Deterministic planning scaffold. It creates a proposal only—no tools are invoked
 * and no steps are marked complete. Unknown tasks must be clarified.
 */
export function createTaskPlan(request: string): TaskPlan {
  const decision = decide(request);
  const normalized = decision.normalizedInput.toLowerCase();
  const steps: TaskStep[] = [];
  const add = (id: string, title: string, purpose: string, risk: PlanStepRisk, requiresApproval = risk !== "low") =>
    steps.push({ id, title, purpose, risk, requiresApproval, status: "proposed" });

  if (/\b(code|coding|debug|bug|compile|build|github|pull request|commit|patch)\b|कोड|बग|फाईल|फाइल/i.test(normalized)) {
    add("understand", "Inspect requirements and existing code", "Identify scope, constraints and relevant files.", "low", false);
    add("proposal", "Prepare an isolated code change", "Create a patch on a feature branch; do not touch production.", "medium", true);
    add("verify", "Run relevant tests and build checks", "Report exact results and any unverified items.", "medium", true);
    add("review", "Review diff and safety", "Check regressions, secrets, permissions and unintended changes.", "medium", true);
    add("approval", "Request human review", "Wait for approval before merge, release or deployment.", "high", true);
  } else if (/\b(research|search|look up|latest|news|browse|website)\b|शोध|माहिती शोध|बातमी/i.test(normalized)) {
    add("clarify", "Confirm research scope and freshness", "Resolve the topic and required time range.", "low", false);
    add("retrieve", "Retrieve sources", "Use a connected search adapter; none is executed by this planner.", "low", false);
    add("synthesize", "Compare and summarize evidence", "Separate verified facts from uncertainty and cite sources.", "low", false);
  } else if (/\b(call|send message|text|purchase|buy|pay|transfer|delete|share|publish|install|uninstall)\b|कॉल कर|मेसेज पाठव|खरेदी|पेमेंट|पाठव|हटव/i.test(normalized)) {
    add("confirm_details", "Confirm target and exact action", "Validate recipient, content, amount or target before any action.", "medium", true);
    add("approval", "Obtain explicit user approval", "No external action may proceed without a clear final confirmation.", "high", true);
    add("execute", "Execute through an authorized adapter", "Only if an adapter is available and the platform permits it.", "high", true);
    add("verify", "Verify action result", "Use the adapter result; never assume success.", "low", false);
  } else if (/\b(open|launch|turn on|turn off|set alarm|camera|bluetooth|wifi|flashlight|volume)\b|उघड|चालू कर|बंद कर|अलार्म|कॅमेरा|टॉर्च|आवाज वाढव|आवाज कमी/i.test(normalized)) {
    add("resolve", "Resolve the exact device target", "Choose a supported allowlisted target and check availability.", "low", false);
    add("permission", "Check permissions and approval", "Use Android user-visible permissions and confirmations.", "medium", true);
    add("execute", "Request native action", "Only call a connected adapter; this plan itself does not execute.", "medium", true);
    add("verify", "Confirm adapter result", "Report success only when native result confirms it.", "low", false);
  } else if (normalized) {
    add("clarify", "Clarify the desired outcome", "The request does not match a supported planning template.", "low", false);
  }

  return {
    request: decision.normalizedInput,
    intent: decision.intent,
    overallRisk: steps.some((step) => step.risk === "high") ? "high" : steps.some((step) => step.risk === "medium") ? "medium" : "low",
    requiresApproval: steps.some((step) => step.requiresApproval) || decision.requiresApproval,
    status: "plan_only",
    steps,
    guardrails: [
      "This is a proposal only; no tool, device, network or filesystem action has been executed.",
      "Do not mark a step complete without a verified adapter result.",
      "Ask for explicit approval before medium/high-risk execution.",
      "Stop and re-plan if a step fails or the target is ambiguous.",
    ],
  };
}
