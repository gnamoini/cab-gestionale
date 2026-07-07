import assert from "node:assert/strict";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import {
  isPreventivoEditorDirty,
  normalizePreventivoEditorRecord,
} from "@/lib/preventivi/preventivo-editor-dirty";

const profilo = "attrezzature" as const;

const empty = buildEmptyManualPreventivo("Test", []);
const normalized = normalizePreventivoEditorRecord(empty, profilo);

assert.equal(isPreventivoEditorDirty(normalized, normalized), false);

const touched = { ...normalized, cliente: "ACME" };
assert.equal(isPreventivoEditorDirty(touched, normalized), true);

console.log("preventivo-editor-dirty.test.ts OK");
