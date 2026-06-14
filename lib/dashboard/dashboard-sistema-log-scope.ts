import { CONFIGURAZIONE_SECTION_LABELS } from "@/lib/configurazione/settings-snapshot-log";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";

const DASHBOARD_NOTES_OGGETTO_RIGA = "Cose da fare";

const CONFIGURAZIONE_TIPO_RIGA = new Set([
  "MODIFICA IMPOSTAZIONI",
  "MODIFICA CONFIGURAZIONE",
  "UNDO CONFIGURAZIONE",
]);

const CONFIGURAZIONE_OGGETTO_RIGA = new Set([
  "Impostazioni",
  "Impostazioni globali",
  "Configurazione globale",
  ...Object.values(CONFIGURAZIONE_SECTION_LABELS),
]);

/** Voce ammessa nel log modifiche dashboard (calendario promemoria + note). */
export function isDashboardSistemaLogScopeEntry(
  entry: Pick<GestionaleLogViewModel, "tipoRiga" | "oggettoRiga">,
): boolean {
  const tipo = entry.tipoRiga.trim().toUpperCase();
  const oggetto = entry.oggettoRiga.trim();
  if (tipo === "PROMEMORIA") return true;
  if (oggetto === DASHBOARD_NOTES_OGGETTO_RIGA) return true;
  return false;
}

/** Voce impostazioni finita per errore nel log dashboard (da spostare al log configurazione). */
export function isConfigurazioneLogLeakEntry(
  entry: Pick<GestionaleLogViewModel, "tipoRiga" | "oggettoRiga">,
): boolean {
  const tipo = entry.tipoRiga.trim().toUpperCase();
  const oggetto = entry.oggettoRiga.trim();
  if (CONFIGURAZIONE_TIPO_RIGA.has(tipo)) return true;
  if (CONFIGURAZIONE_OGGETTO_RIGA.has(oggetto)) return true;
  if (tipo.includes("IMPOSTAZION") || tipo.includes("CONFIGURAZ")) return true;
  return false;
}

export type DashboardSistemaLogPartitionResult<T extends GestionaleLogViewModel> = {
  keep: T[];
  configLeak: GestionaleLogViewModel[];
  droppedCount: number;
};

/** Partiziona voci raw del log dashboard: keep (in scope), leak config, drop (legacy sconosciuto). */
export function partitionDashboardSistemaLogEntries<T extends GestionaleLogViewModel>(
  entries: readonly T[],
): DashboardSistemaLogPartitionResult<T> {
  const keep: T[] = [];
  const configLeak: GestionaleLogViewModel[] = [];
  for (const entry of entries) {
    if (isDashboardSistemaLogScopeEntry(entry)) {
      keep.push(entry);
    } else if (isConfigurazioneLogLeakEntry(entry)) {
      const { tone, tipoRiga, oggettoRiga, modificaRiga, autore, atIso } = entry;
      configLeak.push({ tone, tipoRiga, oggettoRiga, modificaRiga, autore, atIso });
    }
  }
  return {
    keep,
    configLeak,
    droppedCount: entries.length - keep.length - configLeak.length,
  };
}
