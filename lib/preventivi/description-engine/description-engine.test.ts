import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generatePreventivoDescription,
  resetDescriptionEngineDevState,
} from "@/lib/preventivi/description-engine/description-engine";

const emptyCtx = {
  cliente: "",
  targa: "",
  matricola: "",
  existingPreventiviRecords: [] as const,
};

test("DE: pinza freno genera righe TKB verified con provenance", () => {
  resetDescriptionEngineDevState();
  const out = generatePreventivoDescription({
    technicalBlob: "Sostituzione pinza freno",
    anomaliaText: "perdita liquido freni",
    ctx: emptyCtx,
    ricambi: [],
  });

  assert.ok(out.lines.length >= 2);
  assert.ok(out.lines.every((l) => l.sourceId && l.sourceType));
  assert.ok(out.clienteText.includes("-"));
  assert.ok(
    out.clienteText.toLowerCase().includes("ricerca") ||
      out.clienteText.toLowerCase().includes("pinza") ||
      out.clienteText.toLowerCase().includes("freno"),
  );
});

test("DE: generationId e contextHash presenti", () => {
  resetDescriptionEngineDevState();
  const out = generatePreventivoDescription({
    technicalBlob: "Sostituzione pinza freno",
    ctx: emptyCtx,
    ricambi: [],
  });
  assert.notEqual(out.meta.generationId, out.meta.generationContextHash);
  assert.ok(out.meta.generationSequence >= 1);
});

console.log("description-engine.test.ts OK");
