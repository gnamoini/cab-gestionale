import assert from "node:assert/strict";
import { formatAppBuildFooterLines, resolveAppEnvironment } from "@/lib/env/app-build-info";

assert.equal(typeof resolveAppEnvironment(), "string");
const lines = formatAppBuildFooterLines();
assert.ok(lines.length >= 2, "footer has version and environment");
assert.match(lines[0]!, /^v/);

console.log("app-build-info.test.ts OK");
