import assert from "node:assert/strict";
import { buildStockMovementAuditPayload } from "@/lib/magazzino/stock-audit-payload";
import { buildStockIntegrityRow } from "@/lib/magazzino/verify-stock-integrity";
import { resolveStockOperationalStatus } from "@/lib/magazzino/stock-policy";

const payload = buildStockMovementAuditPayload({
  ricambioId: "r1",
  quantitaBefore: 20,
  quantitaAfter: 15,
  origine: "manual_adjustment",
  causale: "scarico",
  operationId: "op-1",
});
assert.equal(payload.delta, -5);
assert.equal(payload.origine, "manual_adjustment");

const row = buildStockIntegrityRow({
  ricambio: { id: "r1", codice: "A", nome: "Filtro", quantita: 10 },
  movements: [
    { tipo: "entrata", quantita: 15 },
    { tipo: "uscita", quantita: 5 },
  ],
  baselineQuantity: 0,
});
assert.equal(row.coherent, true);

const critico = resolveStockOperationalStatus({
  scorta: 2,
  scortaMinima: 5,
  avgMonthlyConsumption: 10,
});
assert.equal(critico, "riordino");

console.log("magazzino-stock-audit-payload.test.ts OK");
