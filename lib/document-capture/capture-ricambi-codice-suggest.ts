import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  ENTITY_SIMILAR_SCORE_MIN,
  entityAutocompleteKey,
  scoreEntityMatch,
} from "@/lib/validation/global-entity-validation";

export type CaptureRicambioCodiceSuggestion = {
  item: RicambioMagazzino;
  codiceUi: string;
  score: number;
  /** @deprecated Usare codiceUi + descrizione in UI */
  label: string;
  descrizione: string;
};

function ricambioCodiciForSuggest(item: RicambioMagazzino): string[] {
  const codes = [
    item.codiceFornitoreOriginale,
    item.codiceFornitoreOriginaleSecondario,
    item.codiceFornitoreNonOriginale,
  ]
    .map((c) => ricambioCodiceForUi(String(c ?? "")))
    .filter(Boolean);
  return [...new Set(codes)];
}

function suggestionLabel(item: RicambioMagazzino, codiceUi: string): string {
  const descrizione = formatRicambioDescrizioneForUi(item.descrizione ?? "");
  const parts = [codiceUi, descrizione].filter(Boolean);
  return parts.join(" — ");
}

function suggestionDescrizione(item: RicambioMagazzino): string {
  return formatRicambioDescrizioneForUi(item.descrizione ?? "");
}

/** Match esatto o loose (entityAutocompleteKey) su codici magazzino. */
export function findExactRicambioByCodice(
  query: string,
  magazzino: readonly RicambioMagazzino[],
): RicambioMagazzino | null {
  const q = query.trim();
  if (!q || !magazzino.length) return null;
  return findDuplicateByCodici([...magazzino], q);
}

/** Suggerimenti codice con fuzzy QWERTY (0/O, typo tastiera). */
export function suggestRicambiCodiciForCapture(
  query: string,
  magazzino: readonly RicambioMagazzino[],
  limit = 12,
): CaptureRicambioCodiceSuggestion[] {
  const q = query.trim();
  if (!q || !magazzino.length) return [];

  const qKey = entityAutocompleteKey(q);
  const scored: CaptureRicambioCodiceSuggestion[] = [];

  for (const item of magazzino) {
    let bestScore = 0;
    let bestCodice = "";
    for (const code of ricambioCodiciForSuggest(item)) {
      const score = scoreEntityMatch(q, code);
      if (score > bestScore) {
        bestScore = score;
        bestCodice = code;
      }
      if (qKey && entityAutocompleteKey(code) === qKey) {
        bestScore = Math.max(bestScore, 100);
        bestCodice = code;
      }
    }
    if (bestScore >= ENTITY_SIMILAR_SCORE_MIN && bestCodice) {
      scored.push({
        item,
        codiceUi: bestCodice,
        score: bestScore,
        label: suggestionLabel(item, bestCodice),
        descrizione: suggestionDescrizione(item),
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "it")).slice(0, limit);
}
