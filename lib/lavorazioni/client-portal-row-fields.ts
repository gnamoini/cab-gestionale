import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import { formatClientPortalAttrezzatura } from "@/lib/lavorazioni/client-portal-attrezzatura-format";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";
import { lavorazioneIngressoIso } from "@/lib/lavorazioni/lavorazione-ingresso-display";

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
  targa: string;
  matricola: string;
  nScuderia: string;
  addetto: string;
  descrizioneProblema: string;
};

export function clientPortalClienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.cliente?.trim();
  return dash(fromScheda || row.mezzo?.cliente);
}

export function clientPortalUtilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return dash(schedeStore?.[row.id]?.ingresso?.campi.utilizzatore?.trim() || row.mezzo?.utilizzatore);
}

export function clientPortalCantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return dash(schedeStore?.[row.id]?.ingresso?.campi.cantiere?.trim());
}

export function clientPortalAttrezzaturaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing) {
    return formatClientPortalAttrezzatura({
      marca: ing.marcaAttrezzatura,
      modello: ing.modelloAttrezzatura,
    });
  }
  const m = row.mezzo;
  return formatClientPortalAttrezzatura({
    marca: m?.marca,
    modello: m?.modello,
  });
}

export function clientPortalMezzoIdent(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): { targa: string; matricola: string; nScuderia: string } {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing) {
    return {
      targa: dash(ing.targa),
      matricola: dash(ing.matricola),
      nScuderia: dash(ing.nScuderia),
    };
  }
  const m = row.mezzo;
  return {
    targa: dash(m?.targa),
    matricola: dash(m?.matricola),
    nScuderia: dash(m?.numero_scuderia),
  };
}

export function clientPortalIngressoIso(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.dataIngresso?.trim();
  if (fromScheda) {
    if (/^\d{4}-\d{2}-\d{2}/.test(fromScheda)) return fromScheda.slice(0, 10);
    const d = new Date(fromScheda);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return fromScheda;
  }
  const raw = row.data_ingresso?.trim() || row.created_at;
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
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
  const m = row.mezzo;
  return {
    marca: dash(m?.marca),
    modello: dash(m?.modello),
  };
}

export function clientPortalDescrizioneProblema(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.descrizioneAnomalia?.trim();
  const fromNote = row.note?.trim();
  return dash(fromScheda || fromNote);
}

export function clientPortalAddettoLabel(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): string {
  const fromLogs = latestAddettoFromLogs(logs);
  const fallback = fromLogs !== "—" ? fromLogs : (addettiGlobali[0] ?? "");
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

export function buildClientPortalRowFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs: readonly LogModificaRow[],
  addettiGlobali: readonly string[],
): ClientPortalRowFields {
  const ident = clientPortalMezzoIdent(row, schedeStore);
  const { marca, modello } = clientPortalMarcaModello(row, schedeStore);
  const dataIngressoAt = lavorazioneIngressoIso(
    row,
    schedeStore[row.id]?.ingresso?.campi.dataIngresso,
  );
  return {
    dataIngresso: clientPortalDataIngressoLabel(row, schedeStore),
    dataIngressoAt,
    dataIngressoIso: clientPortalIngressoIso(row, schedeStore),
    cliente: clientPortalClienteLabel(row, schedeStore),
    cantiere: clientPortalCantiereLabel(row, schedeStore),
    utilizzatore: clientPortalUtilizzatoreLabel(row, schedeStore),
    marca,
    modello,
    attrezzatura: clientPortalAttrezzaturaLabel(row, schedeStore),
    targa: ident.targa,
    matricola: ident.matricola,
    nScuderia: ident.nScuderia,
    addetto: clientPortalAddettoLabel(row, schedeStore, logs, addettiGlobali),
    descrizioneProblema: clientPortalDescrizioneProblema(row, schedeStore),
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
    fields.descrizioneProblema,
  ]
    .join(" ")
    .toLowerCase();
}

export function clientPortalRowMatchesSearch(fields: ClientPortalRowFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return clientPortalRowSearchHaystack(fields).includes(q);
}
