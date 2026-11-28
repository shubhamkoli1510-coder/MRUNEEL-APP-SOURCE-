export type MRUNEELToolRisk = "low" | "medium" | "high";
export type MRUNEELToolCategory = "conversation" | "research" | "coding" | "device" | "memory";

export interface MRUNEELToolDescriptor {
  id: string;
  category: MRUNEELToolCategory;
  description: string;
  risk: MRUNEELToolRisk;
  requiresApproval: boolean;
  enabled: boolean;
}

/**
 * Metadata-only registry. It deliberately contains no executable handlers:
 * actual tool adapters must be wired and capability-checked separately.
 */
export const toolRegistry: readonly MRUNEELToolDescriptor[] = Object.freeze([
  { id: "conversation", category: "conversation", description: "Answer and explain using the configured AI provider.", risk: "low", requiresApproval: false, enabled: true },
  { id: "research", category: "research", description: "Retrieve information from approved research sources.", risk: "low", requiresApproval: false, enabled: false },
  { id: "coding_lab", category: "coding", description: "Prepare code changes, diffs, and test plans for review.", risk: "medium", requiresApproval: true, enabled: false },
  { id: "device_bridge", category: "device", description: "Request supported device operations through permission-checked adapters.", risk: "medium", requiresApproval: true, enabled: false },
  { id: "memory_read", category: "memory", description: "Retrieve user-approved stored context.", risk: "low", requiresApproval: false, enabled: false },
  { id: "memory_write", category: "memory", description: "Save or update persistent user context.", risk: "medium", requiresApproval: true, enabled: false },
  { id: "external_action", category: "device", description: "Actions with external effects such as sending, sharing, purchasing, or calling.", risk: "high", requiresApproval: true, enabled: false },
]);

export function listTools(options: { includeDisabled?: boolean } = {}): MRUNEELToolDescriptor[] {
  return toolRegistry.filter((tool) => options.includeDisabled || tool.enabled).map((tool => ({ ...tool })));
}

export function getTool(id: string): MRUNEELToolDescriptor | undefined {
  const tool = toolRegistry.find((entry) => entry.id === id);
  return tool ? { ...tool } : undefined;
}

export function canRouteToTool(id: string): boolean {
  return toolRegistry.some((tool) => tool.id === id && tool.enabled);
}
