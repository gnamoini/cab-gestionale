"use client";

import { stockAdjustFetch } from "@/lib/magazzino/stock-adjust-client";
import type { MaintenanceStockReservationPort } from "@/lib/maintenance-plans/ports/warehouse.port";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

async function loadRicambioStockVersion(ricambioId: string): Promise<{ version: number; quantita: number } | null> {
  const client = await getBrowserSupabase();
  const { data, error } = await client
    .from("magazzino_ricambi")
    .select("stock_version, quantita")
    .eq("id", ricambioId)
    .maybeSingle();
  if (error || !data) return null;
  return { version: Number(data.stock_version ?? 0), quantita: Number(data.quantita ?? 0) };
}

export const maintenanceStockReservationPort: MaintenanceStockReservationPort = {
  async reserveParts(input) {
    const results: { ricambioId: string; stockTransactionId: string | null; status: "completed" | "failed" }[] = [];

    for (const part of input.parts) {
      const stock = await loadRicambioStockVersion(part.ricambioId);
      if (!stock) {
        results.push({ ricambioId: part.ricambioId, stockTransactionId: null, status: "failed" });
        continue;
      }

      const delta = -Math.abs(part.quantita);
      const operationId = crypto.randomUUID();
      const res = await stockAdjustFetch({
        ricambioId: part.ricambioId,
        delta,
        expectedVersion: stock.version,
        operationId,
        origine: "manual_adjustment",
        causale: "scarico_tagliando",
        contaStatistiche: true,
      });

      results.push({
        ricambioId: part.ricambioId,
        stockTransactionId: res.ok ? res.data.movimentoId : null,
        status: res.ok ? "completed" : "failed",
      });
    }

    const client = await getBrowserSupabase();
    for (const r of results) {
      const warehouseStatus = r.status === "completed" ? "completed" : "failed";
      await client
        .from("vehicle_maintenance_service_parts")
        .update({
          warehouse_status: warehouseStatus,
          stock_transaction_id: r.stockTransactionId,
        })
        .eq("service_id", input.executionId)
        .eq("ricambio_id", r.ricambioId)
        .eq("was_replaced", true);
    }

    const failed = results.filter((r) => r.status === "failed");
    if (failed.length > 0) {
      console.warn("[maintenance-warehouse] scarico fallito per", failed.map((f) => f.ricambioId));
    }

    return {
      stockTransactionIds: results
        .map((r) => r.stockTransactionId)
        .filter((id): id is string => Boolean(id)),
      failedRicambioIds: failed.map((f) => f.ricambioId),
    };
  },
};

export async function processMaintenanceWarehouseDischarge(input: {
  executionId: string;
  parts: { ricambioId: string; quantita: number }[];
}): Promise<void> {
  const toDischarge = input.parts.filter((p) => p.quantita > 0);
  if (toDischarge.length === 0) return;
  await maintenanceStockReservationPort.reserveParts({
    executionId: input.executionId,
    parts: toDischarge,
  });
}
