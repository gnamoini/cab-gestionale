import assert from "node:assert/strict";
import { appendAliasForCanonical } from "@/lib/entity-resolution/settings-aliases";
import { lookupAlias, buildAliasLookupMap } from "@/lib/entity-resolution/settings-aliases";

const next = appendAliasForCanonical({}, "CLIENTE", "SI.ECO", "Si.eco");
const map = buildAliasLookupMap(next);
const hit = lookupAlias(map, "CLIENTE", "Si.eco");
assert.ok(hit);
assert.equal(hit?.canonicalLabel, "SI.ECO");

console.log("settings-rename-alias-search.test.ts OK");
