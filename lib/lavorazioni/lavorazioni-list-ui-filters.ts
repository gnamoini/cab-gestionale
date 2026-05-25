import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import {
  lavRowMatchesAdvancedFilters,
  type LavorazioniAdvancedFilters,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** @deprecated Usare `LavorazioniAdvancedFilters` + `search` separato. */
export type LavPageFilters = LavorazioniAdvancedFilters & {
  search: string;
};

function macchinaFromRow(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing?.marcaAttrezzatura?.trim() || ing?.modelloAttrezzatura?.trim()) {
    return [ing.marcaAttrezzatura, ing.modelloAttrezzatura].filter(Boolean).join(" ").trim();
  }
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "";
}

/** Testo indicizzato per ricerca globale (DB + schede ingresso/lavorazioni). */
export function lavRowSearchHaystack(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  const lav = schedeStore?.[row.id]?.lavorazioni?.campi;
  const m = row.mezzo;

  const lavRigheText =
    lav?.righe
      .flatMap((r) => [r.lavorazioniEffettuate, ...r.addettiAssegnati.map((a) => a.addetto)])
      .join(" ") ?? "";

  return [
    (row.note ?? "").trim(),
    macchinaFromRow(row, schedeStore),
    ing?.cliente?.trim() || m?.cliente?.trim() || "",
    ing?.utilizzatore?.trim() || m?.utilizzatore?.trim() || "",
    ing?.cantiere?.trim() || "",
    ing?.targa?.trim() || m?.targa?.trim() || "",
    ing?.matricola?.trim() || m?.matricola?.trim() || "",
    ing?.nScuderia?.trim() || m?.numero_scuderia?.trim() || "",
    ing?.marcaAttrezzatura,
    ing?.modelloAttrezzatura,
    ing?.descrizioneAnomalia,
    ing?.noteIntervento,
    ing?.addettoAccettazione,
    ing?.richiedente,
    ing?.tipoTelaio,
    ing?.marcaTelaio,
    ing?.modelloTelaio,
    lavRigheText,
    row.codice?.trim() || "",
    row.id,
    row.stato,
    labelLavorazioneStatoDb(row.stato),
    row.priorita ?? "",
    row.mezzo_id ?? "",
    row.data_ingresso ?? "",
    row.data_uscita ?? "",
    row.created_at,
  ]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

export function lavRowMatchesGlobalSearch(
  row: LavorazioneListRow,
  query: string,
  schedeStore?: LavorazioneSchedeStore,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return lavRowSearchHaystack(row, schedeStore).includes(q);
}

function dayStartMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T00:00:00` : t);
  return d.getTime();
}

function dayEndMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T23:59:59.999` : t);
  return d.getTime();
}

/** Filtro client su data ingresso (ISO o yyyy-mm-dd). */
export function lavRowIngressoInRange(row: LavorazioneListRow, daYmd: string, aYmd: string): boolean {
  if (!daYmd.trim() && !aYmd.trim()) return true;
  const raw = row.data_ingresso?.trim() || row.created_at;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  if (daYmd.trim()) {
    const d0 = dayStartMs(daYmd);
    if (Number.isFinite(d0) && t < d0) return false;
  }
  if (aYmd.trim()) {
    const d1 = dayEndMs(aYmd);
    if (Number.isFinite(d1) && t > d1) return false;
  }
  return true;
}

/** Ricerca libera + filtri avanzati — in corso e archivio. */
export function lavRowMatchesPageFilters(
  row: LavorazioneListRow,
  filters: LavPageFilters,
  schedeStore: LavorazioneSchedeStore | undefined,
  defaultAddetto: string,
): boolean {
  if (!lavRowMatchesGlobalSearch(row, filters.search, schedeStore)) return false;
  const { search: _s, ...advanced } = filters;
  return lavRowMatchesAdvancedFilters(row, advanced, schedeStore, defaultAddetto);
}
