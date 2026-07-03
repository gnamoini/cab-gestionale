import assert from "node:assert/strict";
import {
  assertSpreadsheetUploadAllowed,
  SPREADSHEET_MAX_BYTES,
} from "@/lib/spreadsheet/xlsx-server";

assert.throws(
  () => assertSpreadsheetUploadAllowed(new Uint8Array(SPREADSHEET_MAX_BYTES + 1), "test.xlsx"),
  /troppo grande/i,
);
assert.throws(
  () => assertSpreadsheetUploadAllowed(new Uint8Array(10), "evil.exe"),
  /Formato file non supportato/i,
);
assert.doesNotThrow(() => assertSpreadsheetUploadAllowed(new Uint8Array(10), "ok.csv"));

console.log("xlsx-server.test.ts OK");
