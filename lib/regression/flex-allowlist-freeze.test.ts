/**
 * Flex allowlist — runtime read-only + manifest snapshot gate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FLEX_CONTAINMENT_MARKERS,
  FLEX_OVERFLOW_ALLOWLIST,
  FLEX_OVERFLOW_CLASS_TOKENS,
  FLEX_OVERFLOW_FILE_ALLOWLIST,
  FLEX_SHRINK_MARKERS,
} from "@/lib/ui/global-flex-system";
import flexFreezeManifest from "@/lib/ui/flex-freeze-manifest.json";
import { verifyFlexFreezeManifest } from "@/lib/ui/flex-freeze-manifest";

assert.equal(Object.isFrozen(FLEX_OVERFLOW_ALLOWLIST), true);
assert.equal(Object.isFrozen(FLEX_OVERFLOW_ALLOWLIST.classTokens), true);
assert.equal(Object.isFrozen(FLEX_OVERFLOW_ALLOWLIST.shrinkMarkers), true);
assert.equal(Object.isFrozen(FLEX_OVERFLOW_ALLOWLIST.containmentMarkers), true);
assert.equal(Object.isFrozen(FLEX_OVERFLOW_ALLOWLIST.files), true);

assert.equal(FLEX_OVERFLOW_CLASS_TOKENS.length, flexFreezeManifest.allowlistTokenCount);
assert.equal(FLEX_OVERFLOW_FILE_ALLOWLIST.length, flexFreezeManifest.allowlistFilePatternCount);
assert.equal(FLEX_SHRINK_MARKERS.length, flexFreezeManifest.shrinkMarkerCount);
assert.equal(FLEX_CONTAINMENT_MARKERS.length, flexFreezeManifest.containmentMarkerCount);

const baseline = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), ".eslint-flex-baseline.json"), "utf8"),
);
const manifestCheck = verifyFlexFreezeManifest(flexFreezeManifest, baseline);
assert.equal(manifestCheck.valid, true, manifestCheck.errors.join("; "));

assert.ok(flexFreezeManifest.baselineChecksum, "manifest must include baselineChecksum");
assert.equal(flexFreezeManifest.baselineChecksum, baseline.checksum);

console.log("flex-allowlist-freeze.test.ts OK");
