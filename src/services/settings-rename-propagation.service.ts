"use client";

import { getBrowserSupabase, type SupabaseClient } from "@/src/lib/supabase/browser-client";
import { auditDiff, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { SettingsRenameEntry, SettingsRenameKind, SettingsRenamePropagationResult } from "@/lib/settings/settings-rename-types";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  regenerateCompatLegacyFromRefs,
  warnIfCompatImpact,
} from "@/lib/magazzino/compat/compat-rename-guard";
import { auditCompatConsistency } from "@/lib/magazzino/compat/compat-consistency-auditor";
import {
  patchFornitoriAlternativiFornitoreRename,
  patchFornitoriAlternativiProduttoreRename,
} from "@/lib/magazzino/ricambio-fornitori-alternativi";
import { metaFieldsToRicambioUi, parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";

async function sb() {
  return getBrowserSupabase();
}

const PROPAGATION_UPDATE_CHUNK = 20;

type PropagationTable = "scheda_lavorazione" | "mezzi" | "magazzino_ricambi";

async function runBatchedRowUpdates(
  c: SupabaseClient,
  table: PropagationTable,
  updates: ReadonlyArray<{ id: string; payload: Record<string, unknown> }>,
): Promise<number> {
  if (!updates.length) return 0;
  let updated = 0;
  for (let i = 0; i < updates.length; i += PROPAGATION_UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + PROPAGATION_UPDATE_CHUNK);
    await Promise.all(
      chunk.map(async ({ id, payload }) => {
        const { error } = await c.from(table).update(payload).eq("id", id);
        if (error) throw new Error(error.message);
        await writeModificaLog(c, {
          entita: table,
          entita_id: id,
          azione: "UPDATE",
          payload: auditDiff(null, payload, { oggetto: "Rinomina impostazioni" }),
        });
        updated += 1;
      }),
    );
  }
  return updated;
}

import { patchAddettoInSchedaContenuto } from "@/lib/lavorazioni/patch-addetto-in-scheda-contenuto";
function patchMetaString(meta: unknown, key: string, from: string, to: string): { next: Record<string, unknown>; changed: boolean } {
  const base = meta && typeof meta === "object" && !Array.isArray(meta) ? { ...(meta as Record<string, unknown>) } : {};
  if (typeof base[key] === "string" && base[key] === from) {
    return { next: { ...base, [key]: to }, changed: true };
  }
  return { next: base, changed: false };
}

async function loadMezziListePrefs(): Promise<MezziListePrefs> {
  const c = await sb();
  const { data, error } = await c
    .from("app_settings")
    .select("value")
    .eq("module", CAB_SETTINGS_MODULE.mezzi)
    .eq("key", CAB_SETTINGS_KEY.liste)
    .maybeSingle();
  if (error || !data?.value) return createMezziListePrefsDefault();
  return migrateMezziListePrefs(data.value as MezziListePrefs);
}

async function countUpdate(
  c: Awaited<ReturnType<typeof sb>>,
  table: string,
  patch: Record<string, unknown>,
  filter: Record<string, string>,
): Promise<number> {
  let q = c.from(table).update(patch);
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

async function propagateSimpleColumn(
  kind: SettingsRenameKind,
  from: string,
  to: string,
  table: string,
  column: string,
): Promise<SettingsRenamePropagationResult> {
  const c = await sb();
  const n = await countUpdate(c, table, { [column]: to }, { [column]: from });
  return { kind, from, to, updated: n };
}

type IngressoCampoKey = "cliente" | "utilizzatore" | "cantiere";

function patchIngressoCampoInContenuto(
  contenuto: unknown,
  field: IngressoCampoKey,
  from: string,
  to: string,
): { next: Record<string, unknown>; changed: boolean } {
  if (!contenuto || typeof contenuto !== "object" || Array.isArray(contenuto)) {
    return { next: {}, changed: false };
  }
  const base = { ...(contenuto as Record<string, unknown>) };
  const ingresso = base.ingresso;
  if (!ingresso || typeof ingresso !== "object" || Array.isArray(ingresso)) {
    return { next: base, changed: false };
  }
  const ing = { ...(ingresso as Record<string, unknown>) };
  const campi = ing.campi;
  if (!campi || typeof campi !== "object" || Array.isArray(campi)) {
    return { next: base, changed: false };
  }
  const c = { ...(campi as Record<string, unknown>) };
  if (typeof c[field] !== "string" || c[field] !== from) {
    return { next: base, changed: false };
  }
  return {
    next: { ...base, ingresso: { ...ing, campi: { ...c, [field]: to } } },
    changed: true,
  };
}

async function propagateSchedaIngressoCampo(
  field: IngressoCampoKey,
  from: string,
  to: string,
): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("scheda_lavorazione").select("id, contenuto");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    const { next, changed } = patchIngressoCampoInContenuto(row.contenuto, field, from, to);
    if (changed) pending.push({ id: row.id as string, payload: { contenuto: next } });
  }
  return runBatchedRowUpdates(c, "scheda_lavorazione", pending);
}

