import assert from "node:assert/strict";
import { detectListinoColumnMap, applyListinoColumnMap } from "./parse-listino-column-map";

const matrix = [
  ["Part No", "Description", "Price"],
  ["P-1", "Item one", "10"],
];

const map = detectListinoColumnMap(matrix);
assert.equal(map.codiceColumn, 0);
assert.equal(map.descrizioneColumn, 1);
assert.equal(map.costoColumn, 2);
const rows = applyListinoColumnMap(matrix, map);
assert.equal(rows.length, 1);
assert.equal(rows[0]?.costo, 10);

console.log("parse-listino-column-map.test.ts OK");
