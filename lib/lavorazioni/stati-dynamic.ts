import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

/** Slug predefinito per nuove lavorazioni. */
export const DEFAULT_LAVORAZIONE_STATO_ID = "accettazione";

export const STATO_LAVORAZIONE_COMPLETATA_ID = "completata";

const LEGACY_STATO_ID_TO_SLUG: Record<string, string> = {
  "lav-stato-accettazione": "accettazione",
  "lav-stato-att-prev": "in_coda",
  "lav-stato-att-ricambi": "attesa_ricambi",
  "lav-stato-da-lavorare": "in_coda",
  "lav-stato-in-lavorazione": "in_lavorazione",
  "lav-stato-completata": "completata",
  in_attesa_ricambi: "attesa_ricambi",
  in_officina: "in_lavorazione",
  bozza: "accettazione",
};

/** Default workflow — ordine array = ordine workflow. */
export const DEFAULT_STATI_LAVORAZIONI_WORKFLOW: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "diagnosi", label: "Diagnosi", color: "#ea580c" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "attesa_ricambi", label: "Attesa ricambi", color: "#7c3aed" },
  { id: "completata", label: "Completata", color: "#15803d" },
  { id: "consegnata", label: "Consegnata", color: "#059669" },
];

export function slugifyStatoId(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return base || "stato";
}

export function migrateStatoConfigId(id: string): string {
  const t = id.trim();
  if (!t) return t;
  return LEGACY_STATO_ID_TO_SLUG[t] ?? t;
}

function uniqueStatoId(base: string, used: Set<string>): string {
  const id = slugifyStatoId(base);
  if (!used.has(id)) return id;
  let n = 2;
  while (used.has(`${id}_${n}`)) n += 1;
  return `${id}_${n}`;
}

/** Normalizza elenco stati: trim, slug id, dedup case-insensitive label, colori validi. */
export function normalizeStatiList(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const defMap = new Map(DEFAULT_STATI_LAVORAZIONI_WORKFLOW.map((s) => [s.id, s]));
  const seenLabels = new Set<string>();
  const out: StatoLavorazioneConfig[] = [];

  for (const raw of stati) {
    const label = raw.label?.trim();
    if (!label) continue;
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) continue;
    seenLabels.add(labelKey);

    let id = migrateStatoConfigId(raw.id?.trim() || slugifyStatoId(label));
    if (!id) id = slugifyStatoId(label);
    const def = defMap.get(id);
    const nh = normalizeHex(raw.color);
    out.push({
      id,
      label,
      ...(nh ? { color: nh } : def?.color ? { color: def.color } : {}),
    });
  }
  return out;
}

/** Stato finale workflow: fisso su «completata» (non configurabile in impostazioni). */
export function isStatoClosed(config: StatoLavorazioneConfig): boolean {
  return migrateStatoConfigId(config.id) === STATO_LAVORAZIONE_COMPLETATA_ID;
}

export function statiInCorsoFromConfig(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return stati.filter((s) => !isStatoClosed(s));
}

export function statiChiusiFromConfig(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return stati.filter((s) => isStatoClosed(s));
}

export function isStatoInConfig(statoId: string, stati: StatoLavorazioneConfig[]): boolean {
  const id = migrateStatoConfigId(statoId.trim());
  return stati.some((s) => s.id === id);
}

export function resolveStatoId(
  raw: string,
  stati: StatoLavorazioneConfig[],
  fallback?: string,
): string {
  const t = migrateStatoConfigId(raw.trim());
  if (t && stati.some((s) => s.id === t)) return t;
  const byLabel = stati.find((s) => s.label.trim().toLowerCase() === raw.trim().toLowerCase());
  if (byLabel) return byLabel.id;
  if (fallback && stati.some((s) => s.id === fallback)) return fallback;
  return resolveDefaultLavorazioneStatoId(stati);
}

export function resolveDefaultLavorazioneStatoId(stati: StatoLavorazioneConfig[]): string {
  const open = statiInCorsoFromConfig(stati);
  const prefer =
    open.find((s) => s.id === DEFAULT_LAVORAZIONE_STATO_ID) ??
    open.find((s) => s.label.toLowerCase().includes("accettazione")) ??
    open[0] ??
    stati[0];
  return prefer?.id ?? DEFAULT_LAVORAZIONE_STATO_ID;
}

function findStatoInConfig(statoRaw: string, stati: readonly StatoLavorazioneConfig[]): StatoLavorazioneConfig | undefined {
  const trimmed = statoRaw.trim();
  if (!trimmed) return undefined;
  const migrated = migrateStatoConfigId(trimmed);
  const slugged = slugifyStatoId(trimmed);
  const lower = trimmed.toLowerCase();

  const byId = stati.find((s) => {
    const sid = s.id;
    const sm = migrateStatoConfigId(sid);
    const sidSlug = slugifyStatoId(sid);
    return (
      sid === trimmed ||
      sid === migrated ||
      sm === migrated ||
      sid.toLowerCase() === lower ||
      sm.toLowerCase() === lower ||
      sidSlug === slugged ||
      slugifyStatoId(sm) === slugged
    );
  });
  if (byId) return byId;

  return stati.find((s) => s.label.trim().toLowerCase() === lower);
}

export function statoLavorazioneLabel(statoId: string, stati: readonly StatoLavorazioneConfig[]): string {
  const hit = findStatoInConfig(statoId, stati);
  if (hit?.label?.trim()) return hit.label.trim();
  const id = migrateStatoConfigId(statoId.trim());
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function addStatoFromLabel(
  stati: StatoLavorazioneConfig[],
  labelRaw: string,
): StatoLavorazioneConfig[] | null {
  const label = labelRaw.trim();
  if (!label) return null;
  const normalized = normalizeStatiList(stati);
  if (normalized.some((s) => s.label.toLowerCase() === label.toLowerCase())) return null;
  const used = new Set(normalized.map((s) => s.id));
  const id = uniqueStatoId(label, used);
  return [...normalized, { id, label, color: "#52525b" }];
}

export function reorderStatiList(
  stati: StatoLavorazioneConfig[],
  fromIndex: number,
  toIndex: number,
): StatoLavorazioneConfig[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= stati.length || toIndex >= stati.length) {
    return stati;
  }
  const next = [...stati];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** @deprecated Alias retrocompatibilità. */
export const DEFAULT_STATI_LAVORAZIONI_DB = DEFAULT_STATI_LAVORAZIONI_WORKFLOW;
export const STATO_LAVORAZIONE_COMPLETATA_DB = STATO_LAVORAZIONE_COMPLETATA_ID;
export const CLIENT_PORTAL_FALLBACK_STATO = DEFAULT_LAVORAZIONE_STATO_ID;