async function propagateAddettoRename(
  from: string,
  to: string,
  fromAliases?: readonly string[],
): Promise<SettingsRenamePropagationResult> {
  const fromValues = [...new Set([from, ...(fromAliases ?? [])].map((s) => s.trim()).filter(Boolean))];
  const c = await sb();
  const [schedeRes, lavRes] = await Promise.all([
    c.from("scheda_lavorazione").select("id, lavorazione_id, tipo, contenuto"),
    c.from("lavorazioni").select("id, archived"),
  ]);
  if (schedeRes.error) throw new Error(schedeRes.error.message);
  if (lavRes.error) throw new Error(lavRes.error.message);
  const archivedLavIds = new Set(
    (lavRes.data ?? []).filter((l) => l.archived === true).map((l) => l.id as string),
  );
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of schedeRes.data ?? []) {
    const lavId = row.lavorazione_id as string;
    if (archivedLavIds.has(lavId)) continue;
    const { next, changed } = patchAddettoInSchedaContenuto(
      row.tipo as string,
      row.contenuto,
      fromValues,
      to,
    );
    if (changed) pending.push({ id: row.id as string, payload: { contenuto: next } });
  }
  const updated = await runBatchedRowUpdates(c, "scheda_lavorazione", pending);
  return { kind: "addetto", from, to, updated };
}

async function propagateMezziMetaField(metaKey: string, from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("mezzi").select("id, meta");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    const { next, changed } = patchMetaString(row.meta, metaKey, from, to);
    if (changed) pending.push({ id: row.id as string, payload: { meta: next } });
  }
  return runBatchedRowUpdates(c, "mezzi", pending);
}

async function propagateMagazzinoMetaField(metaKey: string, from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    const { next, changed } = patchMetaString(row.meta, metaKey, from, to);
    if (changed) pending.push({ id: row.id as string, payload: { meta: next } });
  }
  return runBatchedRowUpdates(c, "magazzino_ricambi", pending);
}

async function propagateMagazzinoProduttoreAlternativo(from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    const altPatch = patchFornitoriAlternativiProduttoreRename(row.meta, from, to);
    if (altPatch.changed) pending.push({ id: row.id as string, payload: { meta: altPatch.next } });
  }
  return runBatchedRowUpdates(c, "magazzino_ricambi", pending);
}

async function propagateMagazzinoFornitoreAlternativo(from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    let meta = row.meta;
    let changed = false;
    const altPatch = patchFornitoriAlternativiFornitoreRename(meta, from, to);
    if (altPatch.changed) {
      meta = altPatch.next;
      changed = true;
    }
    const legacy = patchMetaString(meta, "fornitoreNonOriginale", from, to);
    if (legacy.changed) {
      meta = legacy.next;
      changed = true;
    }
    if (changed) pending.push({ id: row.id as string, payload: { meta } });
  }
  return runBatchedRowUpdates(c, "magazzino_ricambi", pending);
}

async function propagateMagazzinoCompat(entry: SettingsRenameEntry): Promise<number> {
  const c = await sb();
  const liste = await loadMezziListePrefs();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  const pending: { id: string; payload: Record<string, unknown> }[] = [];
  for (const row of data ?? []) {
    const { next, changed } = regenerateCompatLegacyFromRefs(row.meta, liste, entry);
    if (!changed) continue;
    if (process.env.NODE_ENV !== "production") {
      const parsed = parseMagazzinoRicambioMeta(next);
      const report = auditCompatConsistency(
        { id: row.id as string, ...metaFieldsToRicambioUi(parsed) },
        liste,
        "settings-rename-propagation.propagateMagazzinoCompat",
      );
      if (report.status !== "ok") {
        console.debug("[compat-rename-audit]", row.id, report.issues);
      }
    }
    pending.push({ id: row.id as string, payload: { meta: next } });
  }
  const updated = await runBatchedRowUpdates(c, "magazzino_ricambi", pending);
  warnIfCompatImpact(entry, updated);
  return updated;
}

