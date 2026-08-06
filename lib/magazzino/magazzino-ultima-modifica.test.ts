import assert from "node:assert/strict";
import { test } from "node:test";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  buildUltimaModificaByRicambioIdFromLocalEntries,
  buildUltimaModificaByRicambioIdFromLogs,
  resolveMagazzinoUltimaModifica,
} from "@/lib/magazzino/magazzino-ultima-modifica";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";

function ricambio(partial: Partial<RicambioMagazzino> & Pick<RicambioMagazzino, "id">): RicambioMagazzino {
  return {
    marca: "Marca",
    codiceFornitoreOriginale: "ABC",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Pezzo",
    note: "",
    categoria: "Generale",
    compatibilitaMezzi: [],
    scorta: 1,
    scortaMinima: 0,
    dataUltimaModifica: "2026-01-01T10:00:00.000Z",
    autoreUltimaModifica: "Viewer sbagliato",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
    ...partial,
  };
}

test("log movimento stock vince su meta autore stale", () => {
  const ricId = "11111111-1111-4111-8111-111111111111";
  const logs: LogModificaRow[] = [
    {
      id: "log-1",
      entita: "movimenti_ricambi",
      entita_id: "mov-1",
      azione: "CREATE",
      payload: {
        ricambioId: ricId,
        quantitaBefore: 1,
        quantitaAfter: 2,
      },
      autore_id: "user-b",
      autore_nome_snapshot: "Mario Rossi",
      created_at: "2026-08-05T14:00:00.000Z",
    },
  ];
  const fromLogs = buildUltimaModificaByRicambioIdFromLogs(logs, {
    currentUserId: "user-a",
    currentDisplayName: "Io Viewer",
  });
  const info = resolveMagazzinoUltimaModifica(
    ricambio({
      id: ricId,
      dataUltimaModifica: "2026-08-05T14:00:00.000Z",
      autoreUltimaModifica: "Io Viewer",
    }),
    fromLogs,
  );
  assert.equal(info.autore, "Mario Rossi");
  assert.equal(info.iso, "2026-08-05T14:00:00.000Z");
});

test("entry locale più recente del log server", () => {
  const ricId = "22222222-2222-4222-8222-222222222222";
  const fromLogs = buildUltimaModificaByRicambioIdFromLogs(
    [
      {
        id: "log-old",
        entita: "magazzino_ricambi",
        entita_id: ricId,
        azione: "UPDATE",
        payload: {},
        autore_id: "user-b",
        autore_nome_snapshot: "Mario Rossi",
        created_at: "2026-08-05T10:00:00.000Z",
      },
    ],
    { currentUserId: null, currentDisplayName: "" },
  );
  const fromLocal = buildUltimaModificaByRicambioIdFromLocalEntries([
    {
      id: "local-1",
      tipo: "update",
      ricambioId: ricId,
      ricambio: "Pezzo",
      autore: "Giulia Bianchi",
      at: "2026-08-05T15:00:00.000Z",
      riepilogo: "Scorta",
      changes: [],
      annullato: false,
    } satisfies MagazzinoChangeLogEntry,
  ]);
  const info = resolveMagazzinoUltimaModifica(
    ricambio({ id: ricId, autoreUltimaModifica: "Sistema" }),
    fromLogs,
    fromLocal,
  );
  assert.equal(info.autore, "Giulia Bianchi");
});
