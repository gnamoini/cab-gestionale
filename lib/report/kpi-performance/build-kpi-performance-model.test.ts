import assert from "node:assert/strict";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import { countMezziInOfficinaProxy, disponibilitaFlottaPctProxy } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const range = {
  start: startOfLocalDay(new Date(2025, 2, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};

const mezzo: MezzoGestito = {
  id: "m1",
  marca: "A",
  modello: "B",
  targa: "T1",
  matricola: "M1",
  cliente: "C",
  utilizzatore: "—",
  tipoAttrezzatura: "Spazzatrice",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
};

const attiva: LavorazioneAttiva = {
  id: "lav-open",
  macchina: "A B",
  targa: "T1",
  matricola: "M1",
  nScuderia: "",
  cliente: "C",
  utilizzatore: "—",
  cantiere: "",
  statoId: "in_lavorazione",
  priorita: "media",
  addetto: "—",
  noteInterne: "",
  dataIngresso: "2025-01-01T10:00:00.000Z",
  dataCompletamento: null,
};

const completata: LavorazioneArchiviata = {
  id: "lav-done",
  mezzoId: "m1",
  macchina: "A B",
  targa: "T1",
  matricola: "M1",
  nScuderia: "",
  cliente: "C",
  utilizzatore: "—",
  cantiere: "",
  addetto: "—",
  noteInterne: "",
  statoFinaleId: "completata",
  prioritaFinale: "media",
  dataIngresso: "2025-03-05T10:00:00.000Z",
  dataCompletamento: "2025-03-10T12:00:00.000Z",
  meseCompletamento: "2025-03",
};

const lavRowOpen: LavorazioneListRow = {
  id: "lav-open",
  mezzo_id: "m1",
  stato: "in_lavorazione",
  priorita: "media",
  data_ingresso: "2025-01-01T10:00:00.000Z",
  data_uscita: null,
  note: "",
  created_at: "2025-01-01T10:00:00.000Z",
  updated_at: "2025-01-01T10:00:00.000Z",
  archived: false,
  archived_at: null,
  deleted_at: null,
  codice: null,
  created_by: null,
  mezzo: {
    id: "m1",
    cliente: "C",
    marca: "A",
    modello: "B",
    targa: "T1",
    matricola: "M1",
    numero_scuderia: null,
    utilizzatore: null,
    tipo_attrezzatura: null,
    anno: null,
    meta: null,
    entity_key: null,
    created_at: "",
    updated_at: "",
  },
};

const ricambio: RicambioMagazzino = {
  id: "r1",
  marca: "X",
  codiceFornitoreOriginale: "C1",
  codiceFornitoreOriginaleSecondario: "",
  descrizione: "Filtro",
  note: "",
  categoria: "",
  compatibilitaMezzi: [],
  scorta: 2,
  scortaMinima: 5,
  dataUltimaModifica: "2026-01-01",
  autoreUltimaModifica: "",
  prezzoFornitoreOriginale: 10,
  scontoFornitoreOriginale: 0,
  markupPercentuale: 0,
  prezzoVendita: 12,
  fornitoreNonOriginale: "",
  codiceFornitoreNonOriginale: "",
  prezzoFornitoreNonOriginale: 0,
  scontoFornitoreNonOriginale: 0,
};

const magLog: MagazzinoChangeLogEntry[] = [
  {
    id: "l1",
    tipo: "update",
    ricambioId: "r1",
    ricambio: "",
    autore: "t",
    at: "2025-03-15T12:00:00.000Z",
    riepilogo: "",
    changes: [{ campo: "Scorta", prima: "10", dopo: "7" }],
    annullato: false,
  },
];

const semanticIndex = buildReportSemanticIndex({
  completate: [completata],
  mezzi: [mezzo],
});

assert.equal(countMezziInOfficinaProxy([mezzo], [lavRowOpen]), 1);
assert.equal(disponibilitaFlottaPctProxy([mezzo], [lavRowOpen]), 0);

const model = buildKpiPerformanceModel({
  anchor: range.end,
  range,
  compareRange: null,
  attive: [attiva],
  completate: [completata],
  mezzi: [mezzo],
  magazzino: [ricambio],
  magLog,
  magazzinoRows: [{ id: "r1", costo: 10 } as import("@/src/types/supabase-tables").MagazzinoRicambioRow],
  lavRows: [lavRowOpen],
  semanticIndex,
  schedeStore: null,
  schedeLoaded: true,
  costoOrario: 35,
});

assert.equal(model.operational.openCount, 1);
assert.equal(model.operational.closedInPeriod, 1);
assert.equal(model.fleet.mezziInOfficina, 1);
assert.equal(model.economic.ricambiCostPeriod, 30);
assert.ok(model.alerts.some((a) => a.id === "open-late"));
assert.ok(model.alerts.some((a) => a.id === "sotto-scorta"));

console.log("build-kpi-performance-model.test.ts OK");
