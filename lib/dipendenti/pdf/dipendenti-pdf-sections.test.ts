import assert from "node:assert/strict";
import type { CellDef, CellInput } from "jspdf-autotable";
import {
  pdfGridBodyCell,
  pdfMutedAbsenceLabelCell,
  pdfMutedTotalCell,
  TIMESHEET_PDF_DAY_CELL_PAD,
  TIMESHEET_PDF_MIN_CELL_HEIGHT_MM,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-sections";

function asCellDef(cell: CellInput): CellDef {
  assert.ok(cell && typeof cell === "object" && !Array.isArray(cell));
  return cell as CellDef;
}

assert.equal(TIMESHEET_PDF_MIN_CELL_HEIGHT_MM, 5.5);

const festLabel = "8\u00a0FES";

const bodyCell = asCellDef(pdfGridBodyCell("8"));
assert.equal(bodyCell.content, "8");
assert.equal(bodyCell.styles?.fontSize, 6);
assert.equal(bodyCell.styles?.valign, "middle");
assert.equal(bodyCell.styles?.halign, "center");
assert.deepEqual(bodyCell.styles?.cellPadding, TIMESHEET_PDF_DAY_CELL_PAD);

const absenceCell = asCellDef(pdfMutedAbsenceLabelCell(festLabel));
assert.equal(absenceCell.content, festLabel);
assert.equal(absenceCell.styles?.fontSize, 6);
assert.equal(absenceCell.styles?.valign, "middle");
assert.equal(absenceCell.styles?.overflow, "visible");
assert.deepEqual(absenceCell.styles?.cellPadding, {
  top: 0.3,
  right: 0.2,
  bottom: 0.3,
  left: 0.2,
});

const totalCell = asCellDef(pdfMutedTotalCell("152"));
assert.equal(totalCell.content, "152");
assert.equal(totalCell.styles?.fontSize, 6);
assert.equal(totalCell.styles?.valign, "middle");
assert.deepEqual(totalCell.styles?.cellPadding, TIMESHEET_PDF_DAY_CELL_PAD);

console.log("dipendenti-pdf-sections.test.ts OK");
