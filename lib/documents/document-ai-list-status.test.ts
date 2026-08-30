import assert from "node:assert/strict";
import test from "node:test";
import { deriveDocumentAiListStatus, documentoRicambiAiCandidate } from "@/lib/documents/document-ai-list-status";

test("documentoRicambiAiCandidate — PDF listini/cataloghi/manuali", () => {
  assert.equal(documentoRicambiAiCandidate({ tipoFile: "pdf", categoria: "listini" }), true);
  assert.equal(documentoRicambiAiCandidate({ tipoFile: "pdf", categoria: "altro" }), false);
  assert.equal(documentoRicambiAiCandidate({ tipoFile: "excel", categoria: "listini" }), false);
});

test("deriveDocumentAiListStatus — gate operativo ready", () => {
  assert.equal(
    deriveDocumentAiListStatus({
      aiEnabled: true,
      index: { status: "indexed", understandingStatus: "ready" },
    }),
    "ready",
  );
  assert.equal(
    deriveDocumentAiListStatus({
      aiEnabled: true,
      index: { status: "indexed", understandingStatus: "processing" },
    }),
    "processing",
  );
  assert.equal(
    deriveDocumentAiListStatus({ aiEnabled: true, index: null }),
    "pending",
  );
  assert.equal(
    deriveDocumentAiListStatus({
      aiEnabled: true,
      index: { status: "pending", understandingStatus: "pending" },
    }),
    "pending",
  );
  assert.equal(
    deriveDocumentAiListStatus({
      aiEnabled: true,
      index: { status: "processing", understandingStatus: "pending" },
    }),
    "processing",
  );
  assert.equal(
    deriveDocumentAiListStatus({ aiEnabled: false, isCandidate: true }),
    "inactive",
  );
  assert.equal(deriveDocumentAiListStatus({ aiEnabled: false }), "off");
});
