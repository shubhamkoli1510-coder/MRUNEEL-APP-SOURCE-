import { parseOfflineCommand } from "../utils/offlineEngine";
import type { TaskAdapter, AdapterResult } from "./taskExecutor";

export interface AndroidActionPort {
  isAndroid: () => boolean;
  openScreen: (target: "wifi" | "bluetooth" | "settings" | "camera" | "dialer") => Promise<void>;
  volumeUp: () => Promise<{ volume: number; max: number }>;
  volumeDown: () => Promise<{ volume: number; max: number }>;
}
const supportedTargets = new Set(["wifi", "bluetooth", "settings", "camera", "dialer"]);

/** Adapter is dependency-injected for tests and only recognizes existing offline allowlisted intents. */
export function createAndroidDeviceAdapter(port: AndroidActionPort): TaskAdapter {
  return {
    id: "android-device-allowlist",
    risk: "medium",
    async execute(request): Promise<AdapterResult> {
      if (!port.isAndroid()) return { ok: false, summary: "Native Android adapter unavailable on this platform." };
      const intent = parseOfflineCommand(request);
      if (intent.type === "OPEN_SCREEN") {
        const target = intent.payload?.target;
        if (typeof target !== "string" || !supportedTargets.has(target)) return { ok: false, summary: "Unsupported Android target; no action executed." };
        await port.openScreen(target as AndroidActionPort["openScreen"] extends (target: infer T) => Promise<void> ? T : never);
        return { ok: true, summary: "Android screen opened: " + target };
      }
      if (intent.type === "ADJUST_VOLUME") {
        const direction = intent.payload?.direction;
        if (direction !== 1 && direction !== -1) return { ok: false, summary: "Volume direction is invalid." };
        const result = direction > 0 ? await port.volumeUp() : await port.volumeDown();
        return { ok: true, summary: "Media volume confirmed at " + result.volume + "/" + result.max, data: result };
      }
      return { ok: false, summary: "Request is not a supported device intent; no action executed." };
    },
  };
}
