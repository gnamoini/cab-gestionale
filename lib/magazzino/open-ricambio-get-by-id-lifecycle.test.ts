import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  applyOpenRicambioGetByIdResult,
  createOpenRicambioGetByIdGenerationGate,
} from "@/lib/magazzino/open-ricambio-get-by-id-lifecycle";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { err, success } from "@/src/services/service-result";

const emptyMezziListe: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
};

const RICAMBIO_ID = "ric-uuid-gen-test";

const sampleRow: MagazzinoRicambioRow = {
  id: RICAMBIO_ID,
  codice: "GEN-01",
  nome: "Filtro",
  marca: "Bosch",
  quantita: 2,
  costo: 5,
  prezzo_vendita: 10,
  consumo_medio_mensile: null,
  meta: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// attempt A cancellato non modifica stato
{
  const gate = createOpenRicambioGetByIdGenerationGate();
  const genA = gate.beginAttempt();
  let successCalls = 0;
  let failureCalls = 0;
  gate.invalidate();
  const outcome = applyOpenRicambioGetByIdResult({
    attemptGen: genA,
    gate,
    ricambioId: RICAMBIO_ID,
    res: success(sampleRow),
    listQueryIsError: false,
    queryClient: new QueryClient(),
    listQueryKey: magazzinoListQueryKey(),
    mezziListe: emptyMezziListe,
    authorName: "Test",
    onSuccess: () => {
      successCalls += 1;
    },
    onFailure: () => {
      failureCalls += 1;
    },
  });
  assert.equal(outcome, null);
  assert.equal(successCalls, 0);
  assert.equal(failureCalls, 0);
}

// A cancellato → B parte → risposta A ignorata → risposta B applicata
{
  const gate = createOpenRicambioGetByIdGenerationGate();
  const qc = new QueryClient();
  const listKey = magazzinoListQueryKey();
  qc.setQueryData(listKey, []);

  const genA = gate.beginAttempt();
  gate.invalidate();
  const genB = gate.beginAttempt();

  const successIds: string[] = [];
  const apply = (gen: number, codice: string) =>
    applyOpenRicambioGetByIdResult({
      attemptGen: gen,
      gate,
      ricambioId: RICAMBIO_ID,
      res: success({ ...sampleRow, codice }),
      listQueryIsError: false,
      queryClient: qc,
      listQueryKey: listKey,
      mezziListe: emptyMezziListe,
      authorName: "Operatore",
      onSuccess: (id) => {
        successIds.push(id);
      },
      onFailure: () => {
        throw new Error("unexpected failure");
      },
    });

  const outcomeA = apply(genA, "STALE");
  assert.equal(outcomeA, null);
  assert.deepEqual(successIds, []);

  const outcomeB = apply(genB, "GEN-01");
  assert.equal(outcomeB, "success");
  assert.deepEqual(successIds, [RICAMBIO_ID]);

  const cached = qc.getQueryData<MagazzinoRicambioRow[]>(listKey);
  assert.ok(cached?.some((r) => r.id === RICAMBIO_ID));
  assert.equal(cached?.find((r) => r.id === RICAMBIO_ID)?.codice, "GEN-01");
}

// B not found
{
  const gate = createOpenRicambioGetByIdGenerationGate();
  const gen = gate.beginAttempt();
  let failureOutcome = "";
  const outcome = applyOpenRicambioGetByIdResult({
    attemptGen: gen,
    gate,
    ricambioId: RICAMBIO_ID,
    res: err("Ricambio non trovato"),
    listQueryIsError: false,
    queryClient: new QueryClient(),
    listQueryKey: magazzinoListQueryKey(),
    mezziListe: emptyMezziListe,
    authorName: "Test",
    onSuccess: () => {
      throw new Error("unexpected success");
    },
    onFailure: (_id, o) => {
      failureOutcome = o;
    },
  });
  assert.equal(outcome, "not_found");
  assert.equal(failureOutcome, "not_found");
}

console.log("open-ricambio-get-by-id-lifecycle.test.ts OK");
