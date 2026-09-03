/**
 * Discovery UnoERP — 100% READ-ONLY (info / index / show).
 * Uso: npx tsx scripts/unoerp-discovery.ts [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  isUnoerpConfigured,
  readUnoerpApiUser,
  readUnoerpBaseUrl,
} from "@/lib/env/unoerp.server";
import { verifyUnoerpConnection } from "@/lib/integrations/unoerp/auth-connection";
import {
  anonymizeRecord,
  firstIndexRow,
  summarizeFieldset,
} from "@/lib/integrations/unoerp/discovery-anonymize";
import {
  discoveryIndex,
  discoveryInfo,
  discoveryShow,
  UNOERP_READONLY_ACTS,
} from "@/lib/integrations/unoerp/discovery-readonly";
import { UnoerpError } from "@/lib/integrations/unoerp/errors";

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

const DRY_RUN = process.argv.includes("--dry-run");

type Candidate = { area: string; module: string; file: string; keywords: string[] };

const CANDIDATES: Candidate[] = [
  { area: "customer", module: "Base", file: "clienti", keywords: ["client", "anagraf"] },
  { area: "customer", module: "Base", file: "anagrafiche", keywords: ["client", "anagraf"] },
  { area: "customer", module: "Base", file: "fornitori", keywords: ["fornit"] },
  { area: "iva", module: "Base", file: "iva", keywords: ["iva"] },
  { area: "uom", module: "Base", file: "um", keywords: ["unit", "misur"] },
  { area: "uom", module: "Base", file: "unita_misura", keywords: ["unit", "misur"] },
  { area: "payment", module: "Base", file: "pagamenti", keywords: ["pagament"] },
  { area: "payment", module: "Base", file: "modalita_pagamento", keywords: ["pagament"] },
  { area: "sectional", module: "Amministrazione", file: "sezionali", keywords: ["sezional"] },
  { area: "carrier", module: "Base", file: "vettori", keywords: ["vettor"] },
  { area: "causal", module: "Base", file: "causali", keywords: ["causal"] },
  { area: "item", module: "Magazzino", file: "articoli", keywords: ["artic", "merce"] },
  { area: "item", module: "Magazzino", file: "servizi", keywords: ["serviz"] },
  { area: "ddt", module: "Magazzino", file: "movimento", keywords: ["ddt", "moviment", "trasport"] },
  { area: "ddt", module: "Magazzino", file: "causali_trasporto", keywords: ["trasport"] },
  { area: "ddt", module: "Magazzino", file: "ddt", keywords: ["ddt"] },
  { area: "ddt", module: "Magazzino", file: "causali_magazzino", keywords: ["causal", "magazz"] },
  { area: "preventivo", module: "CRM", file: "preventivi", keywords: ["prevent"] },
  { area: "preventivo", module: "CRM", file: "ordini", keywords: ["ordine", "vendit"] },
  { area: "preventivo", module: "Commerciale", file: "preventivi", keywords: ["prevent"] },
  { area: "preventivo", module: "Commerciale", file: "ordini", keywords: ["ordine"] },
  { area: "preventivo", module: "Vendite", file: "preventivi", keywords: ["prevent"] },
  { area: "consuntivo", module: "CRM", file: "consuntivi", keywords: ["consunt"] },
  { area: "consuntivo", module: "Produzione", file: "consuntivi", keywords: ["consunt"] },
  { area: "consuntivo", module: "Produzione", file: "rendicontazione", keywords: ["rendicont", "consunt"] },
  { area: "consuntivo", module: "Produzione", file: "attivita", keywords: ["attivit", "ore"] },
  { area: "consuntivo", module: "Produzione", file: "ore", keywords: ["ore", "manodop"] },
  { area: "consuntivo", module: "Commesse", file: "commesse", keywords: ["commess", "task"] },
  { area: "consuntivo", module: "Commesse", file: "task", keywords: ["task", "commess"] },
  { area: "consuntivo", module: "Commesse", file: "consuntivi", keywords: ["consunt"] },
  { area: "consuntivo", module: "CRM", file: "task", keywords: ["task"] },
];

type ModuleProbe = {
  area: string;
  module: string;
  file: string;
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  primaryKey: string | null;
  fieldCount: number;
  fields: ReturnType<typeof summarizeFieldset>;
  sampleRowId: string | null;
  error?: string;
  operations: string[];
};

type DiscoveryReport = {
  timestamp: string;
  endpoint: string;
  accountHint: string;
  uid?: string;
  auth: "PASS" | "FAIL";
  readOnly: true;
  allowedActs: readonly string[];
  operationsExecuted: string[];
  writeTestsExecuted: 0;
  modules: ModuleProbe[];
  winners: Record<string, ModuleProbe | null>;
};

function anonymizeAccount(user: string | null): string {
  if (!user) return "API_KEY";
  if (user.length <= 2) return "**";
  return `${user.slice(0, 2)}***`;
}

async function probeCandidate(c: Candidate): Promise<ModuleProbe> {
  const ops: string[] = [];
  const base: ModuleProbe = {
    area: c.area,
    module: c.module,
    file: c.file,
    status: "NOT_FOUND",
    primaryKey: null,
    fieldCount: 0,
    fields: [],
    sampleRowId: null,
    operations: ops,
  };
  try {
    ops.push(`info:${c.module}/${c.file}`);
    const info = await discoveryInfo(c.module, c.file);
    if (!info?.info?.fieldset) {
      base.error = "info without fieldset";
      return base;
    }
    base.status = "FOUND";
    base.primaryKey = info.info.primary_key ?? null;
    base.fields = summarizeFieldset(info.info.fieldset);
    base.fieldCount = base.fields.length;

    ops.push(`index:${c.module}/${c.file}`);
    const index = await discoveryIndex(c.module, c.file);
    const pk = base.primaryKey ?? "id";
    const rowId = firstIndexRow(index, pk);
    base.sampleRowId = rowId ? `SAMPLE_${c.area.toUpperCase()}` : null;

    if (rowId) {
      ops.push(`show:${c.module}/${c.file}/${rowId}`);
      await discoveryShow(c.module, c.file, rowId);
    }
    return base;
  } catch (e) {
    const msg = e instanceof UnoerpError ? e.message : e instanceof Error ? e.message : String(e);
    if (/not found|non trovato|invalid module|modulo/i.test(msg)) {
      base.status = "NOT_FOUND";
      base.error = msg;
      return base;
    }
    base.status = "ERROR";
    base.error = msg;
    return base;
  }
}

function pickWinner(area: string, probes: ModuleProbe[]): ModuleProbe | null {
  const found = probes.filter((p) => p.area === area && p.status === "FOUND");
  if (found.length === 0) return null;
  return found.sort((a, b) => b.fieldCount - a.fieldCount)[0] ?? null;
}

function fieldNames(probe: ModuleProbe | null, match: RegExp): string[] {
  if (!probe) return [];
  return probe.fields.filter((f) => match.test(`${f.field} ${f.label ?? ""}`)).map((f) => f.field);
}

async function main() {
  loadEnvFile(".env.local");
  const outDir = join(process.cwd(), "artifacts", "unoerp-discovery");
  const rawDir = join(outDir, "raw");
  const normDir = join(outDir, "normalized");
  const reportsDir = join(outDir, "reports");
  for (const d of [rawDir, normDir, reportsDir]) mkdirSync(d, { recursive: true });

  if (!isUnoerpConfigured()) {
    console.error("BLOCKED: UNOERP_BASE_URL + credentials missing");
    process.exit(1);
  }

  const endpoint = `${readUnoerpBaseUrl()?.replace(/\/$/, "")}/intranet/api.php`;
  const accountHint = anonymizeAccount(readUnoerpApiUser());

  if (DRY_RUN) {
    console.log("DRY-RUN: would probe", CANDIDATES.length, "candidates on", endpoint);
    process.exit(0);
  }

  let uid: string | undefined;
  let auth: "PASS" | "FAIL" = "FAIL";
  try {
    const conn = await verifyUnoerpConnection();
    auth = "PASS";
    uid = conn.uid;
  } catch (e) {
    console.error("Auth failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.log(`Discovery READ-ONLY on ${endpoint}`);
  const modules: ModuleProbe[] = [];
  const allOps: string[] = [`auth:basic_or_token`];

  for (const c of CANDIDATES) {
    process.stdout.write(`probe ${c.module}/${c.file}... `);
    const probe = await probeCandidate(c);
    modules.push(probe);
    allOps.push(...probe.operations);
    console.log(probe.status);
    if (probe.status === "FOUND") {
      writeFileSync(
        join(normDir, `${c.module}__${c.file}.json`),
        JSON.stringify(
          {
            module: c.module,
            file: c.file,
            area: c.area,
            primaryKey: probe.primaryKey,
            fields: probe.fields,
            sampleRowId: probe.sampleRowId,
          },
          null,
          2,
        ),
      );
    }
  }

  const winners = {
    customer: pickWinner("customer", modules),
    preventivo: pickWinner("preventivo", modules),
    consuntivo: pickWinner("consuntivo", modules),
    ddt: pickWinner("ddt", modules),
    item: pickWinner("item", modules),
    iva: pickWinner("iva", modules),
    uom: pickWinner("uom", modules),
    payment: pickWinner("payment", modules),
    sectional: pickWinner("sectional", modules),
    causal: pickWinner("causal", modules),
  };

  const report: DiscoveryReport = {
    timestamp: new Date().toISOString(),
    endpoint,
    accountHint,
    uid,
    auth,
    readOnly: true,
    allowedActs: UNOERP_READONLY_ACTS,
    operationsExecuted: allOps,
    writeTestsExecuted: 0,
    modules,
    winners,
  };

  writeFileSync(join(reportsDir, "discovery-report.json"), JSON.stringify(report, null, 2));

  // Markdown summary for discovery-run.md (no secrets)
  const md = [
    "# Discovery run",
    "",
    `- **Timestamp:** ${report.timestamp}`,
    `- **Endpoint:** ${endpoint}`,
    `- **Account:** ${accountHint}`,
    `- **UID:** ${uid ?? "n/a"}`,
    `- **Authentication:** ${auth}`,
    `- **READ_ONLY:** PASS`,
    `- **Acts used:** ${UNOERP_READONLY_ACTS.join(", ")}`,
    `- **WRITE TESTS EXECUTED:** 0`,
    "",
    "## Modules found",
    "",
    ...modules
      .filter((m) => m.status === "FOUND")
      .map((m) => `- \`${m.module}/${m.file}\` (${m.area}) PK=\`${m.primaryKey}\` fields=${m.fieldCount}`),
    "",
    "## Winners",
    "",
    ...Object.entries(winners).map(([k, v]) => `- **${k}:** ${v ? `\`${v.module}/${v.file}\`` : "NOT_FOUND"}`),
  ].join("\n");

  writeFileSync(join(reportsDir, "discovery-run.md"), md);
  console.log("\nDone. Reports in artifacts/unoerp-discovery/reports/");
  console.log("WRITE TESTS EXECUTED = 0");

  // ponytail: exit cleanly on Windows (avoid UV_HANDLE_CLOSING)
  setTimeout(() => process.exit(0), 100);
}

void main();
