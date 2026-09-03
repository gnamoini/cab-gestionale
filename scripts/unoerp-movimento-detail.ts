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
  { module: "Magazzino", file: "movimento" },
  { module: "Magazzino", file: "causali_trasporto" },
  { module: "Base", file: "vettori" },
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
  for (const t of TARGETS) {
    const info = await discoveryInfo(t.module, t.file);
    const pk = info.info?.primary_key ?? "id";
    const fields = summarizeFieldset(info.info?.fieldset);
    let sample: Record<string, unknown> | null = null;
    try {
      const index = await discoveryIndex(t.module, t.file);
      const hit = firstRow(index, pk);
      if (hit) {
        sample = anonymizeRecord(hit.row);
        try {
          const show = await discoveryShow(t.module, t.file, hit.id);
          const data = (show as { data?: Record<string, unknown> }).data;
          if (data) sample = anonymizeRecord(data);
        } catch {
          // optional
        }
      }
    } catch {
      // optional
    }
    const payload = { ...t, primaryKey: pk, fields, sample };
    writeFileSync(join(outDir, `detail__${t.module}__${t.file}.json`), JSON.stringify(payload, null, 2));
    console.log(t.module, t.file, fields.map((f) => f.field).join(", "));
  }
}

void main();
