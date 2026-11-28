import test from "node:test";
import assert from "node:assert/strict";
import { initialCodingLoopState, transitionCodingLoop, canCodingLoopExport, isCodingLoopTerminal, MAX_VALIDATION_ATTEMPTS, MAX_REVISIONS } from "./autonomousCodingLoop";

const run = (...events: Parameters<typeof transitionCodingLoop>[1][]) => events.reduce((state, event) => transitionCodingLoop(state, event), initialCodingLoopState);

test("happy path stays review-gated and requires explicit approval before export", () => {
 const state = run({type:"start",task:"Fix tests"}, {type:"plan_ready"}, {type:"proposal_ready"}, {type:"validation_passed"});
 assert.equal(state.stage,"awaiting_review");
 assert.equal(canCodingLoopExport(state),false);
 const approved=transitionCodingLoop(state,{type:"explicit_approval"});
 assert.equal(canCodingLoopExport(approved),true);
 assert.equal(transitionCodingLoop(approved,{type:"export_completed"}).stage,"exported");
});

test("rejects approval/export before review and blocks unsafe requests", () => {
 assert.equal(transitionCodingLoop(initialCodingLoopState,{type:"explicit_approval"}).stage,"blocked");
 assert.equal(transitionCodingLoop(initialCodingLoopState,{type:"export_completed"}).stage,"blocked");
 assert.equal(transitionCodingLoop(initialCodingLoopState,{type:"unsafe_request",reason:"secret"}).stage,"blocked");
});

test("bounded retries and revisions fail closed", () => {
 let s=run({type:"start",task:"test"}, {type:"plan_ready"}, {type:"proposal_ready"}, {type:"validation_failed",reason:"fail"}, {type:"revision_ready"}, {type:"proposal_ready"}, {type:"validation_failed",reason:"fail again"}, {type:"revision_ready"}, {type:"proposal_ready"}, {type:"validation_failed",reason:"third failure"});
 assert.equal(s.stage,"failed");
 assert.equal(s.revisions,MAX_REVISIONS);
 assert.equal(s.validationAttempts,MAX_VALIDATION_ATTEMPTS);
});

test("task input bounds and active task protection", () => {
 assert.equal(transitionCodingLoop(initialCodingLoopState,{type:"start",task:" "}).stage,"blocked");
 const started=transitionCodingLoop(initialCodingLoopState,{type:"start",task:"task"});
 assert.equal(transitionCodingLoop(started,{type:"start",task:"second"}).stage,"blocked");
});

test("cancel is terminal", () => {
 const state=run({type:"start",task:"task"},{type:"cancel"});
 assert.equal(state.stage,"cancelled");
 assert.equal(isCodingLoopTerminal(state.stage),true);
});


test("revision loop transitions permit repeated proposals without repeating plan_ready", () => {
 let s=transitionCodingLoop(initialCodingLoopState,{type:"start",task:"fix"});
 s=transitionCodingLoop(s,{type:"plan_ready"});
 s=transitionCodingLoop(s,{type:"proposal_ready"});
 s=transitionCodingLoop(s,{type:"validation_failed",reason:"empty diff"});
 s=transitionCodingLoop(s,{type:"revision_ready"});
 assert.equal(s.stage,"proposing");
 s=transitionCodingLoop(s,{type:"proposal_ready"});
 s=transitionCodingLoop(s,{type:"validation_passed"});
 assert.equal(s.stage,"awaiting_review");
 assert.equal(s.validationAttempts,2);
 assert.equal(s.revisions,1);
});
