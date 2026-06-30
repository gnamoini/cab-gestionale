import assert from "node:assert/strict";
import { parseSpreadsheetBuffer, parseNumberCell, findHeaderRow } from "@/lib/data-import/core/parse-spreadsheet";

{
  const csv = "Codice;Descrizione;Prezzo\nABC;Filtro;12.5\n";
  const bytes = new TextEncoder().encode(csv);
  const parsed = parseSpreadsheetBuffer(bytes, "test.csv");
  assert.equal(parsed.sheets.length, 1);
  assert.ok(parsed.matrix.length >= 2);
}

{
  assert.equal(parseNumberCell("12,5"), 12.5);
  assert.equal(parseNumberCell(""), null);
}

{
  const matrix = [["", ""], ["Codice", "Nome"], ["A", "B"]];
  assert.equal(findHeaderRow(matrix), 1);
}

console.log("parse-spreadsheet.test.ts OK");
