import assert from "node:assert/strict";
import { mezzoTagliandiEnabled, mergeMezzoMetaPatch, parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";

assert.equal(mezzoTagliandiEnabled({ tagliandi: true }), true);
assert.equal(mezzoTagliandiEnabled({ tagliandi: false }), false);
assert.equal(mezzoTagliandiEnabled({}), false);

assert.deepEqual(parseMezzoMeta({ tagliandi: true }).tagliandi, true);
assert.deepEqual(parseMezzoMeta({ tagliandi: "1" }).tagliandi, true);
assert.equal(parseMezzoMeta({}).tagliandi, undefined);

assert.deepEqual(mergeMezzoMetaPatch({ cantiere: "A" }, { tagliandi: true }), {
  cantiere: "A",
  tagliandi: true,
});

console.log("mezzi-meta.test.ts OK");
