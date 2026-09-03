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
  "movimenti",
  "movimento",
  "movimenti_magazzino",
  "documenti",
  "documenti_magazzino",
  "ddt",
  "bolle",
  "bolla",
  "trasporti",
  "causali_trasporto",
  "vettori",
  "magazzino",
  "depositi",
  "giacenze",
  "preventivi",
  "offerte",
  "clienti",
  "anagrafica",
];

async function main() {
  for (const file of files) {
    for (const module of ["Magazzino", "Produzione", "CRM", "Documenti", "Base"]) {
      try {
        const info = await discoveryInfo(module, file);
        if (info?.info?.fieldset) {
          console.log("FOUND", module, file, info.info.primary_key, Object.keys(info.info.fieldset).length);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("500")) console.log("500", module, file);
        else if (msg.includes("404")) continue;
        else console.log("ERR", module, file, msg);
      }
    }
  }
}

void main();
