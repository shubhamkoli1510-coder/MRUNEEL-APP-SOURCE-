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
  { id: "brain", name: "AI Brain / Provider Router", jarvisDomain: "Reasoning", status: "partial", summary: "Gemini chat, grounded research route, and intent/risk router are connected; provider fallback remains unverified.", nextMilestone: "Unify provider selection, timeouts, fallback and memory context through the agent kernel.", safetyBoundary: "Provider availability and model output are not proof that an external action occurred." },
  { id: "voice", name: "Voice Interface", jarvisDomain: "Speech", status: "partial", summary: "Speech recognition and Android/native TTS paths exist.", nextMilestone: "Reliable lifecycle, permission-aware wake word, and hands-free UX.", safetyBoundary: "Microphone use must be visible, permissioned, and user-controlled." },
  { id: "memory", name: "Contextual Memory", jarvisDomain: "Memory", status: "partial", summary: "Local memories are user-managed; cloud AI receives them only after a new explicit consent toggle is enabled (default OFF).", nextMilestone: "Add local memory search/edit/delete, retrieval filtering and source-aware context controls.", safetyBoundary: "No secrets; sensitive memory requires item-specific approval; no silent cloud sync." },
  { id: "tools", name: "Tools / Skills", jarvisDomain: "Actions", status: "partial", summary: "Registry metadata plus connected research, coding proposal, and limited device handlers; registry-to-executor is not fully unified.", nextMilestone: "Centralize runtime availability, schema validation, approval and result verification for each adapter.", safetyBoundary: "Registry entries alone do not execute; disabled tools remain unavailable." },
  { id: "decision", name: "Decision Engine", jarvisDomain: "Planning", status: "partial", summary: "Intent/risk classifier foundation.", nextMilestone: "Use decision output consistently before every action.", safetyBoundary: "High-risk or external actions require explicit confirmation." },
  { id: "device", name: "Android Device Bridge", jarvisDomain: "Device Control", status: "partial", summary: "Native bridge exposes torch, volume, status, allowlisted system screens, fixed app launcher, and opens Android Clock alarm setup for user confirmation. OS notification reminders are not scheduled.", nextMilestone: "Add scheduled notifications with permission checks, reboot persistence, cancellation, and reminder-to-notification flow.", safetyBoundary: "Use Android intents/permissions; no hidden controls or arbitrary packages." },
  { id: "vision", name: "Computer Vision", jarvisDomain: "Perception", status: "partial", summary: "Camera scanner and server vision endpoint exist.", nextMilestone: "Add OCR-focused and image-context workflows with user-triggered capture.", safetyBoundary: "Capture only on user request; image data must not be retained by default." },
  { id: "research", name: "Live Research", jarvisDomain: "Knowledge", status: "partial", summary: "Server-side Google Search grounding endpoint is connected to the research-intent chat flow; source links are returned when available.", nextMilestone: "Add freshness metadata, source quality checks, and verify deployment/provider behavior.", safetyBoundary: "Label freshness and cite retrieved sources; do not invent browsing." },
  { id: "coding", name: "Coding Agent / Lab", jarvisDomain: "Engineering", status: "partial", summary: "Coding Lab proposal/review workflow and GitHub-based development exist.", nextMilestone: "Isolated patch creation, test execution, review and explicit release approval.", safetyBoundary: "No direct production deploy, merge, or release without approval." },
  { id: "cloud", name: "24/7 Cloud Core", jarvisDomain: "Infrastructure", status: "partial", summary: "Render server/API foundation exists.", nextMilestone: "Health monitoring, provider fallback verification, persistent state and availability checks.", safetyBoundary: "Do not imply uptime or monitoring unless verified." },
  { id: "automation", name: "Multi-step Automation", jarvisDomain: "Autonomy", status: "partial", summary: "Deterministic plan scaffolds and a single-step executor are connected for limited device/app-launch flows; general multi-step execution is not available.", nextMilestone: "Add validated adapter contracts, sequential step state, cancellation and rollback-safe handling.", safetyBoundary: "Plan first; approval before medium/high-risk actions; stop on failure." },
  { id: "security", name: "Security / Approval", jarvisDomain: "Safety", status: "partial", summary: "Risk gates and PIN lock UI exist; simulated biometric success was removed, and custom PIN is required before enabling lock.", nextMilestone: "Native biometric challenge, stronger secure PIN storage, and centralized action audit.", safetyBoundary: "Never bypass permissions, authentication, or confirmation gates." },
  { id: "proactive", name: "Proactive Assistance", jarvisDomain: "Anticipation", status: "planned", summary: "No background suggestions or proactive reminders are enabled.", nextMilestone: "Add opt-in scheduled assistance using user-approved reminders only.", safetyBoundary: "No covert monitoring, unsolicited external actions, or inferred sensitive data." },
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
