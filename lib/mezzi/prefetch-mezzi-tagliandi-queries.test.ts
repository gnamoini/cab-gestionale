import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "prefetch-mezzi-tagliandi-queries.ts"), "utf8");

assert.match(src, /unwrapServiceResult/);
assert.doesNotMatch(src, /queryFn:\s*\(\)\s*=>\s*maintenancePlansEntry\./);

console.log("prefetch-mezzi-tagliandi-queries.test.ts OK");
