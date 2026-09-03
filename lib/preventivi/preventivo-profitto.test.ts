import assert from "node:assert/strict";
import { test } from "node:test";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  computePreventivoProfitto,
  oreLavoroPerCostoPreventivo,
  profittoBreakdownFromResult,
} from "@/lib/preventivi/preventivo-profitto";
import { costoUnitarioAcquistoRicambio } from "@/lib/preventivi/preventivo-ricambio-costo";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

function stubRicambio(partial: Partial<RicambioMagazzino> & Pick<RicambioMagazzino, "id">): RicambioMagazzino {
  return {
    marca: "CAT",
    codiceFornitoreOriginale: "OE-1",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 1,
    scortaMinima: 0,
    dataUltimaModifica: "",
    autoreUltimaModifica: "",
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

const bundle4h: LavorazioneSchedeBundle = {
  lavorazioneId: "lav-1",
  ingresso: null,
  ricambi: null,
  lavorazioni: {
    tipo: "lavorazioni",
    sorgente: "generata",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    fileEsterno: null,
    campi: {
      identificazioneMacchina: "",
      righe: [
        {
          id: "r1",
          dataLavorazione: "2026-01-01",
          lavorazioniEffettuate: "Test",
          addettiAssegnati: [
            { addettoId: "a1", addetto: "", oreImpiegate: 2 },
            { addettoId: "a2", addetto: "", oreImpiegate: 2 },
          ],
        },
      ],
    },
  },
};

test("costoUnitarioAcquistoRicambio — primo alternativo netto", () => {
  const r = stubRicambio({
    id: "r-alt",
    fornitoriAlternativi: [{ id: "fa1", fornitore: "F", produttore: "P", codice: "ALT", prezzo: 100, sconto: 10 }],
  });
  assert.equal(costoUnitarioAcquistoRicambio(r), 90);
});

test("costoUnitarioAcquistoRicambio — listino OE se nessun alternativo", () => {
  const r = stubRicambio({
    id: "r-oe",
    prezzoFornitoreOriginale: 80,
    scontoFornitoreOriginale: 0,
  });
  assert.equal(costoUnitarioAcquistoRicambio(r), 80);
});

test("oreLavoroPerCostoPreventivo — scheda poi fallback preventivo", () => {
  const p = {
    manodopera: { oreTotali: 5, righeAddetti: [], costoOrario: 30, prezzoOrario: 50, scontoPercent: 0 },
  };
  assert.equal(oreLavoroPerCostoPreventivo(p, bundle4h), 4);
  assert.equal(oreLavoroPerCostoPreventivo(p, null), 5);
});

test("computePreventivoProfitto — manodopera e margine su ricavi", () => {
  const preventivo: Pick<PreventivoRecord, "totaleFinale" | "manodopera" | "righeRicambi"> = {
    totaleFinale: 500,
    manodopera: { oreTotali: 10, righeAddetti: [], costoOrario: 30, prezzoOrario: 50, scontoPercent: 0 },
    righeRicambi: [],
  };
  const r = profittoBreakdownFromResult(computePreventivoProfitto({ preventivo, bundle: bundle4h }));
  assert.equal(r.costiManodopera, 120);
  assert.equal(r.costiRicambi, 0);
  assert.equal(r.costi, 120);
  assert.equal(r.profitto, 380);
  assert.equal(r.marginePercent, 76);
});

test("computePreventivoProfitto — ricambio magazzino e fuori magazzino", () => {
  const mag = stubRicambio({
    id: "mag-1",
    prezzoFornitoreOriginale: 40,
    scontoFornitoreOriginale: 0,
  });
  const preventivo: Pick<PreventivoRecord, "totaleFinale" | "manodopera" | "righeRicambi"> = {
    totaleFinale: 200,
    manodopera: { oreTotali: 0, righeAddetti: [], costoOrario: 30, prezzoOrario: 50, scontoPercent: 0 },
    righeRicambi: [
      {
        id: "pr1",
        ricambioId: "mag-1",
        codiceOE: "OE",
        descrizione: "In mag",
        quantita: 2,
        prezzoUnitario: 60,
        scontoPercent: 0,
      },
      {
        id: "pr2",
        ricambioId: null,
        codiceOE: "FREE",
        descrizione: "Libero",
        quantita: 1,
        prezzoUnitario: 25,
        scontoPercent: 0,
      },
    ],
  };
  const r = profittoBreakdownFromResult(
    computePreventivoProfitto({
      preventivo,
      bundle: null,
      magazzinoById: new Map([["mag-1", mag]]),
    }),
  );
  assert.equal(r.costiRicambi, 80);
  assert.equal(r.profitto, 120);
  assert.equal(r.marginePercent, 60);
});

test("computePreventivoProfitto — caso deterministico manodopera + ricambi", () => {
  const preventivo: Pick<
    PreventivoRecord,
    | "totaleFinale"
    | "manodopera"
    | "righeRicambi"
    | "sanificazioneOre"
    | "sanificazionePrezzo"
    | "collaudoOre"
    | "collaudoPrezzo"
  > = {
    totaleFinale: 666.6,
    manodopera: { oreTotali: 10, righeAddetti: [], costoOrario: 30, prezzoOrario: 50, scontoPercent: 0 },
    righeRicambi: [
      {
        id: "pr-cost",
        ricambioId: null,
        codiceOE: "R1",
        descrizione: "Ricambio test",
        quantita: 1,
        prezzoUnitario: 160,
        costoUnitario: 100,
        scontoPercent: 0,
      },
    ],
    sanificazioneOre: 0,
    sanificazionePrezzo: 0,
    collaudoOre: 0,
    collaudoPrezzo: 0,
  };
  const result = computePreventivoProfitto({ preventivo, bundle: null });
  assert.equal(result.breakdown.manodopera.totale.costo, 300);
  assert.equal(result.breakdown.manodopera.totale.ricavo, 500);
  assert.equal(result.breakdown.manodopera.totale.profitto, 200);
  assert.equal(result.breakdown.ricambi.totale.costo, 100);
  assert.equal(result.breakdown.ricambi.totale.ricavo, 160);
  assert.equal(result.breakdown.ricambi.totale.profitto, 60);
  assert.equal(result.summary.costi, 400);
  assert.equal(result.summary.profitto, 266.6);
  assert.ok(
    result.summary.margine != null && Math.abs(result.summary.margine - 39.99) < 0.1,
    `margine % atteso ~40, got ${result.summary.margine}`,
  );
});
