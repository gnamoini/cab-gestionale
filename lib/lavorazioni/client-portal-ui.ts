import { formatClientPortalAttrezzatura } from "@/lib/lavorazioni/client-portal-attrezzatura-format";
import { formatClientPortalDay } from "@/lib/lavorazioni/format-client-portal-day";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import {
  buildLatestLogAutoreByEntitaId,
  sanitizeClientPortalAutore,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow, LogModificaWithProfileRow, LavorazioneRow } from "@/src/types/supabase-tables";
import type { LavorazioneTimelineItem } from "@/src/services/domain/lavorazioni-domain.service";

export type ClientIngressoSummary = {
  cliente: string;
  attrezzatura: string;
  descrizione: string;
  dataIngresso: string;
};

export type ClientVisibleNote = {
  text: string;
};


function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function lavorazioneRefLabel(id: string, codice?: string | null): string {
  return lavorazioneDisplayCodice({ id, codice });
}

export function macchinaClienteLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  if (!m) return "—";
  const brand = `${m.marca ?? ""} ${m.modello ?? ""}`.trim();
  return brand || "—";
}

/** Raggruppa log lavorazioni per `entita_id` (lookup O(1) in lista archivio). */
export function groupLavorazioniLogsById(
  logs: readonly LogModificaRow[],
): ReadonlyMap<string, readonly LogModificaRow[]> {
  const map = new Map<string, LogModificaRow[]>();
  for (const row of logs) {
    if (row.entita !== "lavorazioni") continue;
    const id = row.entita_id?.trim();
    if (!id) continue;
    const list = map.get(id);
    if (list) list.push(row);
    else map.set(id, [row]);
  }
  return map;
}

/** Autore ultima modifica da log (portale clienti — risolve profili lazy, no UUID in UI). */
export function buildClientPortalLogAutoreByLavorazioneId(
  logs: readonly LogModificaRow[],
  opts: {
    lazyProfileNames: ReadonlyMap<string, string>;
    currentUserId?: string | null;
    currentUserDisplayName?: string | null;
    /** Portale clienti: non esporre UUID o fallback tecnico. */
    omitUnresolvedAutore?: boolean;
  },
): ReadonlyMap<string, string> {
  const { lazyProfileNames, currentUserId, currentUserDisplayName, omitUnresolvedAutore } = opts;
  return buildLatestLogAutoreByEntitaId(logs, (row) => {
    const id = row.autore_id?.trim();
    if (id) {
      const lazy = lazyProfileNames.get(id);
      if (lazy) return omitUnresolvedAutore ? sanitizeClientPortalAutore(lazy) : lazy;
      if (currentUserId && id === currentUserId && currentUserDisplayName?.trim()) {
        const name = currentUserDisplayName.trim();
        return omitUnresolvedAutore ? sanitizeClientPortalAutore(name) : name;
      }
    }
    const profileNome = (row as LogModificaWithProfileRow).profiles?.nome?.trim();
    if (profileNome) return sanitizeClientPortalAutore(profileNome);
    return "";
  });
}

/** Addetto da log UPDATE/UNDO (payload addetto o addettoAccettazione), più recente per primo. */
export function latestAddettoFromLogs(logs: readonly LogModificaRow[]): string {
  const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const lg of sorted) {
    if (lg.azione !== "UPDATE" && lg.azione !== "UNDO") continue;
    const payload = lg.payload as {
      after?: { addetto?: unknown; addettoAccettazione?: unknown };
    } | null | undefined;
    for (const raw of [payload?.after?.addetto, payload?.after?.addettoAccettazione]) {
      if (typeof raw === "string") {
        const addetto = raw.trim();
        if (addetto && addetto !== "—") return addetto;
      }
    }
  }
  return "—";
}

export function buildClientIngressoSummary(row: LavorazioneListRow): ClientIngressoSummary {
  const m = row.mezzo;
  const attrezzatura = formatClientPortalAttrezzatura({
    marca: m?.marca,
    modello: m?.modello,
  });
  const targa = m?.targa?.trim();
  const attDisplay = targa && targa !== "—" ? `${attrezzatura} (${targa})` : attrezzatura;

  return {
    cliente: m?.cliente?.trim() || "—",
    attrezzatura: attDisplay,
    descrizione: row.note?.trim() || "—",
    dataIngresso: formatClientPortalDay(row.data_ingresso ?? row.created_at),
  };
}

export function buildClientVisibleNotes(row: LavorazioneRow): ClientVisibleNote[] {
  const note = row.note?.trim();
  if (!note) return [];
  return [{ text: note }];
}

/** Timeline cliente: solo cambi stato e ripristino. */
export function buildClientTimeline(
  logs: readonly LogModificaRow[],
  statiOpts: { id: string; label: string; color?: string }[] = [],
): LavorazioneTimelineItem[] {
  const items: LavorazioneTimelineItem[] = [];

  for (const lg of logs) {
    if (lg.azione === "RESTORE") {
      items.push({
        id: `restore-${lg.id}`,
        kind: "log",
        at: lg.created_at,
        title: "Lavorazione ripristinata",
      });
      continue;
    }
    if (lg.azione !== "UPDATE") continue;
    const payload = lg.payload as { before?: Record<string, unknown>; after?: Record<string, unknown> } | null | undefined;
    const before = payload?.before;
    const after = payload?.after;
    if (before?.stato !== after?.stato && typeof after?.stato === "string") {
      const statoLabel = statoLavorazioneLabel(after.stato, statiOpts);
      items.push({
        id: `stato-${lg.id}`,
        kind: "log",
        at: lg.created_at,
        title: `Stato · ${statoLabel}`,
      });
    }
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return items;
}

export function fmtClientUpdatedAt(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  return fmtWhen(iso);
}
