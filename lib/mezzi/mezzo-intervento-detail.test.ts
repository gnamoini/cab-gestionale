import assert from "node:assert/strict";
import { buildInterventoDetailFromBundle } from "@/lib/mezzi/mezzo-intervento-detail";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const intervento: MezzoInterventoLavorazione = {
  id: "lav-2",
  origine: "storico",
  codice: "26-0002",
  dataIngresso: "2026-02-01",
  dataCompletamento: "2026-02-03",
  durataGiorniLabel: "2 giorni",
  durataGiorniNum: 2,
  tipoIntervento: "Completata",
  descrizione: "Test",
  prioritaLabel: "Media",
  statoFinale: "Completata",
};

const preventivi = [
  {
    id: "pv-1",
    numero: "P-001",
    stato: "approvato",
    totaleFinale: 500,
    lavorazioneId: "lav-1",
  } as PreventivoRecord,
  {
    id: "pv-2",
    numero: "P-002",
    stato: "rifiutato",
    totaleFinale: 300,
    lavorazioneId: "lav-2",
  } as PreventivoRecord,
];

const detail = buildInterventoDetailFromBundle({
  intervento,
  bundle: {
    lavorazioneId: "lav-2",
    ingresso: null,
    lavorazioni: {
      tipo: "lavorazioni",
      campi: {
        righe: [
          {
            id: "r1",
            dataLavorazione: "2026-02-02",
            lavorazioniEffettuate: "Sostituzione",
            addettiAssegnati: [{ addetto: "Mario Rossi", oreImpiegate: 4 }],
          },
        ],
      },
    } as never,
    ricambi: { tipo: "ricambi", campi: { righe: [{ id: "x" }, { id: "y" }] } } as never,
  },
  movimenti: [],
  preventivi,
  prevInterventoId: "lav-1",
});

assert.equal(detail.oreTotali, 4);
assert.equal(detail.ricambiCount, 2);
assert.equal(detail.preventivo?.stato, "rifiutato");
assert.equal(detail.preventivoPrecedente?.stato, "approvato");

console.log("mezzo-intervento-detail: ok");
