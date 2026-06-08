/**
 * Advisory: conta residui dati smoke (AUDIT-*, E2E-*, smoke-doc) nel DB condiviso CI.
 * Dry-run only — non elimina.
 *
 * Env:
 * - SMOKE_RESIDUE_OPERATIVE_THRESHOLD (default 5): soglia entità operative post-cleanup
 * - SMOKE_RESIDUE_STRICT=1: exit 1 se totale operativo > soglia (cert blocking opzionale)
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  containsSmokeAuditToken,
  isSmokeDocumentFilename,
  isSmokeLogModificheRow,
  isSmokeRicambioCodice,
} from "@/lib/smoke/smoke-data-markers";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

const ROOT = process.cwd();
const DEFAULT_OPERATIVE_THRESHOLD = 5;

function loadEnvLocal(): void {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function operativeThreshold(): number {
  const raw = process.env.SMOKE_RESIDUE_OPERATIVE_THRESHOLD?.trim();
  if (!raw) return DEFAULT_OPERATIVE_THRESHOLD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_OPERATIVE_THRESHOLD;
}

type ResidueReport = {
  lavorazioniNotes: number;
  schedeIngresso: number;
  ricambiE2E: number;
  documentiSmoke: number;
  logModificheSmoke: number;
  appSettingsTokens: number;
  storageSmokeDocPaths: number;
  warnings: string[];
};

async function main(): Promise<void> {
  loadEnvLocal();

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY mancante.");
    process.exit(1);
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const threshold = operativeThreshold();
  const strict = process.env.SMOKE_RESIDUE_STRICT === "1";

  const report: ResidueReport = {
    lavorazioniNotes: 0,
    schedeIngresso: 0,
    ricambiE2E: 0,
    documentiSmoke: 0,
    logModificheSmoke: 0,
    appSettingsTokens: 0,
    storageSmokeDocPaths: 0,
    warnings: [],
  };

  const { data: lavs, error: lavErr } = await admin
    .from("lavorazioni")
    .select("id, note")
    .is("deleted_at", null);
  if (lavErr) report.warnings.push(`lavorazioni: ${lavErr.message}`);
  else report.lavorazioniNotes = (lavs ?? []).filter((r) => containsSmokeAuditToken((r as { note: string | null }).note)).length;

  const { data: schede, error: schedaErr } = await admin
    .from("scheda_lavorazione")
    .select("lavorazione_id, contenuto")
    .eq("tipo", "ingresso");
  if (schedaErr) report.warnings.push(`scheda_lavorazione: ${schedaErr.message}`);
  else {
    report.schedeIngresso = (schede ?? []).filter((r) => {
      try {
        return containsSmokeAuditToken(JSON.stringify((r as { contenuto: unknown }).contenuto ?? {}));
      } catch {
        return false;
      }
    }).length;
  }

  const { data: ricambi, error: ricErr } = await admin.from("magazzino_ricambi").select("id, codice").ilike("codice", "E2E-%");
  if (ricErr) report.warnings.push(`magazzino_ricambi: ${ricErr.message}`);
  else report.ricambiE2E = (ricambi ?? []).filter((r) => isSmokeRicambioCodice((r as { codice: string }).codice)).length;

  const { data: docs, error: docErr } = await admin.from("documenti").select("id, nome_file");
  if (docErr) report.warnings.push(`documenti: ${docErr.message}`);
  else report.documentiSmoke = (docs ?? []).filter((r) => isSmokeDocumentFilename((r as { nome_file: string | null }).nome_file)).length;

  const { data: logs, error: logErr } = await admin.from("log_modifiche").select("id, entita_id, payload").limit(10_000);
  if (logErr) report.warnings.push(`log_modifiche: ${logErr.message}`);
  else report.logModificheSmoke = (logs ?? []).filter((r) => isSmokeLogModificheRow(r as { entita_id: string; payload: unknown })).length;

  const { data: settings, error: setErr } = await admin
    .from("app_settings")
    .select("id, value")
    .in("module", ["mezzi", "lavorazioni", "magazzino"]);
  if (setErr) report.warnings.push(`app_settings: ${setErr.message}`);
  else {
    for (const row of settings ?? []) {
      try {
        const json = JSON.stringify((row as { value: unknown }).value ?? {});
        if (containsSmokeAuditToken(json)) report.appSettingsTokens += 1;
      } catch {
        /* ignore */
      }
    }
  }

  const { data: storageList, error: storageErr } = await admin.storage.from(STORAGE_BUCKETS.documenti).list("", { limit: 1000 });
  if (storageErr) report.warnings.push(`storage: ${storageErr.message}`);
  else {
    report.storageSmokeDocPaths = (storageList ?? []).filter((o) => o.name.toLowerCase().includes("smoke-doc")).length;
  }

  const operativeTotal =
    report.lavorazioniNotes +
    report.schedeIngresso +
    report.ricambiE2E +
    report.documentiSmoke +
    report.appSettingsTokens +
    report.storageSmokeDocPaths;

  console.log("\nSmoke residue audit\n");
  console.log(`  soglia operativa: ${threshold} (strict=${strict ? "1" : "0"})`);
  console.log(`  lavorazioni (note AUDIT): ${report.lavorazioniNotes}`);
  console.log(`  schede ingresso (contenuto AUDIT): ${report.schedeIngresso}`);
  console.log(`  ricambi E2E: ${report.ricambiE2E}`);
  console.log(`  documenti smoke-doc: ${report.documentiSmoke}`);
  console.log(`  log_modifiche smoke-like: ${report.logModificheSmoke} (informativo, escluso da totale operativo)`);
  console.log(`  app_settings rows con token AUDIT: ${report.appSettingsTokens}`);
  console.log(`  storage paths smoke-doc (root list): ${report.storageSmokeDocPaths}`);
  console.log(`  totale entità operative: ${operativeTotal}`);
  if (report.warnings.length) {
    console.log(`  warnings: ${report.warnings.length}`);
    for (const w of report.warnings) console.log(`    - ${w}`);
  }
  console.log("");

  if (operativeTotal > threshold) {
    console.log("STATUS: WARN");
    console.log(
      `SUMMARY: smoke-residue audit — WARN (${operativeTotal} residui operativi > soglia ${threshold}; log_modifiche=${report.logModificheSmoke} informativo)`,
    );
    if (strict) process.exit(1);
    process.exit(0);
  }

  console.log("STATUS: PASS");
  console.log(`SUMMARY: smoke-residue audit — PASS (${operativeTotal} residui operativi ≤ soglia ${threshold})`);
}

void main();
