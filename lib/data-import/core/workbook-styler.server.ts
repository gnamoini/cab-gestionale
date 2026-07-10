import "server-only";

import type { WorkbookStructure } from "@/lib/data-import/core/workbook-builder.server";
import { writeSpreadsheetWorkbook } from "@/lib/spreadsheet/xlsx-server";

const HEADER_COLORS: Record<string, string> = {
  required: "FFF4A460",
  protected: "FFD3D3D3",
  computed: "FFD3D3D3",
  optional: "FFFFFFFF",
};

export function applyWorkbookStyling(structure: WorkbookStructure): Buffer {
  return writeSpreadsheetWorkbook((utils) => {
    const wb = utils.book_new();
    for (const sheet of structure.sheets) {
      const ws = utils.aoa_to_sheet(sheet.rows);
      if (sheet.hidden) {
        ws["!hidden"] = true;
      }
      const rowCount = sheet.rows.length;
      const colCount = sheet.rows[0]?.length ?? 0;
      if (rowCount > 0 && colCount > 0 && sheet.name !== "_meta") {
        ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
        ws["!autofilter"] = { ref: utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } }) };
      }
      for (const fs of structure.fieldStyles) {
        if (fs.sheetName !== sheet.name) continue;
        const addr = utils.encode_cell({ r: 0, c: fs.colIndex });
        const cell = ws[addr];
        if (cell && typeof cell === "object") {
          (cell as { s?: { fill?: { fgColor?: { rgb: string } } } }).s = {
            fill: { fgColor: { rgb: HEADER_COLORS[fs.style] ?? HEADER_COLORS.optional } },
          };
        }
      }
      utils.book_append_sheet(wb, ws, sheet.name);
    }
    return wb;
  });
}

export function renderWorkbookToXlsx(structure: WorkbookStructure): Buffer {
  return applyWorkbookStyling(structure);
}
