import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { addettoDisplayNameFromNome, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { lavorazioneIngressoIso } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import { resolveLavorazioneContextWithAttrezzatura } from "@/lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura";

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t !== "—" ? t : "—";
}

function fmtDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso.trim())) return iso.trim();
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export type ClientPortalRowFields = {
  dataIngresso: string;
  /** ISO completo per data+ora in tabella. */
  dataIngressoAt: string;
  /** ISO o testo parseabile per filtri data. */
  dataIngressoIso: string;
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  attrezzatura: string;
  /** Badge read-only: TELAIO / ATT. / COMPOSITO */
  entityBadge: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  /** Chiave nome (colori pill / filtri). */
  addettoNome: string;
  addetto: string;
  /** Descrizione anomalia (scheda ingresso) — ricerca/filtri. */
  descrizioneProblema: string;
  /** Note intervento — colonna tabella (come lavorazioni principali). */
  noteIntervento: string;
};

export function clientPortalClienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.cliente?.trim();
  return dash(fromScheda || row.mezzo?.cliente);
}

export function clientPortalUtilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const raw =
    schedeStore?.[row.id]?.ingresso?.campi.utilizzatore?.trim() || row.mezzo?.utilizzatore?.trim() || "";
  return raw && raw !== "—" ? raw : "";
}

export function clientPortalCantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return dash(schedeStore?.[row.id]?.ingresso?.campi.cantiere?.trim());
}

export function clientPortalAttrezzaturaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return resolveLavorazioneContextWithAttrezzatura(row, schedeStore).oggettoLabel;
}

export function clientPortalMezzoIdent(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): { targa: string; matricola: string; nScuderia: string } {
  return resolveLavorazioneContextWithAttrezzatura(row, schedeStore).ident;
}

function clientPortalIngressoIsoFromDb(row: LavorazioneListRow): string {
  const raw = row.data_ingresso?.trim() || row.created_at;
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

export function clientPortalIngressoIso(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.dataIngresso?.trim();
  if (fromScheda) {
    if (/^\d{4}-\d{2}-\d{2}/.test(fromScheda)) return fromScheda.slice(0, 10);
    const d = new Date(fromScheda);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return clientPortalIngressoIsoFromDb(row);
  }
  return clientPortalIngressoIsoFromDb(row);
}

export function clientPortalDataIngressoLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.dataIngresso?.trim();
  if (fromScheda) return fmtDay(fromScheda);
  return fmtDay(row.data_ingresso ?? row.created_at);
}

export function clientPortalMarcaModello(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): { marca: string; modello: string } {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing) {
    return {
      marca: dash(ing.marcaAttrezzatura),
      modello: dash(ing.modelloAttrezzatura),
    };
  }
  const display = resolveLavorazioneContextWithAttrezzatura(row, schedeStore);
  const line = display.targetType === "attrezzatura" ? display.attrezzaturaLine : display.telaioLine;
  if (line === "—") return { marca: "—", modello: "—" };
  const parts = line.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { marca: dash(parts[0]), modello: "—" };
  return { marca: dash(parts[0]), modello: dash(parts.slice(1).join(" ")) };
}

export function clientPortalDescrizioneProblema(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.descrizioneAnomalia?.trim();
  return dash(fromScheda);
}

export function clientPortalNoteIntervento(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.noteIntervento?.trim();
  if (fromScheda) return fromScheda;
  const fromRow = row.note?.trim();
  return fromRow && fromRow !== "—" ? fromRow : "";
}

function clientPortalAddettoNomeKey(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
): string {
  const fallback = addettiGlobali[0] ?? "";
  const raw =
    schedeStore[row.id]?.ingresso?.campi.addettoAccettazione?.trim() ||
    schedeStore[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addetto.trim())
      ?.addetto.trim() ||
    fallback ||
    "";
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  return trimmed;
}

export function clientPortalAddettoLabel(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
  addettiRecords: readonly AddettoRecord[] = [],
): string {
  const nome = clientPortalAddettoNomeKey(row, schedeStore, addettiGlobali);
  if (nome === "—") return "—";
  return addettoDisplayNameFromNome(addettiRecords, nome);
}

export function buildClientPortalRowFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
  addettiRecords: readonly AddettoRecord[] = [],
): ClientPortalRowFields {
  const display = resolveLavorazioneContextWithAttrezzatura(row, schedeStore);
  const { marca, modello } = clientPortalMarcaModello(row, schedeStore);
  const dataIngressoAt = lavorazioneIngressoIso(
    row,
    schedeStore[row.id]?.ingresso?.campi.dataIngresso,
  );
  const addettoNome = clientPortalAddettoNomeKey(row, schedeStore, addettiGlobali);
  const addetto =
    addettoNome === "—" ? "—" : addettoDisplayNameFromNome(addettiRecords, addettoNome);
  return {
    dataIngresso: clientPortalDataIngressoLabel(row, schedeStore),
    dataIngressoAt,
    dataIngressoIso: clientPortalIngressoIso(row, schedeStore),
    cliente: display.cliente,
    cantiere: display.cantiere,
    utilizzatore: clientPortalUtilizzatoreLabel(row, schedeStore),
    marca,
    modello,
    attrezzatura: display.oggettoLabel,
    entityBadge: display.oggettoBadge,
    targa: display.ident.targa,
    matricola: display.ident.matricola,
    nScuderia: display.ident.nScuderia,
    addettoNome,
    addetto,
    descrizioneProblema: clientPortalDescrizioneProblema(row, schedeStore),
    noteIntervento: clientPortalNoteIntervento(row, schedeStore),
  };
}

export function clientPortalDataCompletamentoLabel(row: LavorazioneListRow): string {
  const iso = row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at;
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Haystack per ricerca globale portale clienti. */
export function clientPortalRowSearchHaystack(fields: ClientPortalRowFields): string {
  return [
    fields.cliente,
    fields.cantiere,
    fields.utilizzatore,
    fields.marca,
    fields.modello,
    fields.attrezzatura,
    fields.targa,
    fields.matricola,
    fields.nScuderia,
    fields.addetto,
    fields.addettoNome,
    fields.descrizioneProblema,
    fields.noteIntervento,
  ]
    .join(" ")
    .toLowerCase();
}

export function clientPortalRowMatchesSearch(fields: ClientPortalRowFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return clientPortalRowSearchHaystack(fields).includes(q);
}
