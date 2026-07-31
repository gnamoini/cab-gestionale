import assert from "node:assert/strict";
import { test } from "node:test";
import {
  composePreventivoLavorazioniClienteEditorText,
  pulisciDescrizioneLavorazioniSpecifiche,
} from "@/lib/preventivi/preventivi-struttura";

test("pulisciDescrizioneLavorazioniSpecifiche spezza voci inline separate da ` - `", () => {
  const input =
    "- Scarico gasolio per smontaggio serbatoio - Scarico olio idraulico - Smontaggio serbatoio acqua e gasolio";
  assert.equal(
    pulisciDescrizioneLavorazioniSpecifiche(input),
    [
      "- Scarico gasolio per smontaggio serbatoio",
      "- Scarico olio idraulico",
      "- Smontaggio serbatoio acqua e gasolio",
    ].join("\n"),
  );
});

test("pulisciDescrizioneLavorazioniSpecifiche non spezza trattini intra-parola", () => {
  const input = "- Sostituzione semi-asse e bulloneria";
  assert.equal(pulisciDescrizioneLavorazioniSpecifiche(input), "- Sostituzione semi-asse e bulloneria");
});

test("composePreventivoLavorazioniClienteEditorText normalizza voci inline", () => {
  const composed = composePreventivoLavorazioniClienteEditorText("- Voce uno - Voce due");
  assert.ok(composed.includes("- Voce uno\n- Voce due"));
});
