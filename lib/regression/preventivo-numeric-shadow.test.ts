/**
 * Shadow: valori finali dopo commit vs legacy onChange parser (preventivo).
 * Mid-typing può differire per design; i finali validi devono allinearsi.
 */
import assert from "node:assert/strict";
import {
  commitNumericDraft,
  resolveCommittedNumber,
} from "@/lib/core/numeric-input-commit";
import {
  NUMERIC_PRESETS,
  ORE_PREVENTIVO_ADDETTO_PRESET,
  resolveQuantityPreset,
} from "@/lib/core/numeric-input-policy";

function legacyQty(raw: string): number {
  return Math.max(0.01, Number.parseFloat(raw) || 0);
}

function legacyPrezzo(raw: string): number {
  return Math.max(0, Number.parseFloat(raw) || 0);
}

function legacySconto(raw: string): number {
  return Math.min(100, Math.max(0, Number.parseFloat(raw) || 0));
}

function legacyOre(raw: string): number {
  const v = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(v)) return 0.01;
  return Math.max(0.01, Math.round(v * 100) / 100);
}

function commitFinal(raw: string, preset: Parameters<typeof commitNumericDraft>[1], committed: number): number {
  return resolveCommittedNumber(commitNumericDraft(raw, preset, committed), committed);
}

const cases: { raw: string; committed: number; legacy: (r: string) => number; preset: Parameters<typeof commitNumericDraft>[1] }[] = [
  { raw: "2", committed: 1, legacy: legacyQty, preset: resolveQuantityPreset("pz") },
  { raw: "2.5", committed: 1, legacy: legacyQty, preset: resolveQuantityPreset("lt") },
  { raw: "12.50", committed: 0, legacy: legacyPrezzo, preset: NUMERIC_PRESETS.prezzo },
  { raw: "15", committed: 0, legacy: legacySconto, preset: NUMERIC_PRESETS.percentuale },
  { raw: "0.5", committed: 1, legacy: legacyOre, preset: ORE_PREVENTIVO_ADDETTO_PRESET },
  { raw: "48.5", committed: 48, legacy: legacyPrezzo, preset: NUMERIC_PRESETS.prezzo },
];

for (const c of cases) {
  const next = commitFinal(c.raw, c.preset, c.committed);
  const old = c.legacy(c.raw);
  assert.equal(
    next,
    old,
    `shadow mismatch raw=${c.raw} committed=${c.committed}: new=${next} legacy=${old}`,
  );
}

console.log("preventivo-numeric-shadow.test.ts OK");
