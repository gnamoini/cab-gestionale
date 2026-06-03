import assert from "node:assert/strict";
import type { TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";
import {
  buildAbsenceCellDisplayContent,
  buildCellDisplayContent,
  buildWorkCellDisplayContent,
  cellDisplayKindForLayer,
  formatCellShortLabel,
  formatWorkCellShortLabel,
  formatAbsenceCellDipendentePdf,
  formatAbsenceCellShortLabel,
  formatOrdinarieCellPdf,
  formatStraordinarieCellPdf,
  formatTimesheetDayLabelPdf,
  cellDisplayKind,
} from "@/lib/dipendenti/timesheet-cell-display";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";

const tipi = defaultTipiAssenza();

function cell(partial: Partial<TimesheetCellValue>): TimesheetCellValue {
  return {
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "",
    ...partial,
  };
}

const ferie = tipi.find((t) => t.label === "Ferie")!;

assert.equal(formatCellShortLabel(cell({ oreOrdinarie: 8 }), tipi), "8h");
assert.equal(formatCellShortLabel(cell({ oreOrdinarie: 8, oreStraordinarie: 2 }), tipi), "8+2");
assert.equal(formatCellShortLabel(cell({ oreStraordinarie: 6 }), tipi), "6h");
assert.equal(formatCellShortLabel(cell({ oreOrdinarie: 8, oreAssenza: 4, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi), "8h+F");
assert.equal(
  formatCellShortLabel(cell({ oreOrdinarie: 8, oreStraordinarie: 2, oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi),
  "8+2+F",
);

assert.equal(formatWorkCellShortLabel(cell({ oreOrdinarie: 8 })), "8");
assert.equal(formatWorkCellShortLabel(cell({ oreOrdinarie: 8, oreStraordinarie: 2 })), "8+2");
assert.equal(formatWorkCellShortLabel(cell({ oreStraordinarie: 6 })), "6");
assert.equal(formatWorkCellShortLabel(cell({ oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" })), "");
assert.equal(
  formatAbsenceCellShortLabel(cell({ oreAssenza: 7, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi),
  "7\u00a0F",
);
assert.equal(formatAbsenceCellShortLabel(cell({ oreAssenza: 7, tipoAssenzaId: ferie.id }), tipi), "7\u00a0F");
assert.equal(formatOrdinarieCellPdf(cell({ oreOrdinarie: 8 })), "8");
assert.equal(formatOrdinarieCellPdf(cell({})), "·");
assert.equal(formatStraordinarieCellPdf(cell({ oreStraordinarie: 2 })), "2");
assert.equal(
  formatAbsenceCellDipendentePdf(
    cell({ oreAssenza: 7, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }),
    tipi,
  ),
  "7 F (Ferie)",
);
assert.equal(
  formatTimesheetDayLabelPdf({
    day: 3,
    dateYmd: "2026-06-03",
    weekdayShort: "mer",
    weekdayLong: "mercoledì",
    isWeekend: false,
  } satisfies TimesheetDayInfo),
  "3 mercoledì",
);

assert.equal(buildCellDisplayContent(cell({ oreOrdinarie: 8, oreStraordinarie: 6 }), tipi).primary, "14h");
assert.equal(buildCellDisplayContent(cell({ oreOrdinarie: 8, oreStraordinarie: 6 }), tipi).secondary, "8+6");
assert.equal(buildCellDisplayContent(cell({ oreStraordinarie: 6 }), tipi).primary, "6h");
assert.equal(buildCellDisplayContent(cell({ oreStraordinarie: 6 }), tipi).secondary, "str");
assert.equal(buildCellDisplayContent(cell({ oreOrdinarie: 8, oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi).primary, "8h");
assert.equal(buildCellDisplayContent(cell({ oreOrdinarie: 8, oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi).secondary, "F");

assert.equal(cellDisplayKind(cell({ oreOrdinarie: 8 })), "work");
assert.equal(cellDisplayKind(cell({ oreOrdinarie: 8, oreStraordinarie: 2 })), "split");
assert.equal(cellDisplayKind(cell({ oreStraordinarie: 6 })), "overtime");
assert.equal(cellDisplayKind(cell({ oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" })), "absence");
assert.equal(cellDisplayKind(cell({ oreOrdinarie: 4, oreAssenza: 4, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" })), "work_absence");
assert.equal(cellDisplayKind(cell({ oreStraordinarie: 2, oreAssenza: 4, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" })), "overtime_absence");
assert.equal(cellDisplayKind(cell({ oreOrdinarie: 4, oreStraordinarie: 2, oreAssenza: 4, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" })), "full");
assert.equal(cellDisplayKind(cell({})), "empty");

assert.equal(buildWorkCellDisplayContent(cell({ oreOrdinarie: 8, oreStraordinarie: 6 })).primary, "14");
assert.equal(buildWorkCellDisplayContent(cell({ oreOrdinarie: 8, oreStraordinarie: 6 })).secondary, "8+6");
assert.equal(buildWorkCellDisplayContent(cell({ oreStraordinarie: 6 })).primary, "6");
assert.equal(buildWorkCellDisplayContent(cell({ oreStraordinarie: 6 })).secondary, "STR");
assert.equal(buildWorkCellDisplayContent(cell({ oreOrdinarie: 8, oreAssenza: 8, tipoAssenzaLabel: "Ferie" })).primary, "8");
assert.equal(buildAbsenceCellDisplayContent(cell({ oreOrdinarie: 8, oreAssenza: 7, tipoAssenzaLabel: "Ferie" }), tipi).primary, "7");
assert.equal(buildAbsenceCellDisplayContent(cell({ oreOrdinarie: 8, oreAssenza: 7, tipoAssenzaLabel: "Ferie" }), tipi).secondary, "F");
assert.equal(cellDisplayKindForLayer(cell({ oreOrdinarie: 8 }), "work"), "work");
assert.equal(cellDisplayKindForLayer(cell({ oreAssenza: 8, tipoAssenzaLabel: "Ferie" }), "absence"), "absence");
assert.equal(cellDisplayKindForLayer(cell({ oreAssenza: 8 }), "work"), "empty");

const altro = tipi.find((t) => t.label === "Altro")!;
const altValidation = validateCellValue(
  cell({ oreAssenza: 4, tipoAssenzaId: altro.id, tipoAssenzaLabel: "Altro" }),
  tipi,
);
assert.equal(altValidation.ok, false);

const capValidation = validateCellValue(cell({ oreOrdinarie: 20, oreStraordinarie: 5 }), tipi);
assert.equal(capValidation.ok, false);

console.log("timesheet-cell-display.test.ts OK");
