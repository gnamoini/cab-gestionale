import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anonymizeRecord, summarizeFieldset } from "@/lib/integrations/unoerp/discovery-anonymize";
import { discoveryIndex, discoveryInfo, discoveryShow } from "@/lib/integrations/unoerp/discovery-readonly";

function loadEnvFile(rel: string): void {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");

const TARGETS = [
  { module: "Magazzino", file: "articoli", area: "item" },
  { module: "Magazzino", file: "causali_magazzino", area: "ddt_causal" },
  { module: "Produzione", file: "ordini", area: "preventivo_candidate" },
  { module: "Produzione", file: "task", area: "consuntivo_candidate" },
  { module: "Base", file: "iva", area: "iva" },
  { module: "Base", file: "unita_misura", area: "uom" },
  { module: "Base", file: "modalita_pagamento", area: "payment" },
  { module: "Amministrazione", file: "sezionali", area: "sectional" },
  { module: "Magazzino", file: "listini", area: "listini" },
];

function firstRow(index: unknown, pk: string): { id: string; row: Record<string, unknown> } | null {
  const data = (index as { data?: Record<string, Record<string, Record<string, unknown>>> })?.data;
  if (!data) return null;
  for (const tab of Object.values(data)) {
    if (!tab || typeof tab !== "object") continue;
    for (const row of Object.values(tab)) {
      if (row && typeof row === "object" && pk in row) {
        return { id: String(row[pk]), row: row as Record<string, unknown> };
      }
    }
  }
  return null;
}

async function main() {
  const outDir = join(process.cwd(), "artifacts", "unoerp-discovery", "normalized");
  const summary: Record<string, unknown> = {};
  for (const t of TARGETS) {
    try {
      const info = await discoveryInfo(t.module, t.file);
      const pk = info.info?.primary_key ?? "id";
      const fields = summarizeFieldset(info.info?.fieldset);
      let sample: Record<string, unknown> | null = null;
      let showKeys: string[] = [];
      try {
        const index = await discoveryIndex(t.module, t.file);
        const hit = firstRow(index, pk);
        if (hit) {
          sample = anonymizeRecord(hit.row);
          try {
            const show = await discoveryShow(t.module, t.file, hit.id);
            if (show && typeof show === "object") {
              showKeys = Object.keys(show as Record<string, unknown>);
              const data = (show as { data?: Record<string, unknown> }).data;
              if (data) sample = anonymizeRecord(data);
            }
          } catch {
            // show optional
          }
        }
      } catch {
        // index optional
      }
      const payload = { ...t, primaryKey: pk, fields, sample, showTopLevelKeys: showKeys };
      summary[`${t.module}/${t.file}`] = payload;
      writeFileSync(join(outDir, `detail__${t.module}__${t.file}.json`), JSON.stringify(payload, null, 2));
      console.log("OK", t.module, t.file, pk, fields.length, sample ? "sample" : "no-sample");
    } catch (e) {
      console.log("FAIL", t.module, t.file, e instanceof Error ? e.message : e);
    }
  }
  writeFileSync(join(outDir, "discovery-summary.json"), JSON.stringify(summary, null, 2));
}

void main();
