/**
 * Manifest coverage: count >= 243 and keys match baseline SECURITY DEFINER functions.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");
const BASELINE_PATH = path.join(ROOT, "docs/security/baseline-pre-remediation-2026-08-26.json");
const MIN_ENTRIES = 243;

function fnKey(name: string, args: string): string {
  return args ? `${name}(${args})` : `${name}()`;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  entries: Record<string, unknown>;
};
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as {
  functions: Array<{ name: string; args: string }>;
};

const manifestKeys = Object.keys(manifest.entries);
assert.ok(manifestKeys.length >= MIN_ENTRIES, `manifest entries ${manifestKeys.length} < ${MIN_ENTRIES}`);

const baselineKeys = baseline.functions.map((f) => fnKey(f.name, f.args)).sort();
const manifestKeySet = new Set(manifestKeys);
const missing = baselineKeys.filter((k) => !manifestKeySet.has(k));

assert.equal(missing.length, 0, `baseline functions missing from manifest:\n${missing.join("\n")}`);
console.log(
  `security-definer-manifest-coverage.test: OK (${manifestKeys.length} entries, ${baselineKeys.length} baseline keys)`,
);
