import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPreventivoAnalisiEconomicaReport,
  lossReasonLabel,
  margineTierClass,
  profittoDirezioneLabel,
} from "@/lib/preventivi/preventivo-analisi-economica";
import { computePreventivoProfitto, resolveMargineTier } from "@/lib/preventivi/preventivo-profitto";
import type { PreventivoRecord } from "@/lib/preventivi/types";

test("buildPreventivoAnalisiEconomicaReport — mapping senza ricalcolo", () => {
  const preventivo: Pick<PreventivoRecord, "totaleFinale" | "manodopera" | "righeRicambi" | "numero" | "cliente" | "macchinaRiassunto" | "stato" | "dataCreazione" | "lavorazioneId"> = {
    numero: "P-100",
    cliente: "Cliente Test",
    macchinaRiassunto: "CAT 320",
    stato: "inviato",
    dataCreazione: "2026-01-15",
    lavorazioneId: "lav-1",
    totaleFinale: 500,
    manodopera: { oreTotali: 10, righeAddetti: [], costoOrario: 30, prezzoOrario: 50, scontoPercent: 0 },
    righeRicambi: [],
  };
  const profittoResult = computePreventivoProfitto({ preventivo, bundle: null });
  const report = buildPreventivoAnalisiEconomicaReport({
    preventivoMeta: {
      preventivo,
      lavorazioneCodice: "LAV-001",
      lavorazioneStato: "in_corso",
    },
    profittoResult,
    metadata: {
      generatedAt: "2026-02-01T10:00:00.000Z",
      generatedBy: "Test",
      version: "1",
    },
  });

  assert.equal(report.header.numeroPreventivo, "P-100");
  assert.equal(report.header.importoCliente, profittoResult.summary.ricavoFinale);
  assert.equal(report.summary.profitto, profittoResult.summary.profitto);
  assert.equal(report.breakdown.manodopera.ricavo, profittoResult.breakdown.manodopera.ricavo);
  assert.equal(report.indicatori.lossReason, profittoResult.indicatori.lossReason);
  assert.equal(report.costiPerCategoria.length, 3);
  assert.equal(report.metadata.generatedBy, "Test");
});

test("margine tier e label helper", () => {
  assert.equal(resolveMargineTier(40), "verde");
  assert.equal(resolveMargineTier(20), "giallo");
  assert.equal(resolveMargineTier(10), "rosso");
  assert.match(margineTierClass("verde"), /emerald/);
  assert.equal(profittoDirezioneLabel("utile"), "Utile");
  assert.equal(lossReasonLabel("entrambi"), "Perdita dovuta a manodopera e ricambi");
});

test("scostamenti ore nel confronto", () => {
  const preventivo: Pick<PreventivoRecord, "totaleFinale" | "manodopera" | "righeRicambi"> = {
    totaleFinale: 200,
    manodopera: { oreTotali: 8, righeAddetti: [], costoOrario: 25, prezzoOrario: 40, scontoPercent: 0 },
    righeRicambi: [],
  };
  const bundle = {
    lavorazioneId: "lav-1",
    ingresso: null,
    ricambi: null,
    lavorazioni: {
      tipo: "lavorazioni" as const,
      sorgente: "generata" as const,
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
            addettiAssegnati: [{ addettoId: "a1", addetto: "", oreImpiegate: 5 }],
          },
        ],
      },
    },
  };
  const result = computePreventivoProfitto({ preventivo, bundle });
  assert.equal(result.confronto.ore.preventivato, 8);
  assert.equal(result.confronto.ore.reale, 5);
  assert.equal(result.confronto.ore.scostamento, -3);
});
