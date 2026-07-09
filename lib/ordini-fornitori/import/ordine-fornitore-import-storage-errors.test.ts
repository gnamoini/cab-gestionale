import assert from "node:assert/strict";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";

const importErr = classifyStorageDownloadError(
  { message: "new row violates row-level security policy" },
  false,
  "documenti",
  "import ordine",
);
assert.equal(importErr.code, "STORAGE_PERMISSION_DENIED");
assert.match(importErr.message, /import ordine fornitore/);

const notFoundErr = classifyStorageDownloadError(
  { message: "Object not found" },
  false,
  "documenti",
  "import ordine",
);
assert.equal(notFoundErr.code, "STORAGE_NOT_FOUND");

console.log("ordine-fornitore-import-storage-errors.test.ts OK");
