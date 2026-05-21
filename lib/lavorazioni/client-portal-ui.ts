import { formatClientPortalAttrezzatura } from "@/lib/lavorazioni/client-portal-attrezzatura-format";
import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow, LavorazioneRow } from "@/src/types/supabase-tables";
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

function fmtDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function lavorazioneRefLabel(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t.toUpperCase();
  return `#${t.slice(0, 8).toUpperCase()}`;
}

export function macchinaClienteLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  if (!m) return "—";
  const brand = `${m.marca ?? ""} ${m.modello ?? ""}`.trim();
  return brand || "—";
}

/** Addetto da log UPDATE (payload addetto), più recente per primo. */
export function latestAddettoFromLogs(logs: readonly LogModificaRow[]): string {
  const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const lg of sorted) {
    if (lg.azione !== "UPDATE") continue;
    const payload = lg.payload as { after?: { addetto?: unknown } } | null | undefined;
    const addetto = payload?.after?.addetto;
    if (typeof addetto === "string" && addetto.trim()) return addetto.trim();
  }
  return "—";
}

export function buildClientIngressoSummary(row: LavorazioneListRow): ClientIngressoSummary {
  const m = row.mezzo;
  const meta = parseMezzoMeta(m?.meta);
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
    dataIngresso: fmtDay(row.data_ingresso ?? row.created_at),
  };
}

export function buildClientVisibleNotes(row: LavorazioneRow): ClientVisibleNote[] {
  const note = row.note?.trim();
  if (!note) return [];
  return [{ text: note }];
}

/** Timeline cliente: solo cambi stato, addetto e ripristino. */
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
    if (before?.addetto !== after?.addetto && typeof after?.addetto === "string") {
      items.push({
        id: `addetto-${lg.id}`,
        kind: "log",
        at: lg.created_at,
        title: `Addetto · ${after.addetto}`,
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
