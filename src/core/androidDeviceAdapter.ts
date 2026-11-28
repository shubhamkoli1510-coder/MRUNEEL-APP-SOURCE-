import { parseOfflineCommand } from "../utils/offlineEngine";
import type { TaskAdapter, AdapterResult } from "./taskExecutor";

export interface AndroidActionPort {
  isAndroid: () => boolean;
  openScreen: (target: "wifi" | "bluetooth" | "settings" | "camera" | "dialer") => Promise<void>;
  launchApp: (appId: "whatsapp" | "youtube" | "chrome" | "maps" | "phone" | "camera" | "calculator" | "settings") => Promise<{ appId: string; packageName: string }>;
  requestSystemAlarm: (hour: number, minute: number, label?: string) => Promise<{ hour: number; minute: number; awaitingUserConfirmation: boolean }>;
  volumeUp: () => Promise<{ volume: number; max: number }>;
  volumeDown: () => Promise<{ volume: number; max: number }>;
}
const supportedTargets = new Set(["wifi", "bluetooth", "settings", "camera", "dialer"]);
const supportedApps = new Set(["whatsapp", "youtube", "chrome", "maps", "phone", "camera", "calculator", "settings"]);

/** Adapter is dependency-injected for tests and only recognizes existing offline allowlisted intents. */
export function createAndroidDeviceAdapter(port: AndroidActionPort): TaskAdapter {
  return {
    id: "android-device-allowlist",
    risk: "medium",
    async execute(request): Promise<AdapterResult> {
      if (!port.isAndroid()) return { ok: false, summary: "Native Android adapter unavailable on this platform." };
      const intent = parseOfflineCommand(request);
      if (intent.type === "SET_ALARM") {
        const time = intent.payload?.time;
        if (typeof time !== "string" || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(time)) return { ok: false, summary: "Alarm time is invalid; no clock intent opened." };
        const [hour, minute] = time.split(":").map(Number);
        const result = await port.requestSystemAlarm(hour, minute, String(intent.payload?.label ?? "MRUNEEL alarm"));
        return { ok: true, summary: "System Clock alarm setup opened for " + time + "; awaiting user confirmation.", data: result };
      }
      if (intent.type === "OPEN_APP") {
        const appId = intent.payload?.appId;
        if (typeof appId !== "string" || !supportedApps.has(appId)) return { ok: false, summary: "App is not in the fixed allowlist; no launch attempted." };
        const launched = await port.launchApp(appId as Parameters<AndroidActionPort["launchApp"]>[0]);
        return { ok: true, summary: "Allowlisted app launch confirmed: " + launched.appId, data: launched };
      }
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
