import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const modules = [
  "Base",
  "Anagrafica",
  "CRM",
  "Commerciale",
  "Vendite",
  "Magazzino",
  "Documenti",
  "Fatturazione",
  "Contabilita",
  "Commesse",
  "Produzione",
  "Amministrazione",
  "Preventivi",
  "Ordini",
  "DDT",
  "Trasporti",
  "Rubrica",
  "Soggetti",
];

const files = [
  "clienti",
  "cliente",
  "anagrafica",
  "anagrafiche",
  "anagrafica_clienti",
  "anagrafica_cliente",
  "soggetti",
  "rubrica",
  "contatti",
  "fornitori",
  "preventivi",
  "preventivo",
  "offerte",
  "offerta",
  "quotazioni",
  "ddt",
  "bolla",
  "bolle",
  "documenti_trasporto",
  "documento_trasporto",
  "trasporti",
  "movimenti",
  "movimenti_magazzino",
  "consuntivi",
  "consuntivo",
  "rendicontazione",
  "rendiconti",
  "attivita",
  "attività",
  "ore",
  "ore_lavoro",
  "manodopera",
  "lavorazioni",
  "commesse",
  "task",
  "ordini",
  "ordini_vendita",
  "ordine",
  "fatture",
  "fattura",
  "documenti",
  "documento",
  "righe",
  "righe_preventivo",
  "righe_ordine",
  "righe_ddt",
  "destinazioni",
  "agenti",
  "servizi",
  "articoli",
  "listini",
  "causali",
  "causali_magazzino",
  "sezionali",
  "iva",
  "unita_misura",
  "modalita_pagamento",
];

async function main() {
  const found: string[] = [];
  for (const module of modules) {
    for (const file of files) {
      try {
        const info = await discoveryInfo(module, file);
        if (info?.info?.fieldset) {
          const pk = info.info.primary_key ?? "?";
          const n = Object.keys(info.info.fieldset).length;
          const line = `${module}/${file} pk=${pk} fields=${n}`;
          if (!found.includes(line)) {
            found.push(line);
            console.log("FOUND", line);
          }
        }
      } catch {
        // skip
      }
    }
  }
  writeFileSync(
    join(process.cwd(), "artifacts", "unoerp-discovery", "reports", "module-scan-extended.txt"),
    found.join("\n"),
  );
  console.log("total found", found.length);
}

void main();
