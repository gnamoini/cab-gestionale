import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generatePreventivoDescription,
  resetDescriptionEngineDevState,
} from "@/lib/preventivi/description-engine/description-engine";
import { descriptionEngineMetaSchema } from "@/lib/preventivi/description-engine/contracts/engine-meta.contract";

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

  assert.ok(out.lines.length >= 3);
  assert.ok(out.lines.every((l) => l.sourceId && l.sourceType));
  assert.ok(out.lines.some((l) => l.activityId === "freni_sostituzione_pinza"));
  assert.ok(out.meta.confidenceTier === "high" || out.meta.confidenceTier === "medium");
  descriptionEngineMetaSchema.parse(out.meta);
  assert.ok(out.clienteText.includes("-"));
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
