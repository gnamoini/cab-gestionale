"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
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
import { patchFornitoriAlternativiFornitoreRename } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import { metaFieldsToRicambioUi, parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";

async function sb() {
  return getBrowserSupabase();
}

function patchAddettiInContenuto(contenuto: unknown, from: string, to: string): { next: Record<string, unknown>; changed: boolean } {
  if (!contenuto || typeof contenuto !== "object" || Array.isArray(contenuto)) {
    return { next: {}, changed: false };
  }
  const base = { ...(contenuto as Record<string, unknown>) };
  const addetti = base.addetti;
  if (!Array.isArray(addetti)) return { next: base, changed: false };
  let changed = false;
  const nextAddetti = addetti.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const row = entry as Record<string, unknown>;
    if (typeof row.nome === "string" && row.nome === from) {
      changed = true;
      return { ...row, nome: to };
    }
    return entry;
  });
  if (!changed) return { next: base, changed: false };
  return { next: { ...base, addetti: nextAddetti }, changed: true };
}

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
  let updated = 0;
  for (const row of data ?? []) {
    const { next, changed } = patchIngressoCampoInContenuto(row.contenuto, field, from, to);
    if (!changed) continue;
    const { error: upErr } = await c.from("scheda_lavorazione").update({ contenuto: next }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

async function propagateAddettoRename(from: string, to: string): Promise<SettingsRenamePropagationResult> {
  const c = await sb();
  const { data, error } = await c.from("scheda_lavorazione").select("id, contenuto");
  if (error) throw new Error(error.message);
  let updated = 0;
  for (const row of data ?? []) {
    const { next, changed } = patchAddettiInContenuto(row.contenuto, from, to);
    if (!changed) continue;
    const { error: upErr } = await c.from("scheda_lavorazione").update({ contenuto: next }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return { kind: "addetto", from, to, updated };
}

async function propagateMezziMetaField(metaKey: string, from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("mezzi").select("id, meta");
  if (error) throw new Error(error.message);
  let updated = 0;
  for (const row of data ?? []) {
    const { next, changed } = patchMetaString(row.meta, metaKey, from, to);
    if (!changed) continue;
    const { error: upErr } = await c.from("mezzi").update({ meta: next }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

async function propagateMagazzinoMetaField(metaKey: string, from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  let updated = 0;
  for (const row of data ?? []) {
    const { next, changed } = patchMetaString(row.meta, metaKey, from, to);
    if (!changed) continue;
    const { error: upErr } = await c.from("magazzino_ricambi").update({ meta: next }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

async function propagateMagazzinoFornitoreAlternativo(from: string, to: string): Promise<number> {
  const c = await sb();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  let updated = 0;
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
    if (!changed) continue;
    const { error: upErr } = await c.from("magazzino_ricambi").update({ meta }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

async function propagateMagazzinoCompat(entry: SettingsRenameEntry): Promise<number> {
  const c = await sb();
  const liste = await loadMezziListePrefs();
  const { data, error } = await c.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  let updated = 0;
  for (const row of data ?? []) {
    const { next, changed } = regenerateCompatLegacyFromRefs(row.meta, liste, entry);
    if (!changed) continue;
    if (process.env.NODE_ENV !== "production") {
      const parsed = parseMagazzinoRicambioMeta(next);
      const report = auditCompatConsistency(
        { id: row.id, ...metaFieldsToRicambioUi(parsed) },
        liste,
        "settings-rename-propagation.propagateMagazzinoCompat",
      );
      if (report.status !== "ok") {
        console.debug("[compat-rename-audit]", row.id, report.issues);
      }
    }
    const { error: upErr } = await c.from("magazzino_ricambi").update({ meta: next }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
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
      out.push(await propagateAddettoRename(from, to));
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
      const allowed = await ensurePermission("manageSettings");
      if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
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
