import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  oreSchedaAddettoMapFromLavorazioni,
  oreSchedaForPreventivoRigaAddetto,
  oreTotaliFromSchedaAddettoMap,
  righeAddettiFromSchedaLavorazioni,
} from "@/lib/preventivi/righe-addetti-from-scheda-lavorazioni";
import type { SchedaLavorazioniDoc, RigaLavorazioneScheda } from "@/types/schede";

const addettiRecords = [
  { id: "add-1", nome: "Marco", cognome: "Bianchi" },
  { id: "add-2", nome: "Luca", cognome: "" },
] as unknown as AddettoRecord[];

const lavScheda: SchedaLavorazioniDoc = {
  tipo: "lavorazioni",
  sorgente: "generata",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  createdBy: "Test",
  updatedBy: "Test",
  fileEsterno: null,
  campi: {
    identificazioneMacchina: "",
    righe: [
      {
        id: "r1",
        dataLavorazione: "2026-01-10",
        lavorazioniEffettuate: "Riparazione",
        addettiAssegnati: [
          { addettoId: "add-1", addetto: "", oreImpiegate: 3 },
          { addettoId: null, addetto: "Luca", oreImpiegate: 2 },
        ],
      },
      {
        id: "r2",
        dataLavorazione: "2026-01-11",
        lavorazioniEffettuate: "Collaudo",
        addettiAssegnati: [],
        addetto: "Marco Bianchi",
        oreImpiegate: 1.5,
      } as RigaLavorazioneScheda,
    ],
  },
};

test("righeAddettiFromSchedaLavorazioni aggrega id e legacy da scheda", () => {
  const righe = righeAddettiFromSchedaLavorazioni(lavScheda, addettiRecords);
  assert.equal(righe.length, 2);
  const marco = righe.find((r) => r.addettoId === "add-1");
  const luca = righe.find((r) => r.addettoId === "add-2");
  assert.equal(marco?.ore, 4.5);
  assert.equal(luca?.ore, 2);
});

test("oreSchedaAddettoMapFromLavorazioni lookup per riga preventivo", () => {
  const map = oreSchedaAddettoMapFromLavorazioni(lavScheda, addettiRecords);
  assert.ok(map);
  assert.equal(oreTotaliFromSchedaAddettoMap(map), 6.5);
  assert.equal(
    oreSchedaForPreventivoRigaAddetto(map, addettiRecords, { addettoId: "add-1", ore: 0 }),
    4.5,
  );
});
