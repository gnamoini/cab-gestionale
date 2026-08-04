/**
 * Policy: moduli settings/rename importati nel bundle client non usano node:crypto
 * (Turbopack polyfill → randomUUID is not a function).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkSettingsTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...walkSettingsTsFiles(full));
    else if (name.name.endsWith(".ts") && !name.name.endsWith(".server.ts") && !name.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const settingsDir = path.join(ROOT, "lib/settings");
const settingsFiles = walkSettingsTsFiles(settingsDir);

for (const file of settingsFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(
    src,
    /from\s+["']node:crypto["']/,
    `${rel}: no node:crypto in client-importable settings modules`,
  );
  if (/crypto\.randomUUID\s*\(/.test(src)) {
    assert.match(
      src,
      /createRandomUuid|typeof\s+crypto|randomUUID\s+in\s+crypto|typeof\s+c\.randomUUID/,
      `${rel}: crypto.randomUUID must use createRandomUuid or explicit fallback`,
    );
  }
}

const renameClientServices = [
  "src/services/settings-rename-engine.service.ts",
  "src/services/settings-rename-propagation.service.ts",
  "src/services/settings-rename-job.service.ts",
  "lib/settings/rename-engine/rename-plan.ts",
];

for (const rel of renameClientServices) {
  const src = read(rel);
  assert.doesNotMatch(src, /from\s+["']node:crypto["']/, `${rel}: no node:crypto`);
}

console.log("client-crypto-import-policy.test.ts OK");
