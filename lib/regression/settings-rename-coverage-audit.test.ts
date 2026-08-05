import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renameCoverageMatrix, RENAME_OPERATIONS } from "@/lib/settings/rename-engine/rename-operation-registry";

const matrix = renameCoverageMatrix();
const propagation = fs.readFileSync(
  path.join(process.cwd(), "src/services/settings-rename-propagation.service.ts"),
  "utf8",
);

assert.ok(matrix.cliente.includes("cliente.mezzi.cliente"));
assert.ok(matrix.hierarchy_marca_attrezzature.includes("attrezzatura.marca"));
assert.ok(matrix.hierarchy_marca_telai.includes("telaio.marca"));
assert.ok(matrix.tipo_attrezzatura.includes("attrezzatura.tipo"));

assert.match(propagation, /"attrezzature", "marca"/);
assert.doesNotMatch(propagation, /propagateSimpleColumn\(kind, from, to, "mezzi", "marca"\)/);
assert.match(propagation, /marca_telaio/);
assert.match(propagation, /attrezzature.*tipo_attrezzatura|"attrezzature", "tipo_attrezzatura"/);
assert.ok(matrix.utilizzatore.includes("utilizzatore.preventivi"));
assert.match(propagation, /"preventivi", "utilizzatore"/);

for (const ids of Object.values(matrix)) {
  for (const id of ids) {
    assert.ok(RENAME_OPERATIONS[id], `missing operation definition: ${id}`);
  }
}

console.log("settings-rename-coverage-audit.test.ts OK");
