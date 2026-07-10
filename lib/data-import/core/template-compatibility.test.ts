import assert from "node:assert/strict";
import {
  assessImportCompatibility,
  computeSchemaHash,
  parseTemplateVersion,
} from "@/lib/data-import/core/template-compatibility";
import type { ImportExportFieldDef } from "@/lib/data-import/core/field-schema";

const fields: ImportExportFieldDef[] = [
  { key: "codice", label: "Codice", required: true },
  { key: "nome", label: "Nome" },
];

assert.deepEqual(parseTemplateVersion("3.1"), { major: 3, minor: 1 });
assert.equal(parseTemplateVersion("bad"), null);

const hashA = computeSchemaHash(fields, "importable");
const hashB = computeSchemaHash(fields, "importable");
assert.equal(hashA, hashB);

const blocked = assessImportCompatibility({
  fileMeta: { templateVersion: "2.0", entity: "mezzi", pluginVersion: "x@1" },
  pluginTemplateVersion: "3.0",
  pluginEntity: "mezzi",
  requiredFieldKeys: ["codice"],
  detectedColumnKeys: ["codice", "nome"],
  currentSchemaHash: hashA,
});
assert.ok(!blocked.ok);
assert.ok(blocked.blockers.some((b) => b.code === "TEMPLATE_MAJOR_INCOMPATIBLE"));

const entityMismatch = assessImportCompatibility({
  fileMeta: { entity: "magazzino_ricambi" },
  pluginTemplateVersion: "1.0",
  pluginEntity: "mezzi",
  requiredFieldKeys: [],
  detectedColumnKeys: [],
  currentSchemaHash: hashA,
});
assert.ok(entityMismatch.blockers.some((b) => b.code === "ENTITY_MISMATCH"));

console.log("template-compatibility.test.ts OK");
