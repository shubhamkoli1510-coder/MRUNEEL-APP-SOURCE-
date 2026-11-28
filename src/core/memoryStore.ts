import { evaluateMemoryWrite, type MemorySensitivity } from "./memoryPolicy";

export interface StoredMemoryRecord { id: string; text: string; createdAt: number; sensitivity: MemorySensitivity; }
export interface MemoryStorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
const STORAGE_KEY = "mruneel_approved_memory_v1";
/** Consent-gated local storage facade. No network or cloud sync. */
export class MemoryStore {
  constructor(private readonly adapter: MemoryStorageAdapter, private readonly key = STORAGE_KEY) {}
  list(): StoredMemoryRecord[] {
    try { const parsed: unknown = JSON.parse(this.adapter.getItem(this.key) ?? "[]"); if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is StoredMemoryRecord => item && typeof item.id === "string" && typeof item.text === "string" && typeof item.createdAt === "number" && (item.sensitivity === "ordinary" || item.sensitivity === "sensitive" || item.sensitivity === "secret"));
    } catch { return []; }
  }
  save(text: string, options: { sensitivity?: MemorySensitivity; explicitConsent: boolean }): { saved: true; record: StoredMemoryRecord } | { saved: false; reason: string } {
    const sensitivity = options.sensitivity ?? "ordinary"; const policy = evaluateMemoryWrite({ text, sensitivity, explicitConsent: options.explicitConsent });
    if (policy.decision !== "allow_with_consent") return { saved: false, reason: policy.reason };
    const record: StoredMemoryRecord = { id: "memory-" + Date.now() + "-" + this.list().length, text: text.trim(), createdAt: Date.now(), sensitivity };
    this.adapter.setItem(this.key, JSON.stringify([record, ...this.list()])); return { saved: true, record };
  }
  search(query: string): StoredMemoryRecord[] { const needle = query.trim().toLocaleLowerCase(); if (!needle) return []; return this.list().filter(record => record.text.toLocaleLowerCase().includes(needle)); }
  delete(id: string): boolean { const current = this.list(); const next = current.filter(record => record.id !== id); if (next.length === current.length) return false; if (!next.length) this.adapter.removeItem(this.key); else this.adapter.setItem(this.key, JSON.stringify(next)); return true; }
  clear(): void { this.adapter.removeItem(this.key); }
}
export function createBrowserMemoryStore(): MemoryStore | null { if (typeof localStorage === "undefined") return null; return new MemoryStore(localStorage); }
