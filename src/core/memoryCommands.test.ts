import test from "node:test";
import assert from "node:assert/strict";
import { handleMemoryCommand, createMemoryCommandStore } from "./memoryCommands";
import type { MemoryStorageAdapter } from "./memoryStore";
class Storage implements MemoryStorageAdapter { private m=new Map<string,string>(); getItem(k:string){return this.m.get(k)??null;} setItem(k:string,v:string){this.m.set(k,v);} removeItem(k:string){this.m.delete(k);} }
test("only explicit remember command saves ordinary memory",()=>{const store=createMemoryCommandStore(new Storage());const r=handleMemoryCommand("remember that I prefer short answers",store,"en-US");assert.equal(r.handled,true);if(r.handled)assert.equal(r.action,"saved");assert.equal(store?.list()[0]?.text,"I prefer short answers");});
test("blocks sensitive memory hints",()=>{const store=createMemoryCommandStore(new Storage());const r=handleMemoryCommand("remember my password is abc123",store);assert.equal(r.handled,true);if(r.handled)assert.equal(r.action,"blocked");assert.equal(store?.list().length,0);});
test("recall lists saved ordinary memories",()=>{const store=createMemoryCommandStore(new Storage());store?.save("Use Marathi",{explicitConsent:true});const r=handleMemoryCommand("what do you remember",store,"en-US");assert.equal(r.handled,true);if(r.handled)assert.match(r.response,/Use Marathi/);});
test("forget all clears local memories",()=>{const store=createMemoryCommandStore(new Storage());store?.save("test",{explicitConsent:true});const r=handleMemoryCommand("forget all memories",store,"en-US");assert.equal(r.handled,true);assert.equal(store?.list().length,0);});
test("unrecognized text is not handled as a memory command",()=>assert.equal(handleMemoryCommand("hello",createMemoryCommandStore(new Storage())).handled,false));

test("storage exception does not claim memory saved",()=>{const bad:MemoryStorageAdapter={getItem(){return null;},setItem(){throw new Error("quota");},removeItem(){}};const r=handleMemoryCommand("remember a harmless preference",createMemoryCommandStore(bad),"en-US");assert.equal(r.handled,true);if(r.handled)assert.equal(r.action,"blocked");});

test("search command returns matching local records", () => {
  const store = createMemoryCommandStore(new Storage());
  store?.save("I prefer Marathi replies", { explicitConsent: true });
  store?.save("I like coffee", { explicitConsent: true });
  const result = handleMemoryCommand("search memory Marathi", store, "en-US");
  assert.equal(result.handled, true);
  if (result.handled) assert.match(result.response, /Marathi replies/);
  if (result.handled) assert.doesNotMatch(result.response, /coffee/);
});

test("targeted forget deletes only matching local memory", () => {
  const store = createMemoryCommandStore(new Storage());
  store?.save("I prefer Marathi replies", { explicitConsent: true });
  store?.save("I like coffee", { explicitConsent: true });
  const result = handleMemoryCommand("forget coffee", store, "en-US");
  assert.equal(result.handled, true);
  assert.equal(store?.list().length, 1);
  assert.equal(store?.list()[0]?.text, "I prefer Marathi replies");
});
