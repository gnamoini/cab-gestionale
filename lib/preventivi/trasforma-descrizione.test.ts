import assert from "node:assert/strict";
import { test } from "node:test";
import { trasformaDescrizioneLavorazioni } from "@/lib/preventivi/trasforma-descrizione";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";

const emptyCtx: DescrizionePreventivoContext = {
  cliente: "",
  targa: "",
  matricola: "",
  existingPreventiviRecords: [],
};

function linesOf(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

test("trasforma: sostituzione pinza freno — baseline heuristic", () => {
  const out = trasformaDescrizioneLavorazioni("Sostituzione pinza freno", emptyCtx);
  const lines = linesOf(out);
  assert.ok(lines.length >= 1);
  assert.ok(
    lines.some((l) => /sostituzione.*pinza|pinza.*freno/i.test(l)),
    `expected pinza freno line, got: ${lines.join(" | ")}`,
  );
});

test("trasforma: sostituzione pompa — baseline heuristic", () => {
  const out = trasformaDescrizioneLavorazioni("Sostituzione pompa idraulica", emptyCtx);
  const lines = linesOf(out);
  assert.ok(lines.some((l) => /pompa/i.test(l)), lines.join(" | "));
});

test("trasforma: smontaggio gruppo frenante", () => {
  const out = trasformaDescrizioneLavorazioni("Smontaggio gruppo frenante", emptyCtx);
  const lines = linesOf(out);
  assert.ok(lines.some((l) => /smontaggio/i.test(l)), lines.join(" | "));
});

test("trasforma: fallback manutenzione generale", () => {
  const out = trasformaDescrizioneLavorazioni("Intervento di manutenzione e controllo generale.", emptyCtx);
  assert.ok(out.includes("-"));
  assert.ok(linesOf(out).length >= 1);
});

test("trasforma: output usa bullet prefix", () => {
  const out = trasformaDescrizioneLavorazioni("Controllo impianto frenante", emptyCtx);
  for (const line of out.split("\n").filter(Boolean)) {
    assert.ok(line.startsWith("- "), `expected bullet: ${line}`);
  }
});

console.log("trasforma-descrizione.test.ts OK");
