/**
 * Manifest anon policy: only PUBLIC_SAFE may grant anon EXECUTE.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  entries: Record<string, { anonAllow?: boolean; grants?: string[]; classification?: string }>;
};

const violations: string[] = [];
for (const [key, entry] of Object.entries(manifest.entries)) {
  const hasAnonGrant = entry.grants?.includes("anon");
  if (entry.anonAllow && entry.classification !== "PUBLIC_SAFE") {
    violations.push(`${key}: anonAllow without PUBLIC_SAFE`);
  }
  if (hasAnonGrant && entry.classification !== "PUBLIC_SAFE") {
    violations.push(`${key}: grants include anon without PUBLIC_SAFE`);
  }
  if (entry.classification === "PUBLIC_SAFE" && !hasAnonGrant) {
    violations.push(`${key}: PUBLIC_SAFE must grant anon`);
  }
}

assert.equal(violations.length, 0, `manifest anon violations:\n${violations.join("\n")}`);
console.log(`security-definer-anon-execute.test: OK (${Object.keys(manifest.entries).length} entries)`);
