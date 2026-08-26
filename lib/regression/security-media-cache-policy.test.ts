/**
 * Media cache policy: MEDIA_CACHE_PRIVATE for non-immutable paths.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const registryPath = path.join(ROOT, "lib/decision/request-decision-registry.ts");
const src = fs.readFileSync(registryPath, "utf8");

assert.match(src, /MEDIA_CACHE_PRIVATE\s*=\s*"private, no-store"/);
assert.match(src, /tier === "immutable"\s*\?\s*MEDIA_CACHE_IMMUTABLE\s*:\s*MEDIA_CACHE_PRIVATE/);

// ponytail: short-tier private paths must not use public immutable cache
assert.doesNotMatch(
  src,
  /tier === "short"[\s\S]{0,80}MEDIA_CACHE_IMMUTABLE/,
  "short tier must not map to MEDIA_CACHE_IMMUTABLE",
);

console.log("security-media-cache-policy.test: OK");
