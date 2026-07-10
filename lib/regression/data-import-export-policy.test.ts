import assert from "node:assert/strict";
import {
  isImportExcelActive,
  isImportExcelExportOnly,
  isImportEntityStub,
} from "@/lib/data-import/import-capabilities";
import { canImportEntity, isImportEntityStub as permStub } from "@/lib/data-import/core/import-permissions";

const writeCtx = {
  magazzinoWrite: true,
  magazzinoAdmin: false,
  manageSettings: false,
  moduleWrite: { mezzi: true, preventivi: true, lavorazioni: true, fatturazione: true },
};

assert.equal(isImportExcelActive("mezzi"), true);
assert.equal(isImportExcelExportOnly("lavorazioni"), true);
assert.equal(isImportExcelExportOnly("fatture_draft"), true);
assert.equal(isImportExcelExportOnly("ordini_fornitori"), true);
assert.equal(isImportEntityStub("billing_customers"), true);
assert.equal(permStub("lavorazioni"), true);

assert.equal(canImportEntity(writeCtx, "mezzi"), true);
assert.equal(canImportEntity(writeCtx, "ordini_fornitori"), true);

console.log("data-import-export-policy.test.ts OK");
