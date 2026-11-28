import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, type MemoryStorageAdapter } from "./memoryStore";
class FakeStorage implements MemoryStorageAdapter { private values = new Map<string,string>(); getItem(key:string){return this.values.get(key)??null;} setItem(key:string,value:string){this.values.set(key,value);} removeItem(key:string){this.values.delete(key);} }
test("requires explicit consent and does not write when absent",()=>{const a=new FakeStorage();const s=new MemoryStore(a,"test");assert.equal(s.save("preference",{explicitConsent:false}).saved,false);assert.equal(a.getItem("test"),null);});
test("saves ordinary memory only after consent and can search",()=>{const s=new MemoryStore(new FakeStorage(),"test");assert.equal(s.save("Prefer Kolhapuri Marathi",{explicitConsent:true}).saved,true);assert.equal(s.search("kolhapuri").length,1);assert.equal(s.search("not found").length,0);});
test("refuses sensitive and secret categories",()=>{const s=new MemoryStore(new FakeStorage(),"test");assert.equal(s.save("health detail",{sensitivity:"sensitive",explicitConsent:true}).saved,false);assert.equal(s.save("api token",{sensitivity:"secret",explicitConsent:true}).saved,false);assert.equal(s.list().length,0);});
test("deletes individual record and handles missing id",()=>{const s=new MemoryStore(new FakeStorage(),"test");const r=s.save("favorite color blue",{explicitConsent:true});assert.equal(r.saved,true);if(r.saved)assert.equal(s.delete(r.record.id),true);assert.equal(s.list().length,0);assert.equal(s.delete("missing"),false);});
test("invalid persisted JSON is treated as empty",()=>{const a=new FakeStorage();a.setItem("test","{invalid");assert.equal(new MemoryStore(a,"test").list().length,0);});
