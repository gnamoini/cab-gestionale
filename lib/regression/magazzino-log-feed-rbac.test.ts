import assert from "node:assert/strict";
import { buildControlTowerActivityFeedSlice } from "@/lib/dashboard/control-tower-selectors";
import { buildLogModificaSummary } from "@/lib/gestionale-log/log-summary";
import {
  buildStockMovementAuditPayload,
  buildStockMovementAuditPayloadWithContext,
} from "@/lib/magazzino/stock-audit-payload";
import { mergeMagazzinoLogFeed } from "@/lib/magazzino/magazzino-log-feed-merge";
import { movimentiRowsToLogFeedItems } from "@/lib/magazzino/magazzino-movimenti-feed";
import {
  formatRicambioLogLabel,
  magazzinoLogEventDedupKey,
  resolveRicambioOggettoForLogRow,
} from "@/lib/magazzino/ricambio-log-label";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { movimentiListQueryKey } from "@/lib/render/query-key-factory";
import type { LogModificaRow, LogModificaWithProfileRow, MovimentoRicambioRow } from "@/src/types/supabase-tables";

const RICAMBIO_ID = "11111111-1111-4111-8111-111111111111";
const MOVIMENTO_ID = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function ricambio(overrides?: Partial<RicambioMagazzino>): RicambioMagazzino {
  return {
    id: RICAMBIO_ID,
    marca: "Mann",
    codiceFornitoreOriginale: "W712/75",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro olio",
    note: "",
    categoria: "Filtri",
    compatibilitaMezzi: [],
    scorta: 10,
    scortaMinima: 2,
    dataUltimaModifica: "2026-07-21T10:00:00.000Z",
    autoreUltimaModifica: "Test",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 10,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
    ...overrides,
  };
}

function stockLogRow(overrides?: Partial<LogModificaRow>): LogModificaWithProfileRow {
  const payload = buildStockMovementAuditPayloadWithContext(
    {
      ricambioId: RICAMBIO_ID,
      quantitaBefore: 10,
      quantitaAfter: 15,
      origine: "manual_adjustment",
      causale: "carico",
      movimentoId: MOVIMENTO_ID,
    },
    "Mann — Filtro olio",
  );
  return {
    id: "log-stock-1",
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    autore_id: USER_A,
    created_at: "2026-07-21T10:00:00.000Z",
    payload,
    profiles: null,
    ...overrides,
  };
}

{
  const catalog = new Map([[RICAMBIO_ID, ricambio()]]);
  const feed = buildControlTowerActivityFeedSlice({
    lavRows: [],
    ricambi: [ricambio()],
    logMagazzino: [stockLogRow()],
  });
  assert.equal(feed.byDomain.magazzino.length, 1);
  assert.match(feed.byDomain.magazzino[0]!.vm.oggettoRiga, /Filtro olio/i);
}

{
  const movimento: MovimentoRicambioRow = {
    id: MOVIMENTO_ID,
    ricambio_id: RICAMBIO_ID,
    tipo: "entrata",
    quantita: 5,
    lavorazione_id: null,
    note: null,
    created_at: "2026-07-21T11:00:00.000Z",
    created_by: USER_A,
    operation_id: "33333333-3333-4333-8333-333333333333",
    conta_statistiche: true,
    meta: {},
  };
  const items = movimentiRowsToLogFeedItems([movimento], new Map([[RICAMBIO_ID, ricambio()]]));
  const merged = mergeMagazzinoLogFeed([], [], [], items);
  assert.equal(merged.length, 1);
  assert.match(merged[0]!.vm.oggettoRiga, /Filtro olio/i);
}

{
  const merged = mergeMagazzinoLogFeed([], [], [], []);
  assert.equal(merged.length, 0);
}

{
  const row: LogModificaRow = {
    id: "log-deleted",
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    autore_id: USER_A,
    created_at: "2026-07-21T10:00:00.000Z",
    payload: buildStockMovementAuditPayload({
      ricambioId: RICAMBIO_ID,
      quantitaBefore: 10,
      quantitaAfter: 8,
      origine: "manual_adjustment",
      causale: "scarico",
      movimentoId: MOVIMENTO_ID,
    }),
  };
  const catalog = new Map<string, RicambioMagazzino>();
  const label = resolveRicambioOggettoForLogRow(row, catalog);
  assert.match(label, /Ricambio eliminato/i);
  assert.notEqual(label, "—");
}

{
  const row = stockLogRow({
    payload: buildStockMovementAuditPayloadWithContext(
      {
        ricambioId: RICAMBIO_ID,
        quantitaBefore: 10,
        quantitaAfter: 8,
        origine: "manual_adjustment",
        causale: "scarico",
        movimentoId: MOVIMENTO_ID,
      },
      "Filtro vecchio",
    ),
  });
  const catalog = new Map([[RICAMBIO_ID, ricambio({ descrizione: "Filtro nuovo" })]]);
  const label = resolveRicambioOggettoForLogRow(row, catalog);
  assert.equal(label, "Filtro vecchio");
}

{
  const logItem = {
    id: "log-1",
    source: "server" as const,
    ricambioId: RICAMBIO_ID,
    vm: {
      tone: "update" as const,
      tipoRiga: "CARICO MAGAZZINO",
      oggettoRiga: "Mann — Filtro olio",
      modificaRiga: "• Scorta aumentata",
      autore: "A",
      atIso: "2026-07-21T10:00:00.000Z",
    },
    serverRow: stockLogRow(),
    movimentoId: MOVIMENTO_ID,
    atMs: Date.parse("2026-07-21T10:00:00.000Z"),
  };
  const movItems = movimentiRowsToLogFeedItems(
    [
      {
        id: MOVIMENTO_ID,
        ricambio_id: RICAMBIO_ID,
        tipo: "entrata",
        quantita: 5,
        lavorazione_id: null,
        note: null,
        created_at: "2026-07-21T10:00:00.000Z",
        created_by: USER_A,
        operation_id: null,
        conta_statistiche: true,
        meta: {},
      },
    ],
    new Map([[RICAMBIO_ID, ricambio()]]),
  );
  const merged = mergeMagazzinoLogFeed([], [logItem], [stockLogRow()], movItems);
  assert.equal(merged.length, 1);
}

{
  const key = movimentiListQueryKey(null);
  assert.equal((key as readonly unknown[]).includes(USER_B), false);
}

{
  const summary = buildLogModificaSummary({
    entita: "movimenti_ricambi",
    entita_id: MOVIMENTO_ID,
    azione: "CREATE",
    payload: buildStockMovementAuditPayloadWithContext(
      {
        ricambioId: RICAMBIO_ID,
        quantitaBefore: 10,
        quantitaAfter: 15,
        origine: "manual_adjustment",
        causale: "carico",
        movimentoId: MOVIMENTO_ID,
      },
      "Mann — Filtro olio",
    ),
  });
  assert.match(summary.oggettoRiga, /Filtro olio/i);
  assert.notEqual(summary.oggettoRiga, "—");
}

{
  const keyA = magazzinoLogEventDedupKey(stockLogRow());
  const keyB = magazzinoLogEventDedupKey(stockLogRow({ id: "log-2" }));
  assert.equal(keyA, keyB);
  assert.match(keyA, /^mov:/);
}

{
  assert.match(formatRicambioLogLabel(null, RICAMBIO_ID), /11111111/);
}

console.log("magazzino-log-feed-rbac.test.ts OK");
