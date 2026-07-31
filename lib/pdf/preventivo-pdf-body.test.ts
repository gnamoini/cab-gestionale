import assert from "node:assert/strict";
import {
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoOggettoInterventoPdfFields,
  buildPreventivoSchedaIngressoAttrezzaturaPdfFields,
  buildPreventivoSchedaIngressoTelaioPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
} from "@/lib/pdf/preventivo-pdf-layout";
import { compactFieldRowCount, padPdfFieldsToEqualRows, tripleFieldRowCount } from "@/lib/pdf/gestionale-section-table";
import {
  buildLavorazioniEffettuatePdfRows,
  buildManodoperaPdfRows,
  buildPreventivoPdfNettoFields,
  buildPreventivoPdfRiepilogoFields,
  buildRicambiPdfRows,
  computeManodoperaSectionTotal,
} from "@/lib/pdf/preventivo-pdf-body";
import type { PreventivoRigaOutput } from "@/lib/preventivi/preventivi-struttura";
import {
  PREVENTIVO_SANIFICAZIONE_DESCRIZIONE,
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

const attFields = buildPreventivoSchedaIngressoAttrezzaturaPdfFields(basePreventivo);
assert.ok(attFields.some((f) => f.label === "Marca" && f.value === "CAT"));
assert.ok(attFields.some((f) => f.label === "Modello" && f.value === "320"));
assert.ok(attFields.some((f) => f.label === "Matricola" && f.value === "MAT-001"));
assert.ok(attFields.some((f) => f.label === "N. scuderia" && f.value === "12"));
assert.equal(attFields.some((f) => f.label === "Ore lavoro motore"), false);
assert.equal(attFields.some((f) => f.label === "Targa"), false);

const telaioFields = buildPreventivoSchedaIngressoTelaioPdfFields(basePreventivo);
assert.ok(telaioFields.some((f) => f.label === "Targa" && f.value === "AA111BB"));
assert.equal(telaioFields.some((f) => f.label === "KM"), false);
assert.equal(telaioFields.some((f) => f.label === "Macchina"), false);

const fullTelaio = buildPreventivoSchedaIngressoTelaioPdfFields({
  ...basePreventivo,
  tipoTelaio: "Gomma",
  marcaTelaio: "Iveco",
  modelloTelaio: "Daily",
  km: "12000",
  livelloCarburante: "1/2",
} as PreventivoRecord);
assert.ok(fullTelaio.some((f) => f.label === "Marca telaio" && f.value === "Iveco"));
assert.equal(fullTelaio.some((f) => f.label === "KM"), false);

const oggettoMerged = buildPreventivoOggettoInterventoPdfFields({
  ...basePreventivo,
  tipoTelaio: "Gomma",
  marcaTelaio: "Iveco",
} as PreventivoRecord);
assert.ok(oggettoMerged.some((f) => f.label === "Marca" && f.value === "CAT"));
assert.ok(oggettoMerged.some((f) => f.label === "Marca telaio" && f.value === "Iveco"));
assert.ok(
  tripleFieldRowCount(oggettoMerged.length) < compactFieldRowCount(oggettoMerged.length),
  "griglia 3 colonne usa meno righe della griglia 2 colonne",
);

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

const lavFromCliente = buildLavorazioniEffettuatePdfRows({
  descrizioneLavorazioniCliente: "- Sostituzione filtro\n- Controllo idraulico",
} as PreventivoRecord);
assert.deepEqual(lavFromCliente, [
  [PREVENTIVO_SANIFICAZIONE_DESCRIZIONE],
  ["Sostituzione filtro"],
  ["Controllo idraulico"],
]);

const lavOnlySanificazione = buildLavorazioniEffettuatePdfRows({
  descrizioneLavorazioniCliente: "",
} as PreventivoRecord);
assert.deepEqual(lavOnlySanificazione, [[PREVENTIVO_SANIFICAZIONE_DESCRIZIONE]]);

const lavIgnoresTechnicalResidue = buildLavorazioniEffettuatePdfRows({
  descrizioneLavorazioniCliente: "- Sostituzione filtro",
  descrizioneLavorazioniTecnicaSorgente:
    "Smontaggio motore\nSostituzione guarnizioni\nRimontaggio motore",
} as PreventivoRecord);
assert.deepEqual(lavIgnoresTechnicalResidue, [
  [PREVENTIVO_SANIFICAZIONE_DESCRIZIONE],
  ["Sostituzione filtro"],
]);
assert.equal(lavIgnoresTechnicalResidue.some((row) => row[0] === "Smontaggio motore"), false);

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
const manRows = buildManodoperaPdfRows(manodoperaRighe);
assert.equal(manRows.length, 2);
assert.equal(manRows[1]?.[1], "—");

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

const economicsRiepilogo = buildPreventivoPdfRiepilogoFields({
  totaleRicambi: 100,
  totaleManodopera: 200,
  totaleSmaltimento: 0,
  totaleNetto: 300,
  importoIva: 66,
  totaleConIva: 366,
  ivaPercent: 22,
});

assert.equal(economicsRiepilogo.length, 3);
assert.equal(economicsRiepilogo[0]?.label, "TOTALE NETTO (senza IVA)");
assert.equal(economicsRiepilogo[1]?.label, "TOTALE IVA (22%)");
assert.equal(economicsRiepilogo[2]?.label, "TOTALE DOCUMENTO");

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
