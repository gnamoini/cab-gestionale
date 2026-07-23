import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LAVORAZIONI_MEZZO_ID_FKEY,
  lavorazioniMezziEmbedSelect,
} from "@/lib/db/table-select-columns";

assert.equal(lavorazioniMezziEmbedSelect("id, targa"), `mezzi!${LAVORAZIONI_MEZZO_ID_FKEY}(id, targa)`);
assert.equal(
  lavorazioniMezziEmbedSelect("cliente", { inner: true }),
  `mezzi!${LAVORAZIONI_MEZZO_ID_FKEY}!inner(cliente)`,
);

const ROOT = process.cwd();
const PROD_DIRS = ["lib", "src", "components", "app"] as const;
const ALLOW_UNQUALIFIED_MEZZI_EMBED = new Set([
  "lib/preventivi/preventivi-list-fetch.ts",
  "lib/db/table-select-columns.ts",
  "lib/db/lavorazioni-mezzi-embed.test.ts",
]);

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walkTsFiles(abs, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

const unqualifiedMezziEmbed = /\bmezzi!inner\s*\(|\bmezzi\s*\(/;
const usesLavorazioniFrom = /\.from\(\s*["']lavorazioni["']\s*\)/;

for (const dir of PROD_DIRS) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) continue;
  for (const abs of walkTsFiles(base)) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (ALLOW_UNQUALIFIED_MEZZI_EMBED.has(rel)) continue;
    const src = fs.readFileSync(abs, "utf8");
    if (!usesLavorazioniFrom.test(src) || !unqualifiedMezziEmbed.test(src)) continue;
    if (src.includes(LAVORAZIONI_MEZZO_ID_FKEY) || src.includes("lavorazioniMezziEmbedSelect")) continue;
    assert.fail(`${rel}: embed mezzi da lavorazioni senza hint FK ${LAVORAZIONI_MEZZO_ID_FKEY}`);
  }
}

const knownFixed = [
  "lib/lavorazioni/lavorazioni-list-fetch.ts",
  "lib/lavorazioni/fetch-enriched-lavorazione-row.ts",
  "lib/bff/lavorazione-hub-fetch-server.ts",
  "lib/workshop-schedule/workshop-schedule-fetch-server.ts",
  "src/services/workshop-schedule.service.ts",
];

for (const rel of knownFixed) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /lavorazioniMezziEmbedSelect|LAVORAZIONI_MEZZO_ID_FKEY/, `${rel} must disambiguate mezzi embed`);
}

console.log("lavorazioni-mezzi-embed.test.ts OK");
