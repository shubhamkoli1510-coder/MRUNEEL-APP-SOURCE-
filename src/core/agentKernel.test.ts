import test from "node:test";
import assert from "node:assert/strict";
import { runAgentTurn } from "./agentKernel";
import { MemoryStore } from "./memoryStore";

function storage() { const data = new Map<string,string>(); return { getItem:(k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>data.set(k,v), removeItem:(k:string)=>data.delete(k) }; }

test("agent kernel combines decision route and task plan but never executes", () => {
  const result = runAgentTurn({ text: "open Wi-Fi settings" });
  assert.equal(result.executionStarted, false);
  assert.equal(result.mode, "approval_required");
  assert.equal(result.route.decision.intent, "device");
  assert.ok(result.plan.steps.length > 0);
  assert.ok(result.plan.steps.every((s) => s.status === "proposed"));
});

test("sensitive actions are blocked behind approval in the handoff", () => {
  const result = runAgentTurn({ text: "send a message" });
  assert.equal(result.mode, "approval_required");
  assert.equal(result.executionStarted, false);
});

test("ordinary approved local memory may be retrieved by query only", () => {
  const store = new MemoryStore(storage());
  store.save("Preferred language is Marathi", { explicitConsent: true });
  store.save("Sensitive health detail", { sensitivity: "sensitive", explicitConsent: true });
  const result = runAgentTurn({ text: "explain this", memoryStore: store, memoryQuery: "Marathi" });
  assert.equal(result.relevantMemory.length, 1);
  assert.equal(result.relevantMemory[0].text, "Preferred language is Marathi");
});

test("empty request returns clarify state", () => {
  const result = runAgentTurn({ text: " " });
  assert.equal(result.mode, "clarify");
});

test("enabled conversation route returns answer handoff rather than adapter unavailable", () => {
  const result = runAgentTurn({ text: "tell me a joke" });
  assert.equal(result.mode, "answer");
  assert.equal(result.executionStarted, false);
  assert.equal(result.route.selectedToolId, "conversation");
});

test("research intent returns grounded research handoff mode",()=>{const result=runAgentTurn({text:"search for latest AI news"});assert.equal(result.mode,"research");assert.equal(result.route.available,true);assert.equal(result.executionStarted,false);});
test("coding request reaches approval-gated Coding Lab adapter",()=>{const result=runAgentTurn({text:"fix this bug in App.tsx"});assert.equal(result.mode,"approval_required");assert.equal(result.route.selectedToolId,"coding_lab");assert.equal(result.route.available,true);assert.equal(result.executionStarted,false);});
