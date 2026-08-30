import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_INDEX_PROCESSING_STALE_MS } from "@/lib/ai/spare-parts/constants";

test("DOCUMENT_INDEX_PROCESSING_STALE_MS — 30 minuti", () => {
  assert.equal(DOCUMENT_INDEX_PROCESSING_STALE_MS, 30 * 60_000);
});
