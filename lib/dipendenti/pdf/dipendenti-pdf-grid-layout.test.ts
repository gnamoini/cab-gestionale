import assert from "node:assert/strict";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import { formatAbsenceCellShortLabel } from "@/lib/dipendenti/timesheet-cell-display";
import { buildMonthDays } from "@/lib/dipendenti/timesheet-month";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import {
  computeTimesheetGridColumnWidths,
  legacyUniformDayColWidth,
  TIMESHEET_PDF_MIN_DAY_COL_MM,
  TIMESHEET_PDF_TOT_COL_MM,
  timesheetDayColumnWeight,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-grid-layout";

const A4_LANDSCAPE_W = 297;

function assertWidthsForMonth(monthKey: string) {
  const days = buildMonthDays(monthKey);
  const { tableW, nameColW, totColW, dayColWidths } = computeTimesheetGridColumnWidths(
    A4_LANDSCAPE_W,
    days,
  );
  const sum = nameColW + totColW + dayColWidths.reduce((a, w) => a + w, 0);
  assert.ok(Math.abs(sum - tableW) < 0.02, `${monthKey}: sum ${sum} vs tableW ${tableW}`);

  for (let i = 0; i < days.length; i++) {
    const d = days[i]!;
    const w = dayColWidths[i]!;
    if (d.isWeekend) {
      assert.ok(
        w >= TIMESHEET_PDF_MIN_DAY_COL_MM - 0.02,
        `${monthKey} ${d.dateYmd}: weekend min width ${w}`,
      );
    } else if (days.length <= 30) {
      assert.ok(w >= 8.9, `${monthKey} ${d.dateYmd}: weekday width ${w}`);
    } else {
      assert.ok(w >= 8.4, `${monthKey} ${d.dateYmd}: weekday width ${w}`);
    }
    if (!d.isWeekend && days.length <= 30) {
      const uniform = legacyUniformDayColWidth(A4_LANDSCAPE_W, days.length);
      assert.ok(w > uniform, `${monthKey} ${d.dateYmd}: weekday wider than uniform`);
    }
    if (d.weekdayShort === "dom") {
      const satW = dayColWidths[days.findIndex((x) => x.weekdayShort === "sab" && x.day <= d.day)] ?? w;
      if (satW > 0 && d.day > 7) {
        assert.ok(w <= satW + 0.02, "sunday <= saturday width");
      }
    }
  }
}

assertWidthsForMonth("2026-01");
assertWidthsForMonth("2026-02");
assertWidthsForMonth("2026-04");
assertWidthsForMonth("2026-06");

const juneDays = buildMonthDays("2026-06");
const juneWidths = computeTimesheetGridColumnWidths(A4_LANDSCAPE_W, juneDays);
const domIdx = juneDays.findIndex((d) => d.day === 7 && d.weekdayShort === "dom");
assert.ok(domIdx >= 0);
assert.ok(juneWidths.dayColWidths[domIdx]! >= TIMESHEET_PDF_MIN_DAY_COL_MM - 0.02);

assert.equal(timesheetDayColumnWeight(buildMonthDays("2026-06-01")[0]!), 1.0);
assert.equal(
  timesheetDayColumnWeight(buildMonthDays("2026-06-01").find((d) => d.weekdayShort === "sab")!),
  0.78,
);
assert.equal(
  timesheetDayColumnWeight(buildMonthDays("2026-06-01").find((d) => d.weekdayShort === "dom")!),
  0.72,
);

const tipi = defaultTipiAssenza();
const ferie = tipi.find((t) => t.label === "Ferie")!;
const festCell: TimesheetCellValue = {
  oreOrdinarie: 0,
  oreStraordinarie: 0,
  oreAssenza: 8,
  tipoAssenzaId: null,
  tipoAssenzaLabel: "Festività",
  motivoCustom: "",
  note: "",
};
assert.equal(formatAbsenceCellShortLabel(festCell, tipi), "8\u00a0FES");
assert.equal(
  formatAbsenceCellShortLabel(
    { ...festCell, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Festività" },
    tipi,
  ),
  "8\u00a0FES",
);

const jan = buildMonthDays("2026-01");
const janWidths = computeTimesheetGridColumnWidths(A4_LANDSCAPE_W, jan);
assert.equal(janWidths.totColW, TIMESHEET_PDF_TOT_COL_MM);
const janDays = buildMonthDays("2026-01");
assert.ok(
  janWidths.dayColWidths
    .filter((_, i) => janDays[i]?.isWeekend)
    .every((w) => w >= TIMESHEET_PDF_MIN_DAY_COL_MM - 0.02),
);

console.log("dipendenti-pdf-grid-layout.test.ts OK");
