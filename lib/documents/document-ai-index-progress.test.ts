import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveDocumentAiIndexEnqueueProgress,
  deriveDocumentAiIndexProgress,
} from "@/lib/documents/document-ai-index-progress";

const NOW = Date.parse("2026-08-29T10:00:00.000Z");

test("deriveDocumentAiIndexProgress — stale in coda", () => {
  const view = deriveDocumentAiIndexProgress(
    {
      status: "pending",
      understandingStatus: "pending",
      createdAt: "2026-08-29T09:40:00.000Z",
      updatedAt: "2026-08-29T09:40:00.000Z",
    },
    NOW,
  );
  assert.ok(view.staleWarning?.includes("In coda"));
  assert.equal(view.phaseHeadline, "In coda worker");
});

test("deriveDocumentAiIndexEnqueueProgress — fasi avvio HTTP", () => {
  const start = NOW - 45_000;
  const view = deriveDocumentAiIndexEnqueueProgress(start, NOW);
  assert.equal(view.headline, "Elaborazione sul server");
});

test("deriveDocumentAiIndexProgress — ready_with_warnings non attivo", () => {
  const view = deriveDocumentAiIndexProgress(
    {
      status: "indexed",
      understandingStatus: "ready_with_warnings",
      updatedAt: "2026-08-29T09:55:00.000Z",
    },
    NOW,
  );
  assert.equal(view.isActive, false);
  assert.equal(view.phaseHeadline, null);
});

test("deriveDocumentAiIndexProgress — errore con dettaglio", () => {
  const view = deriveDocumentAiIndexProgress(
    {
      status: "failed",
      understandingStatus: "pending",
      errorCode: "INDEX_FAILED",
      errorMessage: "Gemini timeout",
      updatedAt: "2026-08-29T09:55:00.000Z",
    },
    NOW,
  );
  assert.equal(view.errorDetail, "INDEX_FAILED — Gemini timeout");
  assert.equal(view.isActive, false);
});
