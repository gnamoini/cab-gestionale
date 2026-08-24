import "server-only";

import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";
import { isStockPipelineServerEnabled } from "@/lib/feature-flags/stock-pipeline";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type StockApplyMovementInput = {
  ricambioId: string;
  delta: number;
  expectedVersion: number;
  operationId: string;
  origine?: StockMovementOrigin;
  causale?: string;
  contaStatistiche?: boolean;
  lavorazioneId?: string | null;
  meta?: Record<string, unknown>;
};

export type StockApplyMovementResult = {
  ricambioId: string;
  quantita: number;
  stockVersion: number;
  movimentoId: string | null;
  operationId: string;
  quantitaBefore?: number;
  delta?: number;
  idempotent?: boolean;
  noop?: boolean;
};

export class StockVersionConflictError extends Error {
  readonly code = "STOCK_VERSION_CONFLICT" as const;
  constructor(message = "Conflitto versione giacenza") {
    super(message);
    this.name = "StockVersionConflictError";
  }
}

export class StockInsufficientError extends Error {
  readonly code = "INSUFFICIENT_STOCK" as const;
  constructor(message = "Giacenza insufficiente") {
    super(message);
    this.name = "StockInsufficientError";
  }
}

function mapRpcRow(raw: Record<string, unknown>): StockApplyMovementResult {
  return {
    ricambioId: String(raw.ricambio_id),
    quantita: Math.max(0, Math.round(Number(raw.quantita) || 0)),
    stockVersion: Math.max(0, Math.round(Number(raw.stock_version) || 0)),
    movimentoId: raw.movimento_id ? String(raw.movimento_id) : null,
    operationId: String(raw.operation_id),
    quantitaBefore: raw.quantita_before != null ? Math.round(Number(raw.quantita_before)) : undefined,
    delta: raw.delta != null ? Math.round(Number(raw.delta)) : undefined,
    idempotent: raw.idempotent === true,
    noop: raw.noop === true,
  };
}

function mapRpcError(error: { message?: string; code?: string }): never {
  const msg = error.message ?? "";
  if (msg.includes("stock_version_conflict")) {
    throw new StockVersionConflictError();
  }
  if (msg.includes("insufficient_stock") || error.code === "23514") {
    throw new StockInsufficientError();
  }
  if (msg.includes("ricambio_not_found") || error.code === "P0002") {
    throw new Error("Ricambio non trovato");
  }
  throw new Error(msg || "Stock Engine fallito");
}

/** SSOT adjustStock — unico entry point server write. */
export const adjustStock = stockApplyMovement;

/** Stock Engine — INSERT movimento → ricalcola quantita (Invariant S-01). */
export async function stockApplyMovement(
  input: StockApplyMovementInput,
): Promise<StockApplyMovementResult> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("stock_apply_movement", {
    p_ricambio_id: input.ricambioId,
    p_delta: input.delta,
    p_expected_version: input.expectedVersion,
    p_operation_id: input.operationId,
    p_origine: input.origine ?? "manual_adjustment",
    p_causale: input.causale ?? null,
    p_conta_statistiche: input.contaStatistiche ?? true,
    p_lavorazione_id: input.lavorazioneId ?? null,
    p_meta: input.meta ?? {},
  });

  if (error) mapRpcError(error);
  if (!data || typeof data !== "object") {
    throw new Error("Risposta Stock Engine non valida");
  }

  const result = mapRpcRow(data as Record<string, unknown>);
  if (isStockPipelineServerEnabled()) {
    logStockPipelineEvent({
      source: "stock_engine",
      operationId: input.operationId,
      ricambioId: input.ricambioId,
      delta: input.delta,
      expectedVersion: input.expectedVersion,
      responseVersion: result.stockVersion,
    });
  }
  return result;
}

/** Fetch current stock entity for conflict recovery. */
export async function fetchStockEntityState(ricambioId: string): Promise<{
  quantita: number;
  stockVersion: number;
} | null> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("magazzino_ricambi")
    .select("quantita, stock_version")
    .eq("id", ricambioId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    quantita: Math.max(0, Math.round(Number(data.quantita) || 0)),
    stockVersion: Math.max(0, Math.round(Number(data.stock_version) || 0)),
  };
}
