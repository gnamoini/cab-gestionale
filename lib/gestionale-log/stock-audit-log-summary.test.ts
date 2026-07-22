import assert from "node:assert/strict";
import {
  buildLogModificaSummary,
  extractPayloadFieldChanges,
  tipoRigaFromAzione,
} from "@/lib/gestionale-log/log-summary";
import {
  buildStockMovementAuditPayload,
  buildStockMovementAuditPayloadWithContext,
  parseStockMovementAuditPayload,
} from "@/lib/magazzino/stock-audit-payload";
import { ricambioIdFromMovimentoRow } from "@/lib/magazzino/magazzino-log-feed-merge";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const RICAMBIO_ID = "11111111-1111-4111-8111-111111111111";
const MOVIMENTO_ID = "22222222-2222-4222-8222-222222222222";

const caricoPayload = buildStockMovementAuditPayload({
  ricambioId: RICAMBIO_ID,
  quantitaBefore: 10,
  quantitaAfter: 15,
  origine: "manual_adjustment",
  causale: "carico_manuale",
  movimentoId: MOVIMENTO_ID,
});

const scaricoPayload = buildStockMovementAuditPayload({
  ricambioId: RICAMBIO_ID,
  quantitaBefore: 15,
  quantitaAfter: 12,
  origine: "manual_adjustment",
  causale: "scarico_manuale",
  movimentoId: MOVIMENTO_ID,
});

{
  const parsed = parseStockMovementAuditPayload(caricoPayload);
  assert.ok(parsed);
  assert.equal(parsed.tipo, "CARICO_MAGAZZINO");
  assert.equal(parsed.ricambioId, RICAMBIO_ID);
  assert.equal(parsed.movimentoId, MOVIMENTO_ID);
  assert.equal(parsed.before, 10);
  assert.equal(parsed.after, 15);
  assert.equal(parsed.delta, 5);
  assert.deepEqual(parsed.modifiche, [{ campo: "Scorta", prima: "10", dopo: "15" }]);
}

{
  const parsed = parseStockMovementAuditPayload(scaricoPayload);
  assert.ok(parsed);
  assert.equal(parsed.tipo, "SCARICO_MAGAZZINO");
  assert.equal(parsed.delta, -3);
}

{
  assert.equal(tipoRigaFromAzione("movimenti_ricambi", "CREATE", caricoPayload), "CARICO MAGAZZINO");
  assert.equal(tipoRigaFromAzione("magazzino_ricambi", "UPDATE", scaricoPayload), "SCARICO MAGAZZINO");
  const changes = extractPayloadFieldChanges(caricoPayload);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]!.key, "scorta");
  assert.equal(changes[0]!.before, 10);
  assert.equal(changes[0]!.after, 15);
}

{
  const summary = buildLogModificaSummary({
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    payload: caricoPayload,
  });
  assert.equal(summary.tipoRiga, "CARICO MAGAZZINO");
  assert.ok(summary.modifiche.some((m) => m.includes("Scorta aumentata da 10 a 15")));
}

{
  const row: LogModificaRow = {
    id: "log-1",
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    autore_id: "user-1",
    created_at: "2026-07-21T10:00:00.000Z",
    payload: caricoPayload,
  };
  assert.equal(ricambioIdFromMovimentoRow(row), RICAMBIO_ID);
}

{
  const contextual = buildStockMovementAuditPayloadWithContext(
    {
      ricambioId: RICAMBIO_ID,
      quantitaBefore: 10,
      quantitaAfter: 15,
      origine: "manual_adjustment",
      causale: "carico_manuale",
      movimentoId: MOVIMENTO_ID,
    },
    "Mann — Filtro olio",
  );
  const summary = buildLogModificaSummary({
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    payload: contextual,
  });
  assert.match(summary.oggettoRiga, /Filtro olio/i);
  assert.notEqual(summary.oggettoRiga, "—");
}

console.log("stock-audit-log-summary.test.ts OK");
