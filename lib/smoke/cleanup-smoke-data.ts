import type { SupabaseClient } from "@supabase/supabase-js";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { pruneSmokeAppSettingsValue } from "@/lib/smoke/prune-smoke-app-settings";
import {
  containsSmokeAuditToken,
  isSmokeDocumentFilename,
  isSmokeLogModificheRow,
  isSmokeRicambioCodice,
} from "@/lib/smoke/smoke-data-markers";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

export type SmokeCleanupOptions = {
  apply: boolean;
  verbose?: boolean;
};

export type SmokeCleanupReport = {
  lavorazioni: string[];
  mezzi: string[];
  ricambi: string[];
  documenti: string[];
  logModifiche: string[];
  appSettingsRows: { module: string; key: string; removedCount: number }[];
  errors: string[];
};

type LavorazioneRow = { id: string; note: string | null; mezzo_id: string | null };
type SchedaRow = { lavorazione_id: string; contenuto: unknown };
type MezzoRow = { id: string; cliente: string | null; marca: string | null; matricola: string | null; meta: unknown };
type DocumentoRow = { id: string; nome_file: string | null; url_file: string };
type RicambioRow = { id: string; codice: string };
type AppSettingRow = { id: string; module: string; key: string; value: Record<string, unknown> };
type LavDocRow = { storage_path: string };
type LogModificaRow = { id: string; entita_id: string; payload: unknown };

function schedaContainsSmokeToken(contenuto: unknown): boolean {
  try {
    return containsSmokeAuditToken(JSON.stringify(contenuto ?? {}));
  } catch {
    return false;
  }
}

function mezzoContainsSmokeToken(row: MezzoRow): boolean {
  const parts = [row.cliente, row.marca, row.matricola];
  if (parts.some((p) => containsSmokeAuditToken(p))) return true;
  try {
    return containsSmokeAuditToken(JSON.stringify(row.meta ?? {}));
  } catch {
    return false;
  }
}

async function findSmokeLavorazioneIds(admin: SupabaseClient): Promise<string[]> {
  const ids = new Set<string>();

  const { data: schede, error: schedaErr } = await admin
    .from("scheda_lavorazione")
    .select("lavorazione_id, contenuto")
    .eq("tipo", "ingresso");
  if (schedaErr) throw new Error(`scheda_lavorazione: ${schedaErr.message}`);
  for (const row of (schede ?? []) as SchedaRow[]) {
    if (schedaContainsSmokeToken(row.contenuto)) ids.add(row.lavorazione_id);
  }

  const { data: lavs, error: lavErr } = await admin
    .from("lavorazioni")
    .select("id, note")
    .is("deleted_at", null);
  if (lavErr) throw new Error(`lavorazioni: ${lavErr.message}`);
  for (const row of (lavs ?? []) as Pick<LavorazioneRow, "id" | "note">[]) {
    if (containsSmokeAuditToken(row.note)) ids.add(row.id);
  }

  return [...ids];
}

async function findSmokeDocumenti(admin: SupabaseClient): Promise<DocumentoRow[]> {
  const { data, error } = await admin.from("documenti").select("id, nome_file, url_file");
  if (error) throw new Error(`documenti: ${error.message}`);
  return ((data ?? []) as DocumentoRow[]).filter((r) => isSmokeDocumentFilename(r.nome_file));
}

async function findSmokeRicambi(admin: SupabaseClient): Promise<RicambioRow[]> {
  const { data, error } = await admin.from("magazzino_ricambi").select("id, codice").ilike("codice", "E2E-%");
  if (error) throw new Error(`magazzino_ricambi: ${error.message}`);
  return ((data ?? []) as RicambioRow[]).filter((r) => isSmokeRicambioCodice(r.codice));
}

