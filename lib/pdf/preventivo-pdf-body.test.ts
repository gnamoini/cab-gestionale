import assert from "node:assert/strict";
import {
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
} from "@/lib/pdf/preventivo-pdf-layout";
import { padPdfFieldsToEqualRows } from "@/lib/pdf/gestionale-section-table";
import {
  buildLavorazioniEffettuatePdfRows,
  buildManodoperaPdfRows,
  buildPreventivoPdfNettoFields,
  buildRicambiPdfRows,
  computeManodoperaSectionTotal,
} from "@/lib/pdf/preventivo-pdf-body";
import type { PreventivoRigaOutput } from "@/lib/preventivi/preventivi-struttura";
import {
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
} from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const basePreventivo = {
  marcaAttrezzatura: "CAT",
  modelloAttrezzatura: "320",
  matricola: "MAT-001",
  nScuderia: "12",
  targa: "AA111BB",
  macchinaRiassunto: "CAT 320",
} as PreventivoRecord;

const attFields = buildPreventivoAttrezzaturaPdfFields(basePreventivo);
assert.ok(attFields.some((f) => f.label === "Marca" && f.value === "CAT"));
assert.ok(attFields.some((f) => f.label === "Modello" && f.value === "320"));
assert.ok(attFields.some((f) => f.label === "Matricola" && f.value === "MAT-001"));
assert.ok(attFields.some((f) => f.label === "N. scuderia" && f.value === "12"));
assert.equal(attFields.some((f) => f.label === "Targa"), false);

const telaioFields = buildPreventivoTelaioMezzoPdfFields(basePreventivo);
assert.ok(telaioFields.some((f) => f.label === "Targa" && f.value === "AA111BB"));
assert.equal(telaioFields.some((f) => f.label === "Macchina"), false);

const fullTelaio = buildPreventivoTelaioMezzoPdfFields({
  ...basePreventivo,
  tipoTelaio: "Gomma",
  marcaTelaio: "Iveco",
  modelloTelaio: "Daily",
  km: "12000",
  livelloCarburante: "1/2",
} as PreventivoRecord);
assert.ok(fullTelaio.some((f) => f.label === "Marca" && f.value === "Iveco"));
assert.ok(fullTelaio.some((f) => f.label === "KM" && f.value === "12000"));

const padded = padPdfFieldsToEqualRows(
  [{ label: "A", value: "1" }],
  [
    { label: "B", value: "2" },
    { label: "C", value: "3" },
  ],
);
assert.equal(padded.left.length, 2);
assert.equal(padded.right.length, 2);
assert.equal(padded.left[1]?.label, "");

const lavFromCliente = buildLavorazioniEffettuatePdfRows(
  {
    descrizioneLavorazioniCliente: "- Sostituzione filtro\n- Controllo idraulico",
  } as PreventivoRecord,
  [],
);
assert.deepEqual(lavFromCliente, [["Sostituzione filtro"], ["Controllo idraulico"]]);

const lavFallback: PreventivoRigaOutput[] = [
  {
    sezione: "lavorazioni",
    ordine: 1,
    descrizione: "Revisione generale",
    quantita: 1,
    prezzoUnitario: 0,
    totale: 0,
  },
];
const lavFromRighe = buildLavorazioniEffettuatePdfRows({ descrizioneLavorazioniCliente: "" } as PreventivoRecord, lavFallback);
assert.deepEqual(lavFromRighe, [["Revisione generale"]]);

const manodoperaRighe: PreventivoRigaOutput[] = [
  {
    sezione: "manodopera",
    ordine: 1,
    descrizione: "Manodopera",
    quantita: 3,
    prezzoUnitario: 45,
    totale: 135,
  },
  {
    sezione: "collaudo",
    ordine: 2,
    descrizione: "Collaudo",
    quantita: 1,
    prezzoUnitario: 80,
    totale: 80,
  },
];

assert.equal(computeManodoperaSectionTotal(manodoperaRighe), 215);
assert.equal(buildManodoperaPdfRows(manodoperaRighe).length, 2);

const ricambiRighe: PreventivoRigaOutput[] = [
  {
    sezione: "ricambi",
    ordine: 1,
    riga: {
      id: "r-1",
      ricambioId: null,
      codiceOE: "FIL-01",
      descrizione: "Filtro olio",
      quantita: 2,
      prezzoUnitario: 25,
      scontoPercent: 10,
      tipo: "standard",
    },
  },
];

assert.equal(buildRicambiPdfRows(ricambiRighe)[0]?.[5], "45,00 €");

const economicsBase = buildPreventivoPdfNettoFields({
  totaleRicambi: 100,
  totaleManodopera: 200,
  totaleSmaltimento: 0,
  totaleNetto: 300,
  importoIva: 66,
  totaleConIva: 366,
  ivaPercent: 22,
});

assert.equal(economicsBase.length, 1);
assert.equal(economicsBase[0]?.label, "TOTALE NETTO (senza IVA)");
assert.equal(economicsBase.some((f) => f.label === "Totale ricambi"), false);
assert.equal(economicsBase.some((f) => f.label === "Totale manodopera"), false);

const economicsSmalt = buildPreventivoPdfNettoFields({
  totaleRicambi: 100,
  totaleManodopera: 200,
  totaleSmaltimento: 15,
  totaleNetto: 315,
  importoIva: 69.3,
  totaleConIva: 384.3,
  ivaPercent: 22,
});

assert.equal(economicsSmalt.length, 2);
assert.equal(
  economicsSmalt[0]?.label,
  `${PREVENTIVO_SMALTIMENTO_DESCRIZIONE} (${PREVENTIVO_SMALTIMENTO_PERCENT}%)`,
);

console.log("preventivo-pdf-body.test.ts: ok");
