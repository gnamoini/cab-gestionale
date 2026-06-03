/**
 * Flex ESLint baseline — policy invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  flexViolationFingerprint,
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, ".eslint-flex-baseline.json");

assert.ok(fs.existsSync(BASELINE_PATH), ".eslint-flex-baseline.json must exist");
assert.ok(fs.existsSync(path.join(ROOT, "eslint-rules/no-flex-overflow-risk.mjs")));

const eslintConfig = fs.readFileSync(path.join(ROOT, "eslint.config.mjs"), "utf8");
assert.match(eslintConfig, /no-flex-overflow-risk":\s*"error"/);

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as FlexBaselineFile;
assert.ok(baseline.version >= 1, "baseline version must be positive");
assert.ok(baseline.entries.length > 0, "baseline must grandfather existing violations");
assert.equal(baseline.entryCount, baseline.entries.length);
assert.ok(baseline.checksum, "baseline must include checksum");

const integrity = verifyFlexBaselineIntegrity(baseline);
assert.equal(integrity.valid, true, integrity.errors.join("; "));

const current = scanFlexViolations(ROOT);
const baselineFps = new Set(baseline.entries.map(flexViolationFingerprint));
const newViolations = current.filter((e) => !baselineFps.has(flexViolationFingerprint(e)));

assert.equal(
  newViolations.length,
  0,
  `new flex violations not in baseline: ${newViolations.map((v) => `${v.file}:${v.line}`).join(", ")}`,
);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(pkg.scripts["flex:baseline:generate"]);
assert.ok(pkg.scripts["flex:baseline:diff"]);

console.log(`flex-eslint-baseline.test.ts OK (${baseline.entries.length} baseline entries)`);
