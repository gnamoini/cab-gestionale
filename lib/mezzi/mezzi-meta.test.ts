import assert from "node:assert/strict";
import { mezzoTagliandiEnabled, parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";

assert.equal(mezzoTagliandiEnabled({ tagliandi: true }), false);
assert.equal(mezzoTagliandiEnabled({ tagliandi: false }), false);
assert.equal(parseMezzoMeta({ tagliandi: true }).tagliandi, true);

console.log("mezzi-meta.test.ts OK");
