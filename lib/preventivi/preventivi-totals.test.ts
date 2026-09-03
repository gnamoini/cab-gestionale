import assert from "node:assert/strict";
import { test } from "node:test";
import { calcolaTotaliPreventivo, totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const baseManodopera = {
  oreTotali: 10,
  righeAddetti: [],
  costoOrario: 30,
  prezzoOrario: 50,
  scontoPercent: 0,
};

test("totaleNettoRigaRicambio — sconto percentuale", () => {
  assert.equal(totaleNettoRigaRicambio({ quantita: 2, prezzoUnitario: 100, scontoPercent: 10 }), 180);
});

test("calcolaTotaliPreventivo — manodopera e ricambi", () => {
  const p: Pick<
    PreventivoRecord,
    "righeRicambi" | "manodopera" | "sanificazioneOre" | "sanificazionePrezzo" | "collaudoOre" | "collaudoPrezzo"
  > = {
    righeRicambi: [
      {
        id: "r1",
        ricambioId: null,
        codiceOE: "X",
        descrizione: "Ricambio",
        quantita: 1,
        prezzoUnitario: 160,
        scontoPercent: 0,
      },
    ],
    manodopera: baseManodopera,
    sanificazioneOre: 0,
    sanificazionePrezzo: 0,
    collaudoOre: 0,
    collaudoPrezzo: 0,
  };
  const t = calcolaTotaliPreventivo(p);
  assert.equal(t.totaleManodopera, 500);
  assert.equal(t.totaleRicambi, 160);
  const nettoSenzaSmaltimento = 660;
  assert.equal(t.totaleSmaltimento, Math.round(nettoSenzaSmaltimento * 0.01 * 100) / 100);
  assert.equal(t.totaleFinale, Math.round((nettoSenzaSmaltimento + t.totaleSmaltimento) * 100) / 100);
});

test("calcolaTotaliPreventivo — fallback prezzoOrario da costoOrario", () => {
  const t = calcolaTotaliPreventivo({
    righeRicambi: [],
    manodopera: { ...baseManodopera, prezzoOrario: 0 },
    sanificazioneOre: 0,
    sanificazionePrezzo: 0,
    collaudoOre: 0,
    collaudoPrezzo: 0,
  });
  assert.equal(t.totaleManodopera, 300);
});

test("calcolaTotaliPreventivo — sconto manodopera", () => {
  const t = calcolaTotaliPreventivo({
    righeRicambi: [],
    manodopera: { ...baseManodopera, scontoPercent: 10 },
    sanificazioneOre: 0,
    sanificazionePrezzo: 0,
    collaudoOre: 0,
    collaudoPrezzo: 0,
  });
  assert.equal(t.totaleManodopera, 450);
});

console.log("preventivi-totals.test.ts OK");
