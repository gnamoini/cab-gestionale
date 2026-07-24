import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PRODUCTION_FILES = [
  "lib/preventivi/generate-preventivo-from-lavorazione.ts",
  "lib/preventivi/regenerate-preventivo-description.ts",
];

test("produzione: call site usano generatePreventivoDescriptionAsync", () => {
  for (const rel of PRODUCTION_FILES) {
    const src = readFileSync(rel, "utf8");
    assert.ok(
      src.includes("generatePreventivoDescriptionAsync"),
      `${rel} deve importare generatePreventivoDescriptionAsync`,
    );
    assert.ok(
      !src.includes("from \"@/lib/preventivi/description-engine/description-engine\""),
      `${rel} non deve importare il core sync direttamente`,
    );
  }
});

test("produzione: regenerate non usa descrizioneLavorazioniTecnicaSorgente come input", () => {
  const src = readFileSync("lib/preventivi/regenerate-preventivo-description.ts", "utf8");
  assert.ok(
    !src.includes("technicalBlob: record.descrizioneLavorazioniTecnicaSorgente"),
    "regenerate non deve leggere snapshot storico come technicalBlob",
  );
});

test("description-engine index non esporta generatePreventivoDescription", () => {
  const src = readFileSync("lib/preventivi/description-engine/index.ts", "utf8");
  assert.ok(!src.includes("generatePreventivoDescription,"));
  assert.ok(src.includes("generatePreventivoDescriptionAsync"));
});

console.log("preventivi-description-polish-ssot.test.ts OK");
