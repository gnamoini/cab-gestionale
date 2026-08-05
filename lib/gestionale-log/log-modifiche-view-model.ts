"use client";

import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { reconcileLogModificaRows } from "@/lib/gestionale-log/log-event-pipeline";
import {
  buildLogModificaSummary,
  filterAuditMetadataCampoChanges,
  modificheToModificaRiga,
  parseModificheLines,
  type LogModificaSummary,
} from "@/lib/gestionale-log/log-summary";
import { isImageLogAction, type GestionaleLogEventTone, type GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import { lavorazioneLogOggettoFromListRow } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  entityLabelFromPayload,
  isMagazzinoLogEntita,
  resolveRicambioOggettoForLogRow,
  type RicambioLogLabelSource,
} from "@/lib/magazzino/ricambio-log-label";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type LogModificaAutoreSource = LogModificaRow | LogModificaWithProfileRow;

export function isGenericLavorazioneLogOggetto(oggetto: string): boolean {
  const t = oggetto.trim();
  return !t || t === "—" || t === "Lavorazione" || /^Scheda\s·\s/i.test(t);
}

function shouldOverrideMagazzinoOggetto(oggettoRiga: string): boolean {
  const t = oggettoRiga.trim();
  return !t || t === "—";
}

/** Risolve titolo log lavorazioni da payload.context o catalogo locale. */
export function buildLavorazioneLogOggettoResolver(
  lavorazioniById: ReadonlyMap<string, LavorazioneListRow>,
  schedeStore?: LavorazioneSchedeStore,
): (row: LogModificaAutoreSource) => string | undefined {
  return (logRow) => {
    if (logRow.entita !== "lavorazioni") return undefined;
    const fromPayload = logModificaOggettoFromPayload(logRow as LogModificaRow);
    if (fromPayload && fromPayload !== "—") return fromPayload;
    const lav = lavorazioniById.get(logRow.entita_id);
    if (!lav) return undefined;
    const label = lavorazioneLogOggettoFromListRow(lav, schedeStore);
    return label !== "—" ? label : undefined;
  };
}

export function logAutoreLabel(r: LogModificaAutoreSource, currentUserId: string | null, displayName: string): string {
  const snapshot = r.autore_nome_snapshot?.trim();
  if (snapshot) {
    if (r.autore_id && currentUserId && r.autore_id === currentUserId) {
      return displayName.trim() || snapshot || "Tu";
    }
    return snapshot;
  }
  const profile = (r as LogModificaWithProfileRow).profiles;
  const profileNome = profileDisplayName({
    nome: profile?.nome ?? "",
    cognome: profile?.cognome,
  });
  if (r.autore_id && currentUserId && r.autore_id === currentUserId) {
    return displayName.trim() || profileNome || "Tu";
  }
  if (profileNome) return profileNome;
  if (r.autore_id) return "Utente";
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
  /** Catalogo ricambi per risoluzione label magazzino. */
  ricambiById?: ReadonlyMap<string, RicambioLogLabelSource>;
  /** Etichette stati da impostazioni (lavorazioni). */
  statiLavorazione?: StatoLavorazioneConfig[];
  /** Default true — magazzino scheda mantiene originali annullati visibili. */
  suppressRevertedOriginals?: boolean;
};

export function buildLogModificheDisplayEntries(
  rows: readonly LogModificaAutoreSource[],
  resolveAutore: (row: LogModificaAutoreSource) => string,
  options?: BuildLogModificheDisplayOptions,
): { id: string; row: LogModificaRow; vm: GestionaleLogViewModel }[] {
  const consolidated = reconcileLogModificaRows(rows, {
    suppressRevertedOriginals: options?.suppressRevertedOriginals,
  });
  return consolidated.map((row) => {
    let vm = buildLogModificheGestionaleViewModel(row, resolveAutore(row), options?.statiLavorazione);
    const logRow = row as LogModificaRow;
    let oggetto =
      options?.resolveOggetto?.(row)?.trim() ?? logModificaOggettoFromPayload(logRow)?.trim();
    if (
      !oggetto &&
      isMagazzinoLogEntita(logRow.entita) &&
      options?.ricambiById &&
      shouldOverrideMagazzinoOggetto(vm.oggettoRiga)
    ) {
      oggetto = resolveRicambioOggettoForLogRow(logRow, options.ricambiById);
    }
    const magazzinoOverride =
      isMagazzinoLogEntita(logRow.entita) && shouldOverrideMagazzinoOggetto(vm.oggettoRiga);
    if (
      oggetto &&
      oggetto !== "—" &&
      (isGenericLavorazioneLogOggetto(vm.oggettoRiga) || magazzinoOverride)
    ) {
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
  const fromLabel = entityLabelFromPayload(row.payload);
  if (fromLabel && fromLabel !== "—") return fromLabel;
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  const ctx = (p as Record<string, unknown>).context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    const oggetto = (ctx as Record<string, unknown>).oggetto;
    if (typeof oggetto === "string" && oggetto.trim()) return oggetto.trim();
  }
  return undefined;
}

/** Risolve `lavorazione_id` da riga log lavorazioni o scheda. */
export function lavorazioneIdFromLogRow(row: LogModificaRow): string | null {
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

/** Dettaglio compatto per tabelle admin (security monitoring, audit). */
export function logModificaDetailLine(
  row: LogModificaRow,
  statiLavorazione?: StatoLavorazioneConfig[],
  maxLines = 3,
): string {
  const vm = buildLogModificheGestionaleViewModel(row, "—", statiLavorazione);
  const lines = parseModificheLines(briefLogModificaRiga(vm.modificaRiga, maxLines));
  if (lines.length) {
    return lines.map((line) => `• ${line.replace(/^•\s*/, "")}`).join(" · ");
  }
  const fallback = vm.modificaRiga.trim().replace(/\n/g, " · ");
  if (fallback) return fallback;
  return vm.oggettoRiga !== "—" ? vm.oggettoRiga : vm.tipoRiga || "Evento registrato";
}

/** Deep link da voce log globale a pagina operativa. */
export function buildLogModificheFocusHref(row: LogModificaRow): string | null {
  const lavId = lavorazioneIdFromLogRow(row);
  if (lavId) {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_LAV_ROW, lavId);
    return `/lavorazioni?${sp.toString()}`;
  }
  if (row.entita === "magazzino_ricambi" && row.entita_id?.trim()) {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_RICAMBIO, row.entita_id.trim());
    return `/magazzino?${sp.toString()}`;
  }
  if (row.entita === "movimenti_ricambi") return "/magazzino";
  if (row.entita === "mezzi") return "/mezzi";
  if (row.entita === "preventivi") return "/preventivi";
  if (row.entita === "ddt_documents") return "/preventivi";
  if (row.entita === "invoices" || row.entita === "invoice_payments") return "/fatturazione";
  if (row.entita === "documenti") return "/documenti";
  return null;
}
