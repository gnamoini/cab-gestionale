import assert from "node:assert/strict";
import {
  assertIngressoSaveGenerationCurrent,
  beginIngressoSaveGeneration,
  resetIngressoSaveGenerationForTests,
} from "@/lib/schede/ingresso-save-generation";

resetIngressoSaveGenerationForTests();
beginIngressoSaveGeneration(5);
assert.equal(assertIngressoSaveGenerationCurrent(5, "t"), true);
assert.equal(assertIngressoSaveGenerationCurrent(4, "t"), false);

console.log("ingresso-save-generation.test.ts: ok");