async function propagateOne(entry: SettingsRenameEntry): Promise<SettingsRenamePropagationResult[]> {
  const { kind, from, to } = entry;
  const out: SettingsRenamePropagationResult[] = [];

  switch (kind) {
    case "cliente": {
      out.push(await propagateSimpleColumn(kind, from, to, "mezzi", "cliente"));
      out.push(await propagateSimpleColumn(kind, from, to, "preventivi", "cliente"));
      out.push({ kind, from, to, updated: await propagateSchedaIngressoCampo("cliente", from, to) });
      const c = await sb();
      const prof = await countUpdate(c, "profiles", { cliente_ref: to }, { cliente_ref: from });
      out.push({ kind, from, to, updated: prof });
      const { clientiAnagraficaService } = await import("@/src/services/clienti-anagrafica.service");
      const anagRes = await clientiAnagraficaService.renameNomeDisplay(from, to);
      if (anagRes.success) {
        out.push({ kind, from, to, updated: anagRes.data ?? 0 });
      }
      break;
    }
    case "utilizzatore": {
      out.push(await propagateSimpleColumn(kind, from, to, "mezzi", "utilizzatore"));
      out.push({ kind, from, to, updated: await propagateSchedaIngressoCampo("utilizzatore", from, to) });
      break;
    }
    case "cantiere": {
      out.push({ kind, from, to, updated: await propagateMezziMetaField("cantiere", from, to) });
      out.push({ kind, from, to, updated: await propagateSchedaIngressoCampo("cantiere", from, to) });
      break;
    }
    case "addetto":
      out.push(await propagateAddettoRename(from, to, entry.fromAliases));
      break;
    case "mag_marca":
      out.push(await propagateSimpleColumn(kind, from, to, "magazzino_ricambi", "marca"));
      break;
    case "mag_categoria":
      out.push({ kind, from, to, updated: await propagateMagazzinoMetaField("categoria", from, to) });
      break;
    case "mag_fornitore":
      out.push({ kind, from, to, updated: await propagateMagazzinoFornitoreAlternativo(from, to) });
      break;
    case "mag_produttore":
      out.push({ kind, from, to, updated: await propagateMagazzinoProduttoreAlternativo(from, to) });
      break;
    case "tipo_attrezzatura":
      out.push(await propagateSimpleColumn(kind, from, to, "mezzi", "tipo_attrezzatura"));
      break;
    case "tipo_telaio":
      out.push({ kind, from, to, updated: await propagateMezziMetaField("tipoTelaio", from, to) });
      break;
    case "hierarchy_marca_attrezzature":
    case "hierarchy_marca_telai":
      out.push(await propagateSimpleColumn(kind, from, to, "mezzi", "marca"));
      out.push(await propagateSimpleColumn(kind, from, to, "documenti", "marca"));
      out.push({ kind, from, to, updated: await propagateMagazzinoCompat(entry) });
      break;
    case "hierarchy_modello_attrezzature":
    case "hierarchy_modello_telai":
      out.push(await propagateSimpleColumn(kind, from, to, "mezzi", "modello"));
      out.push(await propagateSimpleColumn(kind, from, to, "documenti", "modello"));
      out.push({ kind, from, to, updated: await propagateMagazzinoCompat(entry) });
      break;
    default:
      break;
  }

  return out;
}

export const settingsRenamePropagationService = {
  async propagateRenames(entries: SettingsRenameEntry[]): Promise<ServiceResult<SettingsRenamePropagationResult[]>> {
    try {
      const deduped = entries.filter((e) => e.from.trim() && e.to.trim() && e.from !== e.to);
      const results: SettingsRenamePropagationResult[] = [];
      for (const entry of deduped) {
        results.push(...(await propagateOne(entry)));
      }
      return success(results);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
