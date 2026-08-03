import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const truncated = readFileSync(
  resolve(import.meta.dirname, "../../components/design-system/truncated-text-tooltip.tsx"),
  "utf8",
);
const portal = readFileSync(resolve(import.meta.dirname, "../../lib/ui/tooltip-portal.ts"), "utf8");

assert.match(truncated, /disabled={tooltipDisabled}/);
assert.doesNotMatch(truncated, /if \(!isTruncated/);

assert.match(portal, /isConnected/);

console.log("truncated-text-tooltip-guard.test.ts OK");
