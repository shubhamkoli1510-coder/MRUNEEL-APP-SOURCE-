import type { TaskPlan, TaskStep } from "./taskPlanner";

export type AdapterResult = { ok: true; summary: string; data?: unknown } | { ok: false; summary: string; error?: string };
export interface TaskAdapter {
  id: string;
  risk: "low" | "medium" | "high";
  execute: (request: string, step: TaskStep) => Promise<AdapterResult>;
}
export interface ExecutePlanInput {
  plan: TaskPlan;
  adapter?: TaskAdapter;
  approved?: boolean;
}
export interface ExecutePlanResult {
  status: "blocked" | "adapter_unavailable" | "completed" | "failed";
  executionStarted: boolean;
  stepId?: string;
  summary: string;
}

/** Executes exactly one adapter step, never the full plan. Approval is explicit per call. */
export async function executePlanStep(input: ExecutePlanInput): Promise<ExecutePlanResult> {
  const { plan, adapter, approved = false } = input;
  const step = plan.steps.find((candidate) => candidate.id === "execute");
  if (!step) return { status: "blocked", executionStarted: false, summary: "Plan has no executable step." };
  if ((step.requiresApproval || adapter?.risk !== "low") && !approved) {
    return { status: "blocked", executionStarted: false, stepId: step.id, summary: "Explicit approval is required; adapter was not called." };
  }
  if (!adapter) return { status: "adapter_unavailable", executionStarted: false, stepId: step.id, summary: "No adapter is connected; nothing was executed." };
  if (adapter.risk === "high" && !approved) {
    return { status: "blocked", executionStarted: false, stepId: step.id, summary: "High-risk adapter requires explicit approval; nothing was executed." };
  }
  try {
    const result = await adapter.execute(plan.request, step);
    return result.ok
      ? { status: "completed", executionStarted: true, stepId: step.id, summary: result.summary }
      : { status: "failed", executionStarted: true, stepId: step.id, summary: result.summary };
  } catch {
    return { status: "failed", executionStarted: true, stepId: step.id, summary: "Adapter threw an error; action is not reported as successful." };
  }
}
