import assert from "node:assert/strict";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import {
  ATTESA_RICAMBI_LATE_INGRESS_WEIGHT,
  ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS,
  computeInactiveLavorazioniCriticality,
  computeSottoScortaCriticality,
  estimateDaysUnderMinimum,
  isAttesaRicambiStato,
  lateIngressWeight,
  sottoScortaDurationWeight,
  stagnationThresholdDays,
} from "@/lib/dashboard/operational-health-criticality";

const anchor = new Date("2026-07-13T12:00:00.000Z");

function ricambio(partial: Partial<RicambioMagazzino> & Pick<RicambioMagazzino, "id">): RicambioMagazzino {
  return {
    marca: "",
    codiceFornitoreOriginale: "",
    descrizione: "",
    scorta: partial.scorta ?? 1,
    scortaMinima: partial.scortaMinima ?? 5,
    dataUltimaModifica: partial.dataUltimaModifica ?? "2026-07-13T08:00:00.000Z",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    categoria: "",
    note: "",
    compatibilitaMezzi: [],
    fornitoriAlternativi: [],
    usatoInTagliandi: false,
    unitaMisura: "pz",
    ...partial,
  } as RicambioMagazzino;
}

function logEntry(partial: Partial<MagazzinoChangeLogEntry> & Pick<MagazzinoChangeLogEntry, "id" | "ricambioId">): MagazzinoChangeLogEntry {
  return {
    tipo: "update",
    ricambio: "R1",
    autore: "Test",
    at: "2026-07-01T10:00:00.000Z",
    riepilogo: "",
    changes: [],
    annullato: false,
    ...partial,
  };
}

assert.equal(sottoScortaDurationWeight(0.1), 0, "few hours should be negligible");
assert.ok(sottoScortaDurationWeight(21) > sottoScortaDurationWeight(1), "weeks weigh more than hours");

const recent = estimateDaysUnderMinimum(
  ricambio({ id: "r1", scorta: 1, scortaMinima: 5, dataUltimaModifica: "2026-07-13T08:00:00.000Z" }),
  [],
  anchor,
);
assert.ok(recent < 1, "recent under-stock should be under one day");

const longUnder = estimateDaysUnderMinimum(
  ricambio({ id: "r2", scorta: 0, scortaMinima: 4 }),
  [
    logEntry({
      id: "l1",
      ricambioId: "r2",
      at: "2026-06-20T10:00:00.000Z",
      changes: [{ campo: "Scorta", prima: "4", dopo: "0" }],
    }),
  ],
  anchor,
);
assert.ok(longUnder >= 20, "log crossing should yield multi-week duration");

const crit = computeSottoScortaCriticality(
  [
    ricambio({ id: "a", scorta: 1, scortaMinima: 5, dataUltimaModifica: "2026-07-13T10:00:00.000Z" }),
    ricambio({ id: "b", scorta: 0, scortaMinima: 3, dataUltimaModifica: "2026-06-01T10:00:00.000Z" }),
  ],
  [
    logEntry({
      id: "l2",
      ricambioId: "b",
      at: "2026-06-01T10:00:00.000Z",
      changes: [{ campo: "Scorta", prima: "3", dopo: "0" }],
    }),
  ],
  anchor,
);
assert.equal(crit.count, 2);
assert.ok(crit.weightedSeverity > sottoScortaDurationWeight(0.2), "mixed durations increase severity");

assert.equal(isAttesaRicambiStato("attesa_ricambi"), true);
assert.equal(isAttesaRicambiStato("accettazione"), false);
assert.ok(
  stagnationThresholdDays(3, { attesaRicambi: true }) >= ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS,
  "attesa ricambi: soglia almeno grace fornitore",
);
assert.ok(
  stagnationThresholdDays(3, { attesaRicambi: true }) > stagnationThresholdDays(3),
  "attesa ricambi più tollerante della soglia base",
);

function lav(partial: Partial<LavorazioneListRow> & Pick<LavorazioneListRow, "id" | "stato">): LavorazioneListRow {
  return {
    id: partial.id,
    stato: partial.stato,
    created_at: partial.created_at ?? "2026-07-01T10:00:00.000Z",
    updated_at: partial.updated_at ?? partial.created_at ?? "2026-07-01T10:00:00.000Z",
    deleted_at: null,
    cliente: "C",
    macchina: "M",
    priorita: "media",
  } as unknown as LavorazioneListRow;
}

const stati = [
  { id: "attesa_ricambi", label: "Attesa ricambi" },
  { id: "accettazione", label: "Accettazione" },
];

// Outlier lungo vs peer freschi: excess attesa ricambi soft rispetto ad accettazione.
const ricambiInactive = computeInactiveLavorazioniCriticality(
  [
    lav({ id: "r-old", stato: "attesa_ricambi", updated_at: "2026-05-01T10:00:00.000Z" }),
    lav({ id: "r-new1", stato: "attesa_ricambi", updated_at: "2026-07-12T10:00:00.000Z" }),
    lav({ id: "r-new2", stato: "attesa_ricambi", updated_at: "2026-07-11T10:00:00.000Z" }),
  ],
  anchor,
  stati,
);
const accettazioneInactive = computeInactiveLavorazioniCriticality(
  [
    lav({ id: "a-old", stato: "accettazione", updated_at: "2026-05-01T10:00:00.000Z" }),
    lav({ id: "a-new1", stato: "accettazione", updated_at: "2026-07-12T10:00:00.000Z" }),
    lav({ id: "a-new2", stato: "accettazione", updated_at: "2026-07-11T10:00:00.000Z" }),
  ],
  anchor,
  stati,
);
assert.equal(ricambiInactive.count, 1);
assert.equal(accettazioneInactive.count, 1);
assert.ok(
  ricambiInactive.weightedExcessDays < accettazioneInactive.weightedExcessDays,
  "stesso outlier: attesa ricambi pesa meno (fornitori)",
);
assert.ok(
  ricambiInactive.weightedExcessDays <= 0.3 + 1e-9,
  "excess attesa ricambi capped soft (≤0.3 per mezzo)",
);

assert.equal(
  lateIngressWeight(
    lav({ id: "late-acc", stato: "accettazione", created_at: "2026-05-01T10:00:00.000Z" }),
    anchor,
    stati,
  ),
  1,
  "ritardo ingresso in accettazione: peso pieno",
);
assert.equal(
  lateIngressWeight(
    lav({
      id: "late-ricambi-recent",
      stato: "attesa_ricambi",
      created_at: "2026-05-01T10:00:00.000Z",
      updated_at: "2026-07-10T10:00:00.000Z",
    }),
    anchor,
    stati,
  ),
  1,
  "attesa ricambi sotto grace fornitore: peso pieno",
);
assert.equal(
  lateIngressWeight(
    lav({
      id: "late-ricambi-old",
      stato: "attesa_ricambi",
      created_at: "2026-05-01T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z",
    }),
    anchor,
    stati,
  ),
  ATTESA_RICAMBI_LATE_INGRESS_WEIGHT,
  "attesa ricambi oltre grace fornitore: peso soft",
);

console.log("operational-health-criticality.test: OK");
