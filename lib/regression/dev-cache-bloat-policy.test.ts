import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ensureDev = fs.readFileSync(path.join(ROOT, "scripts/ensure-dev-unlocked.ts"), "utf8");

assert.match(ensureDev, /DEV_CACHE_BLOAT_MB/);
assert.match(ensureDev, /pruneBloatedDevCacheIfIdle/);
assert.match(ensureDev, /bloated-cache-no-lock/);

console.log("dev-cache-bloat-policy.test.ts OK");
