import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchConfigurazioneLogRefresh } from "@/lib/sistema/cab-events";

export const CONFIGURAZIONE_LOG_STORAGE_KEY = "gestionale-configurazione-log-v1";
export const CONFIGURAZIONE_LOG_MAX = LOG_MODIFICHE_RETENTION_PER_ENTITA;

export type ConfigurazioneLogStored = GestionaleLogViewModel & { id: string };

function nextId(): string {
  return `cfglog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadConfigurazioneLog(): ConfigurazioneLogStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONFIGURAZIONE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ConfigurazioneLogStored[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : nextId();
      const tipoRiga = typeof o.tipoRiga === "string" ? o.tipoRiga : "";
      const oggettoRiga = typeof o.oggettoRiga === "string" ? o.oggettoRiga : "";
      const modificaRiga = typeof o.modificaRiga === "string" ? o.modificaRiga : "";
      const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Sistema";
      const atIso = typeof o.atIso === "string" && o.atIso.trim() ? o.atIso.trim() : new Date().toISOString();
      const tone = (typeof o.tone === "string" ? o.tone : "neutral") as GestionaleLogEventTone;
      if (!tipoRiga || !oggettoRiga) continue;
      out.push({ id, tipoRiga, oggettoRiga, modificaRiga, autore, atIso, tone });
    }
    return out.slice(0, CONFIGURAZIONE_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveConfigurazioneLog(entries: ConfigurazioneLogStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONFIGURAZIONE_LOG_STORAGE_KEY,
      JSON.stringify(entries.slice(0, CONFIGURAZIONE_LOG_MAX)),
    );
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function appendConfigurazioneLog(entry: GestionaleLogViewModel): void {
  const prev = loadConfigurazioneLog();
  const row: ConfigurazioneLogStored = { ...entry, id: nextId() };
  saveConfigurazioneLog([row, ...prev]);
  dispatchConfigurazioneLogRefresh();
}

export function appendConfigurazioneLogs(entries: readonly GestionaleLogViewModel[]): void {
  if (entries.length === 0) return;
  const prev = loadConfigurazioneLog();
  const rows = entries.map((entry) => ({ ...entry, id: nextId() }));
  saveConfigurazioneLog([...rows, ...prev]);
  dispatchConfigurazioneLogRefresh();
}

const LEGACY_DASHBOARD_SETTINGS_TIPO = "MODIFICA IMPOSTAZIONI";

/** Sposta voci impostazioni dal log dashboard legacy al log configurazione (una tantum). */
export function migrateLegacyDashboardSettingsLogsToConfigurazione(): void {
  if (typeof window === "undefined") return;
  const migratedKey = "gestionale-configurazione-log-migrated-v1";
  if (window.localStorage.getItem(migratedKey)) return;

  try {
    const dashRaw = window.localStorage.getItem("gestionale-dashboard-sistema-log-v1");
    if (!dashRaw) {
      window.localStorage.setItem(migratedKey, "1");
      return;
    }
    const parsed = JSON.parse(dashRaw) as unknown;
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(migratedKey, "1");
      return;
    }

    const keep: unknown[] = [];
    const toMove: GestionaleLogViewModel[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") {
        keep.push(x);
        continue;
      }
      const o = x as Record<string, unknown>;
      const tipoRiga = typeof o.tipoRiga === "string" ? o.tipoRiga : "";
      const oggettoRiga = typeof o.oggettoRiga === "string" ? o.oggettoRiga : "";
      if (
        tipoRiga === LEGACY_DASHBOARD_SETTINGS_TIPO ||
        oggettoRiga === "Impostazioni globali" ||
        oggettoRiga === "Impostazioni"
      ) {
        toMove.push({
          tone: (typeof o.tone === "string" ? o.tone : "update") as GestionaleLogEventTone,
          tipoRiga: tipoRiga === LEGACY_DASHBOARD_SETTINGS_TIPO ? "MODIFICA CONFIGURAZIONE" : tipoRiga,
          oggettoRiga,
          modificaRiga: typeof o.modificaRiga === "string" ? o.modificaRiga : "",
          autore: typeof o.autore === "string" ? o.autore : "Sistema",
          atIso: typeof o.atIso === "string" ? o.atIso : new Date().toISOString(),
        });
      } else {
        keep.push(x);
      }
    }

    if (toMove.length > 0) {
      const existing = loadConfigurazioneLog();
      const merged = [
        ...toMove.map((e) => ({ ...e, id: nextId() })),
        ...existing,
      ].slice(0, CONFIGURAZIONE_LOG_MAX);
      saveConfigurazioneLog(merged);
      window.localStorage.setItem("gestionale-dashboard-sistema-log-v1", JSON.stringify(keep));
    }
    window.localStorage.setItem(migratedKey, "1");
  } catch {
    /* ignore */
  }
}
