import { combinedFuzzyScore } from "@/lib/entity-resolution/fuzzy-scorers";
import { normalizeItemDescription } from "@/lib/inventory/normalization";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { InventoryLineMatchStatus } from "@/src/types/supabase-tables";
import {
  buildCatalogCodeIndex,
  findCatalogItemByCode,
} from "@/lib/inventory-receiving/matching/catalog-code-index";
import { matchSupplierCodeFromMeta } from "@/lib/inventory-receiving/matching/match-supplier-code-from-meta";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";

const DESCRIPTION_SUGGESTED_THRESHOLD = 0.85;
const DESCRIPTION_CANDIDATE_MIN = 0.6;
const TOP_CANDIDATES = 3;

export type LineMatchInput = {
  rawCode: string;
  description: string;
  supplierLabel: string;
};

export type LineMatchResult = {
  matchedItemId: string | null;
  matchConfidence: number | null;
  matchStatus: InventoryLineMatchStatus;
  method: MatchCandidate["method"] | null;
  candidates: MatchCandidate[];
};

export function matchInventoryLine(
  items: RicambioMagazzino[],
  input: LineMatchInput,
  codeIndex?: Map<string, RicambioMagazzino>,
): LineMatchResult {
  const code = input.rawCode.trim();
  const description = input.description.trim();
  const index = codeIndex ?? buildCatalogCodeIndex(items);

  if (code) {
    const byCode = findCatalogItemByCode(index, code);
    if (byCode) {
      return {
        matchedItemId: byCode.id,
        matchConfidence: 1,
        matchStatus: "FOUND",
        method: "CODE",
        candidates: [{ itemId: byCode.id, label: byCode.descrizione, confidence: 1, method: "CODE" }],
      };
    }

    const bySupplier = matchSupplierCodeFromMeta(items, input.supplierLabel, code);
    if (bySupplier) {
      return {
        matchedItemId: bySupplier.id,
        matchConfidence: 0.9,
        matchStatus: "FOUND",
        method: "SUPPLIER_CODE",
        candidates: [
          {
            itemId: bySupplier.id,
            label: bySupplier.descrizione,
            confidence: 0.9,
            method: "SUPPLIER_CODE",
          },
        ],
      };
    }
  }

  if (description) {
    const normDesc = normalizeItemDescription(description);
    const ranked = items
      .map((item) => ({
        item,
        score: combinedFuzzyScore(normDesc, normalizeItemDescription(item.descrizione)),
      }))
      .filter((r) => r.score >= DESCRIPTION_CANDIDATE_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_CANDIDATES);

    const candidates: MatchCandidate[] = ranked.map((r) => ({
      itemId: r.item.id,
      label: r.item.descrizione,
      confidence: r.score,
      method: "DESCRIPTION_AI",
    }));

    const top = ranked[0];
    if (top && top.score >= DESCRIPTION_SUGGESTED_THRESHOLD) {
      return {
        matchedItemId: top.item.id,
        matchConfidence: top.score,
        matchStatus: "SUGGESTED",
        method: "DESCRIPTION_AI",
        candidates,
      };
    }

    if (top) {
      return {
        matchedItemId: null,
        matchConfidence: top.score,
        matchStatus: "NEW_ITEM",
        method: "DESCRIPTION_AI",
        candidates,
      };
    }
  }

  return {
    matchedItemId: null,
    matchConfidence: null,
    matchStatus: "NEW_ITEM",
    method: null,
    candidates: [],
  };
}

export function matchInventoryLines(
  items: RicambioMagazzino[],
  lines: LineMatchInput[],
  supplierLabel: string,
): LineMatchResult[] {
  const codeIndex = buildCatalogCodeIndex(items);
  return lines.map((line) =>
    matchInventoryLine(
      items,
      {
        ...line,
        supplierLabel: line.supplierLabel || supplierLabel,
      },
      codeIndex,
    ),
  );
}
