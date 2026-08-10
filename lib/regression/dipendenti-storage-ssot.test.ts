import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildBulkRowsFromResolved, resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Write path: solo dipendentiRecords in lavorazioni.prefs
{
  const resolved = resolveCabAppSettingsFromRows([]);
  const rows = buildBulkRowsFromResolved(resolved);
  const lav = rows.find((r) => r.module === "lavorazioni" && r.key === "prefs");
  assert.ok(lav);
  assert.ok("dipendentiRecords" in lav!.value);
  assert.equal("addettiRecords" in lav!.value, false);
  assert.equal("addetti" in lav!.value, false);
}

// Nessun write target addettiRecords fuori allowlist
const allowWrite = [
  "src/lib/app-settings/resolve-from-rows.ts",
  "lib/configurazione/settings-workspace-snapshot.ts",
  "lib/lavorazioni/addetto-model.ts",
  "lib/regression/",
  "lib/dipendenti/dipendente-record.ts",
];

function allowed(rel: string): boolean {
  const norm = rel.replace(/\\/g, "/");
  return allowWrite.some((a) => norm.includes(a));
}

const writeViolations: string[] = [];
const scanFiles = [
  "src/lib/global-list/global-settings-list-keys.ts",
  "lib/data-import/entities/settings-list/settings-list-import.plugin.server.ts",
  "components/dashboard/settings/settings-workspace-shell.tsx",
];

for (const rel of scanFiles) {
  const src = read(rel);
  if (src.includes("addettiRecords:") && !allowed(rel)) {
    writeViolations.push(`${rel}: contains addettiRecords write key`);
  }
  if (rel.includes("global-settings-list-keys") && src.includes("dipendentiRecords")) {
    // ok
  }
}

assert.equal(writeViolations.length, 0, writeViolations.join("\n"));

console.log("dipendenti-storage-ssot.test.ts OK");
