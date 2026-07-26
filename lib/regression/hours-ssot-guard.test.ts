import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  getActualLaborHoursFromRow,
  getEstimateVsActualDelta,
  getEmployeeUtilization,
  hoursIntegrityCheck,
  sumActualLaborHoursInRange,
} from "@/lib/analytics/hours";
import { buildLaborAnalytics } from "@/lib/report/report-domain-analytics";
import { REPORT_METRIC_REGISTRY } from "@/lib/report/metrics/report-metric-registry";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};
const rangeKey = buildReportRangeKey(range, null);

const lavId = "lav-1";
const completata: LavorazioneArchiviata = {
  id: lavId,
  macchina: "M1",
  targa: "AA",
  matricola: "1",
  nScuderia: "",
  cliente: "C",
  utilizzatore: "",
  cantiere: "",
  addetto: "Mario",
  note: "",
  statoFinaleId: "completata",
  prioritaFinale: "media",
  dataIngresso: "2025-03-01",
  dataCompletamento: "2025-03-10",
  meseCompletamento: "2025-03",
};

// Caso 1: preventivo 10h, zero schede → actual = 0
const prevOnly: PreventivoRecord = {
  id: "p1",
  numero: "1",
  dataCreazione: "2025-03-05",
  aggiornatoAt: "2025-03-05",
  stato: "inviato",
  tipoDocumento: "preventivo",
  lavorazioneId: "other",
  lavorazioneOrigine: "attiva",
  cliente: "C",
  cantiere: "",
  utilizzatore: "",
  macchinaRiassunto: "",
  targa: "",
  matricola: "",
  nScuderia: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  tipoAttrezzatura: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  km: "",
  livelloCarburante: "",
  richiedente: "",
  descrizioneLavorazioniCliente: "",
  descrizioneLavorazioniTecnicaSorgente: "",
  descrizioneGenerataAuto: "",
  righeRicambi: [],
  manodopera: { oreTotali: 10, righeAddetti: [], costoOrario: 50, scontoPercent: 0 },
  collaudoPrezzo: 0,
  sanificazionePrezzo: 0,
  noteFinali: "",
  totaleRicambi: 0,
  totaleManodopera: 500,
  totaleFinale: 500,
  createdBy: "test",
  lastEditedBy: "test",
};

assert.equal(
  sumActualLaborHoursInRange([], range, [{ id: "x", actual_labor_hours: 0 }]),
  0,
);

// Caso 2: scheda 8h → actual = 8
assert.equal(
  sumActualLaborHoursInRange([completata], range, [{ id: lavId, actual_labor_hours: 8 }]),
  8,
);
assert.equal(getActualLaborHoursFromRow({ id: lavId, actual_labor_hours: 8 }).hours, 8);
assert.equal(getActualLaborHoursFromRow({ id: lavId, actual_labor_hours: 8 }).consistency, "ok");

// Caso 3: preventivo 10 + consuntivo 12 → produttività usa 12
const labor = buildLaborAnalytics({
  rangeKey,
  requestId: 1,
  range,
  completate: [completata],
  schedeStore: {},
  lavListRows: [{ id: lavId, actual_labor_hours: 12 } as import("@/src/services/lavorazioni.service").LavorazioneListRow],
  totalHours: 40,
  costoOrario: 50,
  magazzinoRows: [],
});
assert.equal(labor.actualLaborHours, 12);

// Caso 6: preventivo modificato post-chiusura
const prevLinked: PreventivoRecord = { ...prevOnly, lavorazioneId: lavId, manodopera: { ...prevOnly.manodopera, oreTotali: 10 } };
const delta1 = getEstimateVsActualDelta([prevLinked], [{ id: lavId, actual_labor_hours: 12 }]);
assert.equal(delta1.rows[0]?.actualHours, 12);
assert.equal(delta1.rows[0]?.estimatedHours, 10);

const prevEdited: PreventivoRecord = { ...prevLinked, manodopera: { ...prevLinked.manodopera, oreTotali: 20 } };
const delta2 = getEstimateVsActualDelta([prevEdited], [{ id: lavId, actual_labor_hours: 12 }]);
assert.equal(delta2.rows[0]?.actualHours, 12);
assert.equal(delta2.rows[0]?.estimatedHours, 20);
assert.equal(labor.actualLaborHours, 12);

