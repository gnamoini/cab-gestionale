import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { parseStockMovementAuditPayload } from "@/lib/magazzino/stock-audit-payload";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type RicambioLogLabelSource = Pick<
  RicambioMagazzino,
  "id" | "marca" | "descrizione" | "codiceFornitoreOriginale"
>;

function readStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function shortRicambioId(ricambioId: string): string {
  const id = ricambioId.trim();
  if (!id) return "????????";
  return id.replace(/-/g, "").slice(0, 8).toLowerCase();
}

function cleanLabel(raw: string): string {
  return raw.trim();
}

function joinMarcaDescrizione(marca: string, descrizione: string): string {
  const parts = [formatTitleCasePhrase(marca), formatTitleCasePhrase(descrizione)].filter(
    (p) => p && p !== "—",
  );
  if (!parts.length) return "";
  return cleanLabel(parts.join(" — "));
}

/** Snapshot immutabile o legacy da payload audit. */
export function entityLabelFromPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const ctx = (payload as Record<string, unknown>).context;
  if (!ctx || typeof ctx !== "object" || Array.isArray(ctx)) return null;
  const record = ctx as Record<string, unknown>;
  const entityLabel = readStr(record.entityLabel);
  if (entityLabel) return cleanLabel(entityLabel);
  const oggetto = readStr(record.oggetto);
  if (oggetto) return cleanLabel(oggetto);
  return null;
}

/** SSOT: ricambio_id da riga log magazzino/movimenti (R-19 flat + nested). */
export function ricambioIdFromLogRow(row: LogModificaRow): string | null {
  if (row.entita === "magazzino_ricambi") {
    const id = row.entita_id?.trim();
    return id || null;
  }
  if (row.entita !== "movimenti_ricambi") return null;

  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock?.ricambioId) return stock.ricambioId;

  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const payload = p as Record<string, unknown>;
  const rootId = payload.ricambio_id ?? payload.ricambioId;
  if (typeof rootId === "string" && rootId.trim()) return rootId.trim();
  for (const rec of [payload.snapshot, payload.after, payload.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const rid = (rec as Record<string, unknown>).ricambio_id;
    if (typeof rid === "string" && rid.trim()) return rid.trim();
  }
  return null;
}

/** @deprecated Usare `ricambioIdFromLogRow`. */
export const ricambioIdFromMovimentoRow = ricambioIdFromLogRow;

export function formatRicambioLogLabel(
  ricambio?: RicambioLogLabelSource | null,
  ricambioId?: string | null,
): string {
  if (ricambio) {
    const desc = ricambio.descrizione?.trim();
    if (desc) {
      const joined = joinMarcaDescrizione(ricambio.marca?.trim() ?? "", desc);
      if (joined && joined !== "—") return joined;
      return cleanLabel(formatTitleCasePhrase(desc));
    }
    const codice = ricambioCodiceForUi(ricambio.codiceFornitoreOriginale);
    if (codice) {
      const joined = joinMarcaDescrizione(ricambio.marca?.trim() ?? "", codice);
      if (joined && joined !== "—") return joined;
      return cleanLabel(codice.toUpperCase());
    }
  }
  const id = ricambioId?.trim() || ricambio?.id?.trim();
  if (id) return `Ricambio eliminato (#${shortRicambioId(id)})`;
  return "Ricambio sconosciuto";
}

export function formatRicambioLogLabelFromDbRow(
  row: Pick<MagazzinoRicambioRow, "id" | "nome" | "marca" | "codice">,
): string {
  return formatRicambioLogLabel(
    {
      id: row.id,
      marca: row.marca ?? "",
      descrizione: row.nome ?? "",
      codiceFornitoreOriginale: ricambioCodiceForUi(row.codice),
    },
    row.id,
  );
}

export function isMagazzinoLogEntita(entita: string): boolean {
  return entita === "magazzino_ricambi" || entita === "movimenti_ricambi";
}

/** Risolve label ricambio per feed/log — mai `"—"` su dominio magazzino. */
export function resolveRicambioOggettoForLogRow(
  row: LogModificaRow,
  ricambiById: ReadonlyMap<string, RicambioLogLabelSource>,
): string {
  const fromPayload = entityLabelFromPayload(row.payload);
  if (fromPayload && fromPayload !== "—") return fromPayload;

  const ricambioId = ricambioIdFromLogRow(row);
  if (ricambioId) {
    const ric = ricambiById.get(ricambioId);
    if (ric) return formatRicambioLogLabel(ric, ricambioId);
    return formatRicambioLogLabel(null, ricambioId);
  }

  return "Ricambio sconosciuto";
}

export function movimentoIdFromLogRow(row: LogModificaRow): string | null {
  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock?.movimentoId) return stock.movimentoId;
  if (row.entita === "movimenti_ricambi" && row.entita_id?.trim()) return row.entita_id.trim();
  return null;
}

export function operationIdFromLogRow(row: LogModificaRow): string | null {
  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock) {
    const p = row.payload;
    if (p && typeof p === "object" && !Array.isArray(p)) {
      const op = (p as Record<string, unknown>).operation_id ?? (p as Record<string, unknown>).operationId;
      if (typeof op === "string" && op.trim()) return op.trim();
    }
  }
  return null;
}

function quantitaFromLogRow(row: LogModificaRow): string {
  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock) return String(Math.abs(stock.delta));
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return "0";
  const payload = p as Record<string, unknown>;
  for (const rec of [payload.snapshot, payload.after, payload.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const q = (rec as Record<string, unknown>).quantita;
    if (q != null) return String(q);
  }
  return "0";
}

function createdAtRound(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso.trim();
  return new Date(Math.floor(t / 1000) * 1000).toISOString();
}

/** Chiave dedup feed: movimento_id → operation_id → fingerprint storico. */
export function magazzinoLogEventDedupKey(row: LogModificaRow): string {
  const movimentoId = movimentoIdFromLogRow(row);
  if (movimentoId) return `mov:${movimentoId}`;

  const operationId = operationIdFromLogRow(row);
  if (operationId) return `op:${operationId}`;

  const entity = row.entita?.trim() || "unknown";
  const entityId = row.entita_id?.trim() || "";
  const azione = row.azione?.trim().toUpperCase() || "UNKNOWN";
  const atRound = createdAtRound(row.created_at);
  const qty = quantitaFromLogRow(row);
  return `fp:${entity}:${entityId}:${azione}:${atRound}:${qty}`;
}

/** Dedup key per riga movimenti_ricambi (ledger SSOT). */
export function movimentoRowDedupKey(row: { id: string }): string {
  return `mov:${row.id.trim()}`;
}
