import assert from "node:assert/strict";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildReportModel } from "@/lib/report/build-report-model";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildReportDerivedBundle } from "@/lib/report/report-derived-cache";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import {
  buildReportAnalysisContext,
  estimateReportAnalysisContextBytes,
} from "@/lib/report/report-analysis/build-report-analysis-context";
import { REPORT_ANALYSIS_CONTEXT_MAX_BYTES } from "@/lib/report/report-analysis/report-analysis-config";
import { reportAnalysisRequestSchema } from "@/lib/report/report-analysis/report-analysis-schema";
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

const ricambio: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "X",
  codiceFornitoreOriginale: "C1",
  descrizione: "Filtro",
  scorta: 2,
  scortaMinima: 5,
  dataUltimaModifica: "2026-01-01",
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 12,
});

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

const derivedBundle = buildReportDerivedBundle({
  completate: [completata],
  manualByMonth: new Map(),
  mezzi: [mezzo],
  magLog,
  magazzino: [ricambio],
  queryMeta: [],
  magManualRevision: 0,
});

const model = buildReportModel({
  anchor: range.end,
  preset: "last_3_months",
  compareMode: "none",
  attive: [attiva],
  storico: [completata],
  completate: [completata],
  magazzino: [ricambio],
  mezzi: [mezzo],
  magLog,
  semanticIndex,
  derivedBundle,
});

const perf = buildKpiPerformanceModel({
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

const integrityView = {
  status: "ok" as const,
  audit: { findings: [], strictBlocked: false },
  queryMeta: [],
  manualEntryCount: 0,
};

const context = buildReportAnalysisContext({
  preset: "last_3_months",
  compareMode: "none",
  filterRange: range,
  compareRange: null,
  model,
  perf,
  integrityView,
  tops: {
    mezzi: semanticIndex.topMezzi(range),
    clienti: semanticIndex.topClienti(range),
    ricambi: [],
  },
});

assert.equal(context.contextVersion, 1);
assert.equal(context.executive.openCount, 1);
assert.equal(context.executive.closedInPeriod, 1);
assert.ok(context.alerts.some((a) => a.id === "sotto-scorta"));
assert.equal(context.meta.periodStart, "2025-03-01");
assert.ok(context.periodKpis.every((k) => !("sub" in k)));
assert.ok(
  context.trends.monthlyClosed.every((p) => /^\d{4}-\d{2}$/.test(p.month)),
  "trend month deve usare monthKey YYYY-MM",
);
assert.ok(!("disponibilitaPct" in context.executive));
assert.ok(Array.isArray(context.fleet.disponibilitaPerCliente));
assert.equal(context.fleet.disponibilitaPerCliente[0]?.disponibilitaPct, 0);

const shortFp = "1:0::0:0:0:lavorazioni:1000:1:0";
const shortParsed = reportAnalysisRequestSchema.safeParse({ context, snapshotFingerprint: shortFp });
assert.ok(shortParsed.success, JSON.stringify(shortParsed.error?.flatten()));

const longFp = [
  500,
  4000,
  "2024-01-01T00:00:00.000Z:550e8400-e29b-41d4-a716-446655440000|2025-06-01T12:00:00.000Z:660e8400-e29b-41d4-a716-446655440001",
  200,
  3,
  0,
  "lavorazioni:1739123456789:500:0|magazzino:1739123456789:200:0|mezzi:1739123456789:45:0|movimenti:1739123456789:4000:0|manualEntries:1739123456789:12:0",
].join(":");
assert.ok(longFp.length > 128, "fingerprint test deve superare il vecchio limite 128");
const longParsed = reportAnalysisRequestSchema.safeParse({ context, snapshotFingerprint: longFp });
assert.ok(longParsed.success, JSON.stringify(longParsed.error?.flatten()));

const bytes = estimateReportAnalysisContextBytes(context);
assert.ok(bytes < REPORT_ANALYSIS_CONTEXT_MAX_BYTES, `context troppo grande: ${bytes} bytes`);

console.log("build-report-analysis-context.test.ts OK");