async function findOrphanSmokeMezzi(admin: SupabaseClient, excludeLavorazioneIds: Set<string>): Promise<string[]> {
  const { data: mezzi, error: mezziErr } = await admin.from("mezzi").select("id, cliente, marca, matricola, meta");
  if (mezziErr) throw new Error(`mezzi: ${mezziErr.message}`);

  const { data: lavRefs, error: lavErr } = await admin.from("lavorazioni").select("id, mezzo_id");
  if (lavErr) throw new Error(`lavorazioni refs: ${lavErr.message}`);

  const mezzoInUse = new Set<string>();
  for (const row of lavRefs ?? []) {
    const lavId = (row as { id: string }).id;
    const mezzoId = (row as { mezzo_id: string | null }).mezzo_id;
    if (!mezzoId) continue;
    if (excludeLavorazioneIds.has(lavId)) continue;
    mezzoInUse.add(mezzoId);
  }

  return ((mezzi ?? []) as MezzoRow[])
    .filter((m) => mezzoContainsSmokeToken(m) && !mezzoInUse.has(m.id))
    .map((m) => m.id);
}

async function purgeLavorazioneDocuments(
  admin: SupabaseClient,
  lavorazioneIds: string[],
  apply: boolean,
): Promise<void> {
  if (lavorazioneIds.length === 0) return;
  const { data, error } = await admin
    .from("lavorazione_documents")
    .select("lavorazione_id, storage_path")
    .in("lavorazione_id", lavorazioneIds);
  if (error) throw new Error(`lavorazione_documents: ${error.message}`);

  const paths = ((data ?? []) as (LavDocRow & { lavorazione_id: string })[])
    .map((r) => r.storage_path?.trim())
    .filter(Boolean) as string[];

  if (!apply) return;

  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage.from(STORAGE_BUCKETS.documenti).remove(paths);
    if (storageErr) throw new Error(`storage lavorazione_documents: ${storageErr.message}`);
  }

  const { error: delErr } = await admin.from("lavorazione_documents").delete().in("lavorazione_id", lavorazioneIds);
  if (delErr) throw new Error(`delete lavorazione_documents: ${delErr.message}`);
}

async function deleteSmokeDocumenti(admin: SupabaseClient, rows: DocumentoRow[], apply: boolean): Promise<void> {
  if (rows.length === 0) return;
  const paths = rows
    .map((r) => documentoStoragePathFromStored(r.url_file))
    .filter((p): p is string => Boolean(p));

  if (!apply) return;

  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage.from(STORAGE_BUCKETS.documenti).remove(paths);
    if (storageErr) throw new Error(`storage documenti: ${storageErr.message}`);
  }

  const ids = rows.map((r) => r.id);
  const { error } = await admin.from("documenti").delete().in("id", ids);
  if (error) throw new Error(`delete documenti: ${error.message}`);
}

async function findSmokeLogModifiche(
  admin: SupabaseClient,
  entityIds: Set<string>,
): Promise<string[]> {
  const { data, error } = await admin.from("log_modifiche").select("id, entita_id, payload").limit(10_000);
  if (error) throw new Error(`log_modifiche: ${error.message}`);

  const ids = new Set<string>();
  for (const row of (data ?? []) as LogModificaRow[]) {
    if (entityIds.has(row.entita_id) || isSmokeLogModificheRow(row)) ids.add(row.id);
  }
  return [...ids];
}

async function pruneSmokeAppSettings(admin: SupabaseClient, apply: boolean): Promise<SmokeCleanupReport["appSettingsRows"]> {
  const { data, error } = await admin
    .from("app_settings")
    .select("id, module, key, value")
    .in("module", ["mezzi", "lavorazioni", "magazzino"])
    .in("key", ["liste", "master"]);
  if (error) throw new Error(`app_settings: ${error.message}`);

  const touched: SmokeCleanupReport["appSettingsRows"] = [];
  for (const row of (data ?? []) as AppSettingRow[]) {
    const value = (row.value ?? {}) as Record<string, unknown>;
    const { next, removedCount } = pruneSmokeAppSettingsValue(value);
    if (removedCount === 0) continue;
    touched.push({ module: row.module, key: row.key, removedCount });
    if (!apply) continue;
    const { error: upErr } = await admin.from("app_settings").update({ value: next }).eq("id", row.id);
    if (upErr) throw new Error(`app_settings update ${row.module}/${row.key}: ${upErr.message}`);
  }
  return touched;
}

