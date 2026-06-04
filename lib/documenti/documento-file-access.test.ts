import assert from "node:assert/strict";
import {
  classifyDocumentoStorageOpenError,
  documentoFileAccessBlockLabel,
  documentoFileOpenFailureMessage,
  getDocumentoFileAccessState,
} from "@/lib/documenti/documento-file-access";
import { classifyDocumentoUrlRow } from "@/lib/ops/documenti-url-inventory";

const baseDoc = {
  urlBlob: undefined as string | undefined,
  urlDocumento: undefined as string | undefined,
};

assert.equal(getDocumentoFileAccessState({ ...baseDoc, urlBlob: "blob:abc" }).canOpen, true);

assert.equal(getDocumentoFileAccessState({ ...baseDoc, urlDocumento: "" }).canOpen, false);
assert.equal(
  getDocumentoFileAccessState({ ...baseDoc, urlDocumento: "" }).blockReason,
  "no_file_linked",
);

assert.equal(
  getDocumentoFileAccessState({
    ...baseDoc,
    urlDocumento: "uuid-1/manuale.pdf",
  }).canOpen,
  true,
);

assert.equal(
  getDocumentoFileAccessState({
    ...baseDoc,
    urlDocumento: "https://example.com/other/file.pdf",
  }).canOpen,
  false,
);
assert.equal(
  getDocumentoFileAccessState({
    ...baseDoc,
    urlDocumento: "https://example.com/other/file.pdf",
  }).blockReason,
  "legacy_url_unparsed",
);

const legacySupabase =
  "https://proj.supabase.co/storage/v1/object/public/documenti/abc/def.pdf";
assert.equal(
  getDocumentoFileAccessState({ ...baseDoc, urlDocumento: legacySupabase }).canOpen,
  true,
);
assert.equal(
  classifyDocumentoUrlRow({ id: "1", url_file: legacySupabase }).legacyResolvable,
  true,
);

assert.equal(classifyDocumentoStorageOpenError({ message: "Object not found" }), "not_found");
assert.equal(
  classifyDocumentoStorageOpenError({ message: "new row violates row-level security policy" }),
  "permission_denied",
);

assert.match(documentoFileAccessBlockLabel("legacy_url_unparsed"), /obsoleto/i);
assert.match(documentoFileOpenFailureMessage("not_found"), /storage/i);

console.log("documento-file-access.test.ts OK");
