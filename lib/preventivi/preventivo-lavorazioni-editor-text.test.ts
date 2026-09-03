import assert from "node:assert/strict";
import {
  composePreventivoLavorazioniClienteEditorText,
  extractPreventivoLavorazioniClienteSpecifiche,
  pulisciDescrizioneLavorazioniSpecifiche,
} from "@/lib/preventivi/preventivi-struttura";
import { PREVENTIVO_SANIFICAZIONE_DESCRIZIONE } from "@/lib/preventivi/preventivi-voci-standard";

const sanificazione = PREVENTIVO_SANIFICAZIONE_DESCRIZIONE;

/** Simula editing: il testo grezzo non viene riscritto finché non si normalizza (blur). */
function simulateTypingWithoutRecompose(rawDuringEdit: string): string {
  return rawDuringEdit;
}

function simulateBlurNormalize(raw: string, sanificazioneDescrizione?: string): string {
  const specifiche = extractPreventivoLavorazioniClienteSpecifiche(raw);
  return composePreventivoLavorazioniClienteEditorText(specifiche, sanificazioneDescrizione);
}

const composed = composePreventivoLavorazioniClienteEditorText("- Revisione freni\n- Sostituzione pastiglie", sanificazione);
assert.ok(composed.includes(sanificazione), "sanificazione in testo composto");
assert.ok(composed.includes("Revisione freni"), "specifiche nel testo composto");

const midEdit = simulateTypingWithoutRecompose(`${composed}\n- Nuova voce`);
assert.equal(midEdit, `${composed}\n- Nuova voce`, "durante editing il testo grezzo resta invariato");

const afterBlur = simulateBlurNormalize(midEdit, sanificazione);
assert.ok(afterBlur.includes("Nuova voce"), "blur normalizza e mantiene nuove voci");
assert.ok(afterBlur.includes(sanificazione), "blur mantiene sanificazione");

const multiline = simulateBlurNormalize("- Voce A\n- Voce B\n- Voce C", sanificazione);
assert.equal(
  extractPreventivoLavorazioniClienteSpecifiche(multiline).split("\n").length,
  3,
  "multilinea estratta correttamente",
);

const cleaned = pulisciDescrizioneLavorazioniSpecifiche("- Test - inline - split");
assert.ok(cleaned.includes("- Test"), "pulizia espande inline senza perdere contenuto");

console.log("preventivo-lavorazioni-editor-text.test.ts OK");
