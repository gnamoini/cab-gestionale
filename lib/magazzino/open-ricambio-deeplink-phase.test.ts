import assert from "node:assert/strict";
import {
  isMagazzinoListQueryReadyForOpenRicambio,
  planOpenRicambioDeepLinkStep,
  type MagazzinoListQuerySnapshot,
} from "@/lib/magazzino/open-ricambio-deeplink-phase";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const RICAMBIO_ID = "ric-uuid-qr-1";
const OTHER_ID = "ric-other";

function q(partial: Partial<MagazzinoListQuerySnapshot>): MagazzinoListQuerySnapshot {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    fetchStatus: "idle",
    status: "pending",
    ...partial,
  };
}

assert.equal(isMagazzinoListQueryReadyForOpenRicambio(q({ isFetching: true })), false);
assert.equal(isMagazzinoListQueryReadyForOpenRicambio(q({ isLoading: true })), false);
assert.equal(isMagazzinoListQueryReadyForOpenRicambio(q({ data: [] })), true);
assert.equal(
  isMagazzinoListQueryReadyForOpenRicambio(q({ data: [], isFetching: true })),
  true,
);
assert.equal(
  isMagazzinoListQueryReadyForOpenRicambio(q({ isError: true, status: "error" })),
  true,
);
assert.equal(
  isMagazzinoListQueryReadyForOpenRicambio(q({ fetchStatus: "idle", status: "pending" })),
  false,
);
assert.equal(isMagazzinoListQueryReadyForOpenRicambio(q({}), false), false);

// Lista in fetching — wait
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [],
    listQuery: q({ isFetching: true, isLoading: true }),
  }),
  { kind: "wait" },
);

// Lista arrivata con ricambio
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [RICAMBIO_ID],
    listQuery: q({ data: [{ id: RICAMBIO_ID }], status: "success" }),
  }),
  { kind: "open_from_list", id: RICAMBIO_ID },
);

// Lista settled, miss — start_get_by_id
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [OTHER_ID],
    listQuery: q({ data: [{ id: OTHER_ID }], status: "success" }),
  }),
  { kind: "start_get_by_id", id: RICAMBIO_ID },
);

// getById in corso — wait (non doppio start)
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: true,
    prodottiIds: [OTHER_ID],
    listQuery: q({ data: [{ id: OTHER_ID }], status: "success" }),
  }),
  { kind: "wait" },
);

// Lista fallita senza dati — start_get_by_id
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [],
    listQuery: q({ isError: true, status: "error" }),
  }),
  { kind: "start_get_by_id", id: RICAMBIO_ID },
);

// Stale data con refetch in background — risoluzione immediata da cache
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [RICAMBIO_ID],
    listQuery: q({ data: [{ id: RICAMBIO_ID }], isFetching: true, status: "success" }),
  }),
  { kind: "open_from_list", id: RICAMBIO_ID },
);

// Già consumato
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: RICAMBIO_ID,
    consumedOpenId: RICAMBIO_ID,
    inFlight: false,
    prodottiIds: [RICAMBIO_ID],
    listQuery: q({ data: [{ id: RICAMBIO_ID }], status: "success" }),
  }),
  { kind: "idle" },
);

// Nessun openId
assert.deepEqual(
  planOpenRicambioDeepLinkStep({
    openId: null,
    consumedOpenId: null,
    inFlight: false,
    prodottiIds: [],
    listQuery: q({ data: [] }),
  }),
  { kind: "idle" },
);

const sampleRow: MagazzinoRicambioRow = {
  id: RICAMBIO_ID,
  codice: "QR-TEST-01",
  nome: "Filtro olio",
  marca: "Bosch",
  quantita: 3,
  costo: 10,
  prezzo_vendita: 15,
  consumo_medio_mensile: null,
  meta: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const uiFromGetById = ricambioUiFromMagazzinoRow(sampleRow, "Operatore");
assert.equal(uiFromGetById.id, RICAMBIO_ID);
assert.equal(uiFromGetById.marca, "Bosch");
assert.equal(uiFromGetById.descrizione, "Filtro olio");
assert.equal(uiFromGetById.scorta, 3);
assert.ok(uiFromGetById.codiceFornitoreOriginale);

console.log("open-ricambio-deeplink-phase.test.ts OK");
