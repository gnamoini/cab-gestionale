import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";

/** Payload audit standard per variazioni quantità (R-19). */
export type StockMovementAuditPayload = {
  ricambio_id: string;
  quantita_before: number;
  delta: number;
  quantita_after: number;
  stock_version_before?: number;
  stock_version_after?: number;
  causale: string;
  origine: StockMovementOrigin;
  utente?: string | null;
  movimento_id?: string;
  operation_id?: string | null;
  storno_di?: string;
  source?: string;
  batchId?: string;
  fileName?: string;
};

export type ParsedStockMovementAuditPayload = {
  tipo: "CARICO_MAGAZZINO" | "SCARICO_MAGAZZINO";
  movimentoId: string | null;
  ricambioId: string | null;
  before: number;
  after: number;
  delta: number;
  modifiche: Array<{ campo: string; prima: string; dopo: string }>;
};

function readNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function readStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

/** Parser SSOT payload audit R-19 (flat quantita_before/delta/movimento_id). */
export function parseStockMovementAuditPayload(payload: unknown): ParsedStockMovementAuditPayload | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const delta = readNum(p.delta);
  const before = readNum(p.quantita_before);
  const after = readNum(p.quantita_after);
  if (delta == null || before == null || after == null) return null;
  if (delta === 0) return null;

  const ricambioId = readStr(p.ricambio_id) ?? readStr(p.ricambioId);
  const movimentoId = readStr(p.movimento_id) ?? readStr(p.movimentoId);
  const tipo = delta > 0 ? "CARICO_MAGAZZINO" : "SCARICO_MAGAZZINO";

  return {
    tipo,
    movimentoId,
    ricambioId,
    before,
    after,
    delta,
    modifiche: [{ campo: "Scorta", prima: String(before), dopo: String(after) }],
  };
}

export function isHiddenStockTimelinePayload(payload: unknown): boolean {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const p = payload as Record<string, unknown>;
  if (p.hidden_from_timeline === true) return true;
  const meta = p.meta;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return (meta as Record<string, unknown>).hidden_from_timeline === true;
  }
  return false;
}

export function buildStockMovementAuditPayload(input: {
  ricambioId: string;
  quantitaBefore: number;
  quantitaAfter: number;
  origine: StockMovementOrigin;
  causale: string;
  utente?: string | null;
  movimentoId?: string;
  operationId?: string | null;
  stockVersionBefore?: number;
  stockVersionAfter?: number;
  stornoDi?: string;
  extra?: Pick<StockMovementAuditPayload, "source" | "batchId" | "fileName">;
}): StockMovementAuditPayload {
  const before = Math.max(0, Math.round(input.quantitaBefore));
  const after = Math.max(0, Math.round(input.quantitaAfter));
  return {
    ricambio_id: input.ricambioId,
    quantita_before: before,
    delta: after - before,
    quantita_after: after,
    stock_version_before: input.stockVersionBefore,
    stock_version_after: input.stockVersionAfter,
    causale: input.causale,
    origine: input.origine,
    utente: input.utente ?? null,
    movimento_id: input.movimentoId,
    operation_id: input.operationId ?? null,
    storno_di: input.stornoDi,
    ...input.extra,
  };
}
