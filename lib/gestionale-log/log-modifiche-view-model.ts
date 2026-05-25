"use client";

import { consolidateLogModificaRows } from "@/lib/gestionale-log/log-consolidate";
import {
  buildLogModificaSummary,
  modificheToModificaRiga,
  parseModificheLines,
  type LogModificaSummary,
} from "@/lib/gestionale-log/log-summary";
import { isImageLogAction, type GestionaleLogEventTone, type GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

export type LogModificaAutoreSource = LogModificaRow | LogModificaWithProfileRow;

export function logAutoreLabel(r: LogModificaAutoreSource, currentUserId: string | null, displayName: string): string {
  const profileNome = (r as LogModificaWithProfileRow).profiles?.nome?.trim();
  if (r.autore_id && currentUserId && r.autore_id === currentUserId) {
    return displayName.trim() || profileNome || "Tu";
  }
  if (profileNome) return profileNome;
  if (r.autore_id) return `Utente ${r.autore_id.slice(0, 8)}…`;
  return "Sistema";
}

function summaryToViewModel(summary: LogModificaSummary, autore: string, atIso: string, annullato?: boolean): GestionaleLogViewModel {
  return {
    tone: summary.tone,
    tipoRiga: summary.tipoRiga,
    oggettoRiga: summary.oggettoRiga,
    modificaRiga: modificheToModificaRiga(summary.modifiche),
    autore,
    atIso,
    annullato,
  };
}

/** Vista centralizzata di una riga `log_modifiche` per UI gestionale. */
export function buildLogModificheGestionaleViewModel(
  row: LogModificaRow,
  autore: string,
  statiLavorazione?: StatoLavorazioneConfig[],
): GestionaleLogViewModel {
  const reverted = isLogReverted(row);
  const summary = buildLogModificaSummary({
    entita: row.entita,
    entita_id: row.entita_id,
    azione: reverted ? "UNDO" : row.azione,
    payload: row.payload,
    annullato: reverted,
    statiLavorazione: row.entita === "lavorazioni" ? statiLavorazione : undefined,
  });
  if (isImageLogAction(row.azione) && !reverted) {
    summary.tipoRiga = row.azione === "image_deleted" ? "ELIMINAZIONE FILE" : "CARICAMENTO FILE";
  }
  return summaryToViewModel(summary, autore, row.created_at, reverted);
}

/** Lista log per UI: unisce modifiche rapide allo stesso campo, poi costruisce le view model. */
export type BuildLogModificheDisplayOptions = {
  /** Sostituisce titoli generici (es. «Lavorazione») con etichetta contestuale. */
  resolveOggetto?: (row: LogModificaAutoreSource) => string | undefined;
  /** Etichette stati da impostazioni (lavorazioni). */
  statiLavorazione?: StatoLavorazioneConfig[];
};

export function buildLogModificheDisplayEntries(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
  options?: BuildLogModificheDisplayOptions,
): { id: string; row: LogModificaRow; vm: GestionaleLogViewModel }[] {
  const consolidated = consolidateLogModificaRows(rows);
  return consolidated.map((row) => {
    let vm = buildLogModificheGestionaleViewModel(row, resolveAutore(row), options?.statiLavorazione);
    const oggetto =
      options?.resolveOggetto?.(row)?.trim() ?? logModificaOggettoFromPayload(row)?.trim();
    if (oggetto && oggetto !== "—" && (vm.oggettoRiga === "Lavorazione" || vm.oggettoRiga === "—")) {
      vm = { ...vm, oggettoRiga: oggetto };
    }
    return { id: row.id, row, vm };
  });
}

export function buildLogModificheDisplayList(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
  options?: BuildLogModificheDisplayOptions,
): GestionaleLogViewModel[] {
  return buildLogModificheDisplayEntries(rows, resolveAutore, options).map((e) => e.vm);
}

export function logModificaOggettoFromPayload(row: LogModificaRow): string | undefined {
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  const ctx = (p as Record<string, unknown>).context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    const oggetto = (ctx as Record<string, unknown>).oggetto;
    if (typeof oggetto === "string" && oggetto.trim()) return oggetto.trim();
  }
  return undefined;
}

function lavorazioneIdFromLogRow(row: LogModificaRow): string | null {
  if (row.entita === "lavorazioni") return row.entita_id;
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const payload = p as Record<string, unknown>;
  for (const rec of [payload.after, payload.snapshot, payload.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const lavId = (rec as Record<string, unknown>).lavorazione_id;
    if (typeof lavId === "string" && lavId.trim()) return lavId.trim();
  }
  return null;
}

/** Accorcia elenco modifiche per feed dashboard (prime N righe). */
export function briefLogModificaRiga(modificaRiga: string, maxLines = 3): string {
  const lines = parseModificheLines(modificaRiga);
  if (lines.length <= maxLines) return modificaRiga;
  const head = lines.slice(0, maxLines).map((line) => `• ${line}`);
  return `${head.join("\n")}\n• …`;
}

/** Deep link da voce log globale a pagina operativa. */
export function buildLogModificheFocusHref(row: LogModificaRow): string | null {
  const lavId = lavorazioneIdFromLogRow(row);
  if (lavId) {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_LAV_ROW, lavId);
    return `/lavorazioni?${sp.toString()}`;
  }
  if (row.entita === "magazzino_ricambi") {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_RICAMBIO, row.entita_id);
    return `/magazzino?${sp.toString()}`;
  }
  if (row.entita === "mezzi") return `/mezzi`;
  if (row.entita === "preventivi") return `/preventivi`;
  if (row.entita === "documenti") return `/documenti`;
  return null;
}
