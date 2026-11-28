import { routeRequest, type BrainRoute } from "./brainRouter";
import { createTaskPlan, type TaskPlan } from "./taskPlanner";
import type { MemoryStore, StoredMemoryRecord } from "./memoryStore";

export interface AgentTurnInput { text: string; memoryStore?: MemoryStore; memoryQuery?: string; }
export interface AgentTurnResult {
  request: string;
  route: BrainRoute;
  plan: TaskPlan;
  relevantMemory: StoredMemoryRecord[];
  mode: "answer" | "plan" | "approval_required" | "adapter_unavailable" | "clarify";
  userMessage: string;
  executionStarted: false;
}

/**
 * Agent kernel joins intent/risk routing, planning and consent-gated memory retrieval.
 * This foundation deliberately does not invoke device, network, coding or external tools.
 * It returns a truthful handoff for the UI/provider layer.
 */
export function runAgentTurn(input: AgentTurnInput): AgentTurnResult {
  const request = input.text.trim();
  const route = routeRequest(request);
  const plan = createTaskPlan(request);
  const relevantMemory = input.memoryStore && input.memoryQuery
    ? input.memoryStore.search(input.memoryQuery).filter((item) => item.sensitivity === "ordinary")
    : [];

  let mode: AgentTurnResult["mode"];
  let userMessage: string;
  if (!request || route.disposition === "no_route") {
    mode = "clarify";
    userMessage = "मला नेमकं काय करायचं आहे ते थोडं स्पष्ट सांग.";
  } else if (route.requiresApproval || plan.requiresApproval) {
    mode = "approval_required";
    userMessage = "हे काम करण्यापूर्वी तुझी स्पष्ट परवानगी आवश्यक आहे. आत्ता कोणतीही action execute केलेली नाही.";
  } else if (route.decision.intent === "conversation" && route.disposition === "route") {\n    mode = "answer";\n    userMessage = "सामान्य संवादासाठी तयार. AI उत्तर provider कडे पाठवण्याचा handoff उपलब्ध आहे.";\n  } else if (route.disposition === "tool_disabled" || route.disposition === "route") {
    mode = "adapter_unavailable";
    userMessage = "हे काम ओळखलं आहे, पण त्यासाठी प्रत्यक्ष जोडलेला आणि enabled adapter उपलब्ध नाही. कोणतीही action execute केलेली नाही.";
  } else {
    mode = "plan";
    userMessage = "काम समजलं. खाली सुरक्षित execution plan तयार केला आहे; तो अजून execute केलेला नाही.";
  }
  return { request, route, plan, relevantMemory, mode, userMessage, executionStarted: false };
}
