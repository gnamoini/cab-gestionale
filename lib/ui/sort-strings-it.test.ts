import assert from "node:assert/strict";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

assert.deepEqual(sortStringsItCaseInsensitive(["beta", "Alpha", "gamma"]), ["Alpha", "beta", "gamma"]);
assert.deepEqual(sortStringsItCaseInsensitive(["Zeta", "alpha"]), ["alpha", "Zeta"]);

console.log("sort-strings-it.test.ts: ok");
