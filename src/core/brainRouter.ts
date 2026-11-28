import { decide, type Decision } from "./decisionEngine";
import { canRouteToTool, getTool, type MRUNEELToolDescriptor } from "./toolsRegistry";

const intentToolMap: Record<Decision["intent"], string | null> = {
  conversation: "conversation",
  research: "research",
  coding: "coding_lab",
  device: "device_bridge",
  sensitive: "external_action",
  unknown: null,
};

export interface BrainRoute {
  decision: Decision;
  selectedToolId: string | null;
  tool: MRUNEELToolDescriptor | null;
  available: boolean;
  requiresApproval: boolean;
  disposition: "route" | "approval_required" | "tool_disabled" | "no_route";
  explanation: string;
}

/** Connects intent classification to the safe metadata registry; never executes tools. */
export function routeRequest(input: string): BrainRoute {
  const decision = decide(input);
  const selectedToolId = intentToolMap[decision.intent];
  if (!selectedToolId) {
    return {
      decision, selectedToolId: null, tool: null, available: false,
      requiresApproval: decision.requiresApproval, disposition: "no_route",
      explanation: "No matching intent. Ask a clarifying question; do not execute anything.",
    };
  }

  const tool = getTool(selectedToolId) ?? null;
  const available = canRouteToTool(selectedToolId);
  const requiresApproval = decision.requiresApproval || Boolean(tool?.requiresApproval) || decision.risk === "high";

  if (requiresApproval) {
    return {
      decision, selectedToolId, tool, available, requiresApproval: true,
      disposition: "approval_required",
      explanation: "Approval is required before any action. This router does not request or perform execution.",
    };
  }

  if (!available) {
    return {
      decision, selectedToolId, tool, available: false, requiresApproval: false,
      disposition: "tool_disabled",
      explanation: "The matching adapter is registered but disabled; no execution is possible.",
    };
  }

  return {
    decision, selectedToolId, tool, available: true, requiresApproval: false,
    disposition: "route",
    explanation: "Tool is enabled. This is routing metadata only; an executor is not connected.",
  };
}
