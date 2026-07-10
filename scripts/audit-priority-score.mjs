#!/usr/bin/env node
/**
 * Stampa ranking Priority = (S×3 + B×2) − C − (R×3) dal registry audit.
 * Uso: node scripts/audit-priority-score.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "scripts/audit-simplification-registry.json");

/** @type {Array<{ id: string; pr: string; sprint: number; label: string; S: number; B: number; C: number; R: number }>} */
const FALLBACK = [
  { id: "2", pr: "PR-01", sprint: 1, label: "Bridge promemoria", S: 10, B: 4, C: 1, R: 0 },
  { id: "1", pr: "PR-02", sprint: 1, label: "sanity-assertions.ts", S: 10, B: 3, C: 1, R: 0 },
  { id: "33", pr: "PR-03", sprint: 1, label: "tier-1 dead exports", S: 10, B: 5, C: 2, R: 1 },
  { id: "3,32", pr: "PR-04", sprint: 1, label: "stock.ts + ts-node", S: 10, B: 2, C: 1, R: 0 },
  { id: "12,5-8", pr: "PR-05", sprint: 1, label: "lavorazioni dead exports", S: 10, B: 3, C: 1, R: 1 },
  { id: "4", pr: "PR-06", sprint: 2, label: "rbac stubs", S: 10, B: 4, C: 3, R: 2 },
  { id: "9-11", pr: "PR-07", sprint: 2, label: "mezzi/report/ui exports", S: 10, B: 4, C: 3, R: 2 },
  { id: "13-14", pr: "PR-08", sprint: 2, label: "re-export files", S: 10, B: 2, C: 1, R: 2 },
  { id: "33-fe", pr: "PR-09", sprint: 2, label: "fe-sdi-adapter", S: 10, B: 2, C: 1, R: 2 },
  { id: "33-alias", pr: "PR-10", sprint: 2, label: "schede/lavorazioni aliases", S: 10, B: 2, C: 1, R: 2 },
  { id: "16", pr: "PR-11", sprint: 2, label: "NewLavorazioneModal", S: 9, B: 8, C: 3, R: 2 },
  { id: "17-19", pr: "PR-12", sprint: 2, label: "legacy functions + gestionale.ts", S: 9, B: 4, C: 2, R: 2 },
  { id: "21,35,36,24,22-23", pr: "PR-13", sprint: 2, label: "SSOT dedup batch", S: 9, B: 4, C: 2, R: 2 },
  { id: "34", pr: "PR-14", sprint: 2, label: "switch→map", S: 9, B: 5, C: 3, R: 2 },
  { id: "25-26", pr: "PR-15", sprint: 2.5, label: "localStorage branches", S: 9, B: 4, C: 2, R: 2 },
  { id: "20", pr: "PR-16", sprint: 3, label: "global-loading collapse", S: 9, B: 2, C: 2, R: 2 },
  { id: "30", pr: "PR-17", sprint: 3, label: "LavorazioniDesktopTableShell", S: 8, B: 2, C: 2, R: 2 },
  { id: "27", pr: "PR-18", sprint: 3, label: "normalizeRoleKey SSOT", S: 7, B: 5, C: 4, R: 4 },
  { id: "28", pr: "PR-19", sprint: 3, label: "module labels", S: 7, B: 3, C: 3, R: 3 },
];

function priority({ S, B, C, R }) {
  return S * 3 + B * 2 - C - R * 3;
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return FALLBACK;
  const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return Array.isArray(raw) ? raw : raw.items ?? FALLBACK;
}

const items = loadRegistry()
  .map((item) => ({ ...item, P: priority(item) }))
  .sort((a, b) => b.P - a.P);

console.log("Rank | PR     | Sprint | P  | S | B | C | R | Label");
console.log("-----|--------|--------|----|---|---|---|---|------");
for (let i = 0; i < items.length; i++) {
  const r = items[i];
  const sprint = String(r.sprint).padEnd(6);
  console.log(
    `${String(i + 1).padStart(4)} | ${r.pr.padEnd(6)} | ${sprint} | ${String(r.P).padStart(2)} | ${r.S} | ${r.B} | ${r.C} | ${r.R} | ${r.label}`,
  );
}
