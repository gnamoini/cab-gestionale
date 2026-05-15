import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function macchinaLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function clienteLabel(row: LavorazioneListRow): string {
  return row.mezzo?.cliente?.trim() || "—";
}

function mezzoIdent(row: LavorazioneListRow): string {
  const m = row.mezzo;
  const t = m?.targa?.trim() || "—";
  const mat = m?.matricola?.trim() || "—";
  const sc = m?.numero_scuderia?.trim() || "—";
  return `${t} · ${mat} · ${sc}`;
}

/** Testo indicizzato per ricerca globale (note, mezzo, cliente, identificativi, stato). */
export function lavRowSearchHaystack(row: LavorazioneListRow): string {
  return [
    (row.note ?? "").trim(),
    macchinaLabel(row),
    clienteLabel(row),
    mezzoIdent(row),
    row.id,
    row.stato,
    labelLavorazioneStatoDb(row.stato),
    row.priorita ?? "",
    row.mezzo_id ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function lavRowMatchesGlobalSearch(row: LavorazioneListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return lavRowSearchHaystack(row).includes(q);
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
