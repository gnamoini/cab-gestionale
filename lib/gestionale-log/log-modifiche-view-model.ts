"use client";

import { consolidateLogModificaRows } from "@/lib/gestionale-log/log-consolidate";
import {
  buildLogModificaSummary,
  modificheToModificaRiga,
  type LogModificaSummary,
} from "@/lib/gestionale-log/log-summary";
import { isImageLogAction, type GestionaleLogEventTone, type GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
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
export function buildLogModificheGestionaleViewModel(row: LogModificaRow, autore: string): GestionaleLogViewModel {
  const reverted = isLogReverted(row);
  const summary = buildLogModificaSummary({
    entita: row.entita,
    entita_id: row.entita_id,
    azione: reverted ? "UNDO" : row.azione,
    payload: row.payload,
    annullato: reverted,
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
};

export function buildLogModificheDisplayEntries(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
  options?: BuildLogModificheDisplayOptions,
): { id: string; row: LogModificaRow; vm: GestionaleLogViewModel }[] {
  const consolidated = consolidateLogModificaRows(rows);
  return consolidated.map((row) => {
    let vm = buildLogModificheGestionaleViewModel(row, resolveAutore(row));
    const oggetto = options?.resolveOggetto?.(row)?.trim();
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

/** Deep link da voce log globale a pagina operativa. */
export function buildLogModificheFocusHref(row: LogModificaRow): string | null {
  if (row.entita === "lavorazioni") {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_LAV_ROW, row.entita_id);
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
