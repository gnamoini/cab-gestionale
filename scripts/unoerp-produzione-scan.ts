import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { discoveryInfo } from "@/lib/integrations/unoerp/discovery-readonly";

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

const files = [
  "preventivo",
  "ordine",
  "ordini_vendita",
  "commessa",
  "commesse",
  "lavorazione",
  "lavorazioni",
  "attivita",
  "rendicontazione",
  "consuntivo",
  "consuntivi",
  "fatturazione",
  "documenti_vendita",
  "vendite",
  "materiali",
  "risorse_umane",
];

async function main() {
  for (const file of files) {
    try {
      const i = await discoveryInfo("Produzione", file);
      if (i?.info?.fieldset) {
        console.log("FOUND", file, i.info.primary_key, Object.keys(i.info.fieldset).length);
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("500")) console.log("500", file);
    }
  }
}

void main();
