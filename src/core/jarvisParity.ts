export type CapabilityStatus = "implemented" | "partial" | "planned" | "blocked";

export interface MRUNEELCapability {
  id: string;
  name: string;
  jarvisDomain: string;
  status: CapabilityStatus;
  summary: string;
  nextMilestone: string;
  safetyBoundary: string;
}

/** Capability inventory is descriptive only; status must not be interpreted as live runtime proof. */
export const jarvisParityCapabilities: readonly MRUNEELCapability[] = Object.freeze([
  { id: "brain", name: "AI Brain / Provider Router", jarvisDomain: "Reasoning", status: "partial", summary: "Gemini chat endpoint and fallback design; router foundation exists.", nextMilestone: "Wire intent routes to provider/tool adapters with truthful status.", safetyBoundary: "Provider availability and model output are not proof that an external action occurred." },
  { id: "voice", name: "Voice Interface", jarvisDomain: "Speech", status: "partial", summary: "Speech recognition and Android/native TTS paths exist.", nextMilestone: "Reliable lifecycle, permission-aware wake word, and hands-free UX.", safetyBoundary: "Microphone use must be visible, permissioned, and user-controlled." },
  { id: "memory", name: "Contextual Memory", jarvisDomain: "Memory", status: "partial", summary: "Memory policy/store foundation and app-local memory manager exist.", nextMilestone: "Connect approved memory retrieval to chat and consent-based writes.", safetyBoundary: "No secrets; sensitive memory requires item-specific approval; no silent cloud sync." },
  { id: "tools", name: "Tools / Skills", jarvisDomain: "Actions", status: "partial", summary: "Metadata registry exists; most tool adapters are disabled.", nextMilestone: "Implement and test capability adapters one by one.", safetyBoundary: "Registry entries alone do not execute; disabled tools remain unavailable." },
  { id: "decision", name: "Decision Engine", jarvisDomain: "Planning", status: "partial", summary: "Intent/risk classifier foundation.", nextMilestone: "Use decision output consistently before every action.", safetyBoundary: "High-risk or external actions require explicit confirmation." },
  { id: "device", name: "Android Device Bridge", jarvisDomain: "Device Control", status: "partial", summary: "Native bridge has bounded torch/volume and allowlisted system screens.", nextMilestone: "Add app allowlist, alarm/notification adapters and permission checks.", safetyBoundary: "Use Android intents/permissions; no hidden controls or arbitrary packages." },
  { id: "vision", name: "Computer Vision", jarvisDomain: "Perception", status: "partial", summary: "Camera scanner and server vision endpoint exist.", nextMilestone: "Add OCR-focused and image-context workflows with user-triggered capture.", safetyBoundary: "Capture only on user request; image data must not be retained by default." },
  { id: "research", name: "Live Research", jarvisDomain: "Knowledge", status: "planned", summary: "No live search adapter wired into the assistant core.", nextMilestone: "Connect a search tool and return source citations.", safetyBoundary: "Label freshness and cite retrieved sources; do not invent browsing." },
  { id: "coding", name: "Coding Agent / Lab", jarvisDomain: "Engineering", status: "partial", summary: "Coding Lab proposal/review workflow and GitHub-based development exist.", nextMilestone: "Isolated patch creation, test execution, review and explicit release approval.", safetyBoundary: "No direct production deploy, merge, or release without approval." },
  { id: "cloud", name: "24/7 Cloud Core", jarvisDomain: "Infrastructure", status: "partial", summary: "Render server/API foundation exists.", nextMilestone: "Health monitoring, provider fallback verification, persistent state and availability checks.", safetyBoundary: "Do not imply uptime or monitoring unless verified." },
  { id: "automation", name: "Multi-step Automation", jarvisDomain: "Autonomy", status: "planned", summary: "Planning foundation is being added; no general executor.", nextMilestone: "Connect plans to registered adapters with step-by-step status.", safetyBoundary: "Plan first; approval before medium/high-risk actions; stop on failure." },
  { id: "security", name: "Security / Approval", jarvisDomain: "Safety", status: "partial", summary: "Risk classifier, approval policies and PIN/biometric UI exist.", nextMilestone: "Centralize authorization checks and audit outcomes for action adapters.", safetyBoundary: "Never bypass permissions, authentication, or confirmation gates." },
]);

export function getCapability(id: string): MRUNEELCapability | undefined {
  const item = jarvisParityCapabilities.find((capability) => capability.id === id);
  return item ? { ...item } : undefined;
}

export function listCapabilities(status?: CapabilityStatus): MRUNEELCapability[] {
  return jarvisParityCapabilities.filter((item) => !status || item.status === status).map((item) => ({ ...item }));
}

export function capabilitySummary(): { total: number; implemented: number; partial: number; planned: number; blocked: number } {
  return jarvisParityCapabilities.reduce((summary, item) => {
    summary.total += 1;
    summary[item.status] += 1;
    return summary;
  }, { total: 0, implemented: 0, partial: 0, planned: 0, blocked: 0 });
}
