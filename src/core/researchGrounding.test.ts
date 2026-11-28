import test from "node:test";
import assert from "node:assert/strict";
import { extractResearchSources, formatResearchResponse } from "./researchGrounding";
test("extracts unique HTTPS grounding sources only",()=>{const s=extractResearchSources({groundingChunks:[{web:{title:"One",uri:"https://example.com/a"}},{web:{title:"Duplicate",uri:"https://example.com/a"}},{web:{title:"Unsafe",uri:"http://bad.test"}},{web:{title:"No URI"}}]});assert.deepEqual(s,[{title:"One",url:"https://example.com/a"}]);});
test("source formatter includes citation links in readable text",()=>{const text=formatResearchResponse("Answer",{0:{title:"Example",url:"https://example.org"}} as any);assert.match(text,/Sources:/);assert.match(text,/https:\/\/example.org/);});
test("empty sources do not imply citations",()=>assert.equal(formatResearchResponse("Plain answer",[]),"Plain answer"));