export async function cleanupSmokeData(
  admin: SupabaseClient,
  options: SmokeCleanupOptions,
): Promise<SmokeCleanupReport> {
  const report: SmokeCleanupReport = {
    lavorazioni: [],
    mezzi: [],
    ricambi: [],
    documenti: [],
    logModifiche: [],
    appSettingsRows: [],
    errors: [],
  };

  try {
    report.lavorazioni = await findSmokeLavorazioneIds(admin);
    report.documenti = (await findSmokeDocumenti(admin)).map((r) => r.id);
    report.ricambi = (await findSmokeRicambi(admin)).map((r) => r.id);

    const lavIdSet = new Set(report.lavorazioni);
    report.mezzi = await findOrphanSmokeMezzi(admin, lavIdSet);

    const entityIds = new Set<string>([
      ...report.lavorazioni,
      ...report.mezzi,
      ...report.ricambi,
      ...report.documenti,
    ]);
    report.logModifiche = await findSmokeLogModifiche(admin, entityIds);

    if (options.verbose) {
      console.log("lavorazioni:", report.lavorazioni);
      console.log("documenti:", report.documenti);
      console.log("ricambi:", report.ricambi);
      console.log("mezzi:", report.mezzi);
      console.log("log_modifiche:", report.logModifiche);
    }

    if (!options.apply) {
      report.appSettingsRows = await pruneSmokeAppSettings(admin, false);
      return report;
    }

    const documentoRows = await findSmokeDocumenti(admin);
    await deleteSmokeDocumenti(admin, documentoRows, true);
    await purgeLavorazioneDocuments(admin, report.lavorazioni, true);

    if (report.lavorazioni.length > 0) {
      const { error: schedaErr } = await admin
        .from("scheda_lavorazione")
        .delete()
        .in("lavorazione_id", report.lavorazioni);
      if (schedaErr) throw new Error(`delete scheda_lavorazione: ${schedaErr.message}`);

      const { error } = await admin.from("lavorazioni").delete().in("id", report.lavorazioni);
      if (error) throw new Error(`delete lavorazioni: ${error.message}`);
    }

    if (report.mezzi.length > 0) {
      const { error } = await admin.from("mezzi").delete().in("id", report.mezzi);
      if (error) throw new Error(`delete mezzi: ${error.message}`);
    }

    if (report.ricambi.length > 0) {
      const { error } = await admin.from("magazzino_ricambi").delete().in("id", report.ricambi);
      if (error) throw new Error(`delete magazzino_ricambi: ${error.message}`);
    }

    if (report.logModifiche.length > 0) {
      const { error } = await admin.from("log_modifiche").delete().in("id", report.logModifiche);
      if (error) throw new Error(`delete log_modifiche: ${error.message}`);
    }

    report.appSettingsRows = await pruneSmokeAppSettings(admin, true);
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : String(e));
  }

  return report;
}

export function printSmokeCleanupReport(report: SmokeCleanupReport, apply: boolean): void {
  const mode = apply ? "APPLY" : "DRY-RUN";
  console.log(`\nSmoke cleanup (${mode})`);
  console.log(`  lavorazioni: ${report.lavorazioni.length}`);
  console.log(`  mezzi orfani: ${report.mezzi.length}`);
  console.log(`  ricambi E2E: ${report.ricambi.length}`);
  console.log(`  documenti smoke: ${report.documenti.length}`);
  console.log(`  log_modifiche smoke: ${report.logModifiche.length}`);
  console.log(`  app_settings liste aggiornate: ${report.appSettingsRows.length}`);
  for (const row of report.appSettingsRows) {
    console.log(`    - ${row.module}/${row.key}: ${row.removedCount} valori rimossi`);
  }
  if (report.errors.length) {
    console.error(`  errori: ${report.errors.length}`);
    for (const err of report.errors) console.error(`    ${err}`);
  } else {
    console.log("  errori: 0");
  }
  console.log("");
}
