import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";

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
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  attrezzatura: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  addetto: string;
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
    const parts = [ing.tipoAttrezzatura, ing.marcaAttrezzatura, ing.modelloAttrezzatura].map((x) => x?.trim()).filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }
  const m = row.mezzo;
  const parts = [m?.tipo_attrezzatura, m?.marca, m?.modello].map((x) => x?.trim()).filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
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

export function clientPortalDataIngressoLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.dataIngresso?.trim();
  if (fromScheda) return fmtDay(fromScheda);
  return fmtDay(row.data_ingresso ?? row.created_at);
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
  return {
    dataIngresso: clientPortalDataIngressoLabel(row, schedeStore),
    cliente: clientPortalClienteLabel(row, schedeStore),
    cantiere: clientPortalCantiereLabel(row, schedeStore),
    utilizzatore: clientPortalUtilizzatoreLabel(row, schedeStore),
    attrezzatura: clientPortalAttrezzaturaLabel(row, schedeStore),
    targa: ident.targa,
    matricola: ident.matricola,
    nScuderia: ident.nScuderia,
    addetto: clientPortalAddettoLabel(row, schedeStore, logs, addettiGlobali),
  };
}

export function clientPortalDataCompletamentoLabel(row: LavorazioneListRow): string {
  const iso = row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at;
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    fields.attrezzatura,
    fields.targa,
    fields.matricola,
    fields.nScuderia,
    fields.addetto,
  ]
    .join(" ")
    .toLowerCase();
}

export function clientPortalRowMatchesSearch(fields: ClientPortalRowFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return clientPortalRowSearchHaystack(fields).includes(q);
}
