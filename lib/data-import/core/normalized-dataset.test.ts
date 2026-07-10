import assert from "node:assert/strict";
import {
  assertRelationalDepth,
  getParentSheet,
  rowCellString,
  type NormalizedDataset,
  type NormalizedRow,
} from "@/lib/data-import/core/normalized-dataset";

const baseDataset: NormalizedDataset = {
  entity: "mezzi",
  pluginVersion: "mezzi-import@2.0.0",
  templateVersion: "2.0",
  schemaHash: "abc",
  source: "spreadsheet",
  sheets: [
    {
      name: "Mezzi",
      role: "parent",
      columns: [{ key: "targa", label: "Targa", index: 0 }],
      rows: [
        {
          rowIndex: 2,
          cells: {
            targa: { raw: " AB123 ", parsed: "AB123", issues: [] },
          },
        },
      ],
    },
    {
      name: "Righe",
      role: "child",
      parentSheetName: "Mezzi",
      fkField: "mezzo_id",
      columns: [],
      rows: [],
    },
  ],
  metadata: {},
};

assertRelationalDepth(baseDataset.sheets);
assert.equal(getParentSheet(baseDataset)?.name, "Mezzi");

const row: NormalizedRow = baseDataset.sheets[0]!.rows[0]!;
assert.equal(rowCellString(row, "targa"), "AB123");
assert.equal(rowCellString(row, "missing"), "");

let depthError = false;
try {
  assertRelationalDepth([
    { name: "L2", role: "child", parentSheetName: "L1", columns: [], rows: [] },
    { name: "L1", role: "child", parentSheetName: "Root", columns: [], rows: [] },
    { name: "Root", role: "parent", columns: [], rows: [] },
  ]);
} catch {
  depthError = true;
}
assert.ok(depthError, "nested child-of-child should throw");

console.log("normalized-dataset.test.ts OK");
