import test from "node:test";
import assert from "node:assert/strict";
import { MemoryManager, DEFAULT_SETTINGS } from "./memoryManager";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  },
});

test("personal memory and reminders start empty instead of fabricated demo entries", () => {
  assert.deepEqual(MemoryManager.getMemories(), []);
  assert.deepEqual(MemoryManager.getAlarms(), []);
  assert.deepEqual(MemoryManager.getReminders(), []);
  assert.deepEqual(MemoryManager.getNotes(), []);
});

test("cloud memory sharing is disabled by default", () => {
  assert.equal(DEFAULT_SETTINGS.cloudMemoryConsent, false);
  assert.equal(MemoryManager.getMemoriesForPrompt(), "");
});
