import { profileDisplayName } from "@/lib/auth/profile-display-name";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {

  describeConfigurazioneSectionChanges,
  type ConfigurazioneSectionId,
} from "@/lib/configurazione/settings-snapshot-log";
import { snapshotFromResolved } from "@/lib/configurazione/settings-workspace-snapshot";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";

const APP_SETTINGS_OBJECT_LABELS: Record<string, string> = {
  [`${CAB_SETTINGS_MODULE.lavorazioni}:${CAB_SETTINGS_KEY.prefs}`]: "Lavorazioni",
  [`${CAB_SETTINGS_MODULE.dipendenti}:${CAB_SETTINGS_KEY.prefs}`]: "Dipendenti",
  [`${CAB_SETTINGS_MODULE.magazzino}:${CAB_SETTINGS_KEY.master}`]: "Magazzino",
  [`${CAB_SETTINGS_MODULE.mezzi}:${CAB_SETTINGS_KEY.liste}`]: "Clienti e mezzi",
  [`${CAB_SETTINGS_MODULE.preventivi}:${CAB_SETTINGS_KEY.defaults}`]: "Parametri economici",
  [`${CAB_SETTINGS_MODULE.system}:${CAB_SETTINGS_KEY.branding}`]: "Branding",
  [`${CAB_SETTINGS_MODULE.entityResolution}:${CAB_SETTINGS_KEY.aliases}`]: "Risoluzione entità",
};

const APP_SETTINGS_SECTIONS_BY_ROW: Record<string, ConfigurazioneSectionId[]> = {
  [`${CAB_SETTINGS_MODULE.lavorazioni}:${CAB_SETTINGS_KEY.prefs}`]: ["op-addetti", "op-stati", "op-priorita"],
  [`${CAB_SETTINGS_MODULE.dipendenti}:${CAB_SETTINGS_KEY.prefs}`]: ["op-dipendenti-assenze"],
  [`${CAB_SETTINGS_MODULE.magazzino}:${CAB_SETTINGS_KEY.master}`]: [
    "mag-marche",
    "mag-fornitori",
    "mag-produttori",
    "mag-categorie",
  ],
  [`${CAB_SETTINGS_MODULE.mezzi}:${CAB_SETTINGS_KEY.liste}`]: [
    "cli-cliente",
    "cli-cantiere",
    "cli-utilizzatore",
    "att-tipo",
    "att-marca",
    "tel-tipo",
    "tel-marca",
  ],
  [`${CAB_SETTINGS_MODULE.preventivi}:${CAB_SETTINGS_KEY.defaults}`]: ["sys-economici"],
};

const MODULE_LABELS: Record<string, string> = {
  [CAB_SETTINGS_MODULE.lavorazioni]: "Lavorazioni",
  [CAB_SETTINGS_MODULE.dipendenti]: "Dipendenti",
  [CAB_SETTINGS_MODULE.magazzino]: "Magazzino",
  [CAB_SETTINGS_MODULE.mezzi]: "Clienti e mezzi",
  [CAB_SETTINGS_MODULE.preventivi]: "Preventivi",
  [CAB_SETTINGS_MODULE.system]: "Sistema",
  [CAB_SETTINGS_MODULE.entityResolution]: "Risoluzione entità",
};

const MAX_DETAIL_LINES = 14;

function appSettingsRowKey(module: string, key: string): string {
  return `${module}:${key}`;
}

function snapshotFromAuditValue(module: string, key: string, value: Record<string, unknown>) {
  return snapshotFromResolved(
    resolveCabAppSettingsFromRows([{ id: "", module, key, value, updated_at: "", updated_by: null }]),
  );
}

function resolveObjectLabel(module: string, key: string): string {
  return APP_SETTINGS_OBJECT_LABELS[appSettingsRowKey(module, key)] ?? MODULE_LABELS[module] ?? module;
}

export function resolveAppSettingsAuditAuthorName(row: AppSettingsAuditRow): string {
  const profile = row.updated_by_profile;
  if (profile?.nome?.trim()) {
    const name = profileDisplayName(profile);
    if (name) return name;
  }
  if (row.updated_by) return "Utente";
  return "Sistema";
}

function toBulletModificaRiga(lines: string[]): string {
  if (!lines.length) return "—";
  return lines.map((l) => `• ${l.replace(/^•\s*/, "").trim()}`).join("\n");
}

function buildModificaRiga(autore: string, objectLabel: string, detailLines: string[]): string {
  const header = `${autore} ha aggiornato «${objectLabel}»`;
  if (!detailLines.length) return toBulletModificaRiga([header]);
  const details = detailLines.slice(0, MAX_DETAIL_LINES);
  const overflow = detailLines.length - details.length;
  const lines = [header, ...details];
  if (overflow > 0) lines.push(`… e altre ${overflow} modifiche`);
  return toBulletModificaRiga(lines);
}

/** Mappa riga `app_settings_audit` → view model log gestionale (titolo, diff, autore). */
export function buildGestionaleLogViewModelFromAppSettingsAuditRow(
  row: AppSettingsAuditRow,
): GestionaleLogViewModel {
  const autore = resolveAppSettingsAuditAuthorName(row);
  const objectLabel = resolveObjectLabel(row.module, row.key);
  const before = snapshotFromAuditValue(row.module, row.key, row.old_value ?? {});
  const after = snapshotFromAuditValue(row.module, row.key, row.new_value ?? {});

  const sectionIds = APP_SETTINGS_SECTIONS_BY_ROW[appSettingsRowKey(row.module, row.key)] ?? [];
  const detailLines: string[] = [];

  for (const id of sectionIds) {
    detailLines.push(...describeConfigurazioneSectionChanges(id, before, after));
  }

  return {
    tone: "update",
    tipoRiga: "MODIFICA CONFIGURAZIONE",
    oggettoRiga: objectLabel,
    modificaRiga: buildModificaRiga(autore, objectLabel, detailLines),
    autore,
    atIso: row.updated_at,
  };
}