// Caso 7: mismatch colonna vs JSONB
const integrity = hoursIntegrityCheck({
  lavorazioni: [{ id: lavId, actual_labor_hours: 8, actual_labor_hours_source: "scheda_save" }],
  schedeInterventi: [
    {
      lavorazione_id: lavId,
      contenuto: {
        tipo: "lavorazioni",
        campi: { righe: [{ addettiAssegnati: [{ addetto: "Mario", oreImpiegate: 12 }] }] },
      },
    },
  ],
  mappings: [],
});
assert.equal(integrity.mismatchCount, 1);
assert.equal(getActualLaborHoursFromRow({ id: lavId, actual_labor_hours: 8 }).hours, 8);

// Caso 4: utilizzo dipendenti mapped
const util = getEmployeeUtilization({
  range,
  employees: [{ id: "e1", display_name: "Mario", source_addetto_name: "Mario", source_addetto_id: "a1", in_settings: true, created_at: "", updated_at: "" }],
  timesheetEntries: [
    {
      id: "t1",
      dipendente_id: "e1",
      work_date: "2025-03-10",
      ore_ordinarie: 8,
      ore_straordinarie: 0,
      assenza: false,
      motivo_assenza: null,
      ore_assenza: 0,
      note: null,
      tipo_assenza_id: null,
      tipo_assenza_label: null,
      employee_display_name_snapshot: "Mario",
      employee_source_addetto_id_snapshot: "a1",
      updated_by: null,
      created_at: "",
      updated_at: "",
    },
  ],
  completate: [completata],
  schedeStore: {
    [lavId]: {
      lavorazioneId: lavId,
      codice: null,
      ingresso: null,
      ricambi: null,
      lavorazioni: {
        tipo: "lavorazioni",
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
        sorgente: "generata",
        fileEsterno: null,
        campi: {
          identificazioneMacchina: "",
          righe: [{ id: "r1", dataLavorazione: "2025-03-10", lavorazioniEffettuate: "X", addettiAssegnati: [{ addetto: "Mario", oreImpiegate: 6 }] }],
        },
      },
    },
  },
  mappings: [{ id: "m1", addetto_nome: "Mario", employee_id: "e1", confirmed_at: "", confirmed_by: null, created_at: "", updated_at: "" }],
});
assert.equal(util.rows[0]?.utilizationPct, 75);
assert.equal(util.unmappedHours, 0);

// Registry CI: productivity metrics must not allow estimate
const productivityPattern = /productivity|utilization|efficiency|actual_hours_per_job|actual_labor_hours/;
for (const m of REPORT_METRIC_REGISTRY) {
  if (!productivityPattern.test(m.id)) continue;
  if (m.hourKind === "estimated" || m.allowEstimate === true) {
    assert.fail(`metric ${m.id} must not use estimated hours`);
  }
  if (m.hourKind === "actual" && m.sourceTables?.some((t) => t.includes("preventivi"))) {
    assert.fail(`metric ${m.id} must not source from preventivi`);
  }
}

// Lint: manodopera.oreTotali / oreImpiegate outside allowlist
const root = join(process.cwd());
const allowlist = new Set([
  "lib/analytics/hours",
  "lib/preventivi",
  "lib/lavorazioni/compute-actual-labor-hours-from-contenuto.ts",
  "lib/lavorazioni/ore-totali-scheda.ts",
  "types/schede.ts",
  "lib/analytics/hours/hours-integrity-check.ts",
]);

function scanDir(dir: string): void {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      scanDir(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name.name)) continue;
    const rel = full.replace(root + "\\", "").replace(root + "/", "");
    const allowed = [...allowlist].some((p) => rel.replace(/\\/g, "/").includes(p));
    if (allowed) continue;
    const src = readFileSync(full, "utf8");
    if (/manodopera\.oreTotali|oreImpiegate/.test(src)) {
      assert.fail(`forbidden hour field reference in ${rel}`);
    }
  }
}

scanDir(join(root, "lib/report"));
scanDir(join(root, "lib/dashboard"));
scanDir(join(root, "lib/health-score"));

console.log("hours-ssot-guard.test.ts OK");
