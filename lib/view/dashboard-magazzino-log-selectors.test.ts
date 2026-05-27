import assert from "node:assert/strict";
import {
  classifyDashboardMagazzinoLog,
  computeDashboardMagFeedFromLogs,
} from "@/lib/view/dashboard-magazzino-log-selectors";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const ricambio: RicambioMagazzino = {
  id: "r1",
  marca: "Bosch",
  codiceFornitoreOriginale: "X1",
  descrizione: "Filtro",
  note: "",
  categoria: "",
  compatibilitaMezzi: [],
  scorta: 5,
  scortaMinima: 0,
  dataUltimaModifica: "2026-01-01T00:00:00.000Z",
  autoreUltimaModifica: "",
  prezzoFornitoreOriginale: 10,
  scontoFornitoreOriginale: 0,
  markupPercentuale: 0,
  prezzoVendita: 12,
  fornitoreNonOriginale: "",
  codiceFornitoreNonOriginale: "",
  prezzoFornitoreNonOriginale: 0,
  scontoFornitoreNonOriginale: 0,
};

const byId = new Map([["r1", ricambio]]);

assert.equal(
  classifyDashboardMagazzinoLog({
    id: "1",
    entita: "magazzino_ricambi",
    entita_id: "r1",
    azione: "UPDATE",
    autore_id: null,
    created_at: "2026-05-27T12:00:00.000Z",
    payload: { before: { quantita: 3 }, after: { quantita: 8 } },
  }),
  "stock",
);

assert.equal(
  classifyDashboardMagazzinoLog({
    id: "2",
    entita: "magazzino_ricambi",
    entita_id: "r1",
    azione: "UPDATE",
    autore_id: null,
    created_at: "2026-05-27T11:00:00.000Z",
    payload: { before: { prezzo_vendita: 10 }, after: { prezzo_vendita: 12 } },
  }),
  "data",
);

assert.equal(
  classifyDashboardMagazzinoLog({
    id: "3",
    entita: "magazzino_ricambi",
    entita_id: "r1",
    azione: "CREATE",
    autore_id: null,
    created_at: "2026-05-27T10:00:00.000Z",
    payload: { snapshot: { id: "r1", nome: "Filtro" } },
  }),
  "data",
);

const movRow: LogModificaRow = {
  id: "m1",
  entita: "movimenti_ricambi",
  entita_id: "mov-1",
  azione: "CREATE",
  autore_id: null,
  created_at: "2026-05-27T13:00:00.000Z",
  payload: { snapshot: { ricambio_id: "r1", tipo: "entrata", quantita: 2 } },
};

assert.equal(classifyDashboardMagazzinoLog(movRow), "stock");

const feed = computeDashboardMagFeedFromLogs(
  [
    {
      id: "2",
      entita: "magazzino_ricambi",
      entita_id: "r1",
      azione: "UPDATE",
      autore_id: null,
      created_at: "2026-05-27T11:00:00.000Z",
      payload: { before: { prezzo_vendita: 10 }, after: { prezzo_vendita: 12 } },
    },
    {
      id: "1",
      entita: "magazzino_ricambi",
      entita_id: "r1",
      azione: "UPDATE",
      autore_id: null,
      created_at: "2026-05-27T12:00:00.000Z",
      payload: { before: { quantita: 3 }, after: { quantita: 8 } },
    },
  ],
  [movRow],
  byId,
);

assert.equal(feed.movements.length, 1);
assert.equal(feed.movements[0]?.tipo, "entrata");
assert.equal(feed.movements[0]?.quantita, 2);
assert.equal(feed.modified.length, 0);

console.log("dashboard-magazzino-log-selectors.test.ts OK");
