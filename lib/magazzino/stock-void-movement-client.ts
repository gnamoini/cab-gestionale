"use client";

export type StockVoidMovementResponse = {
  ricambioId: string;
  quantita: number;
  stockVersion: number;
  movimentoId: string | null;
  voidedMovimentoId: string;
};

export async function stockVoidMovementFetch(
  movimentoId: string,
): Promise<{ ok: true; data: StockVoidMovementResponse } | { ok: false; status: number; error: string; code?: string }> {
  const res = await fetch("/api/magazzino/stock/void-movement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movimentoId }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof body.error === "string" ? body.error : "Annullamento movimento fallito",
      code: typeof body.code === "string" ? body.code : undefined,
    };
  }
  return { ok: true, data: body as StockVoidMovementResponse };
}
