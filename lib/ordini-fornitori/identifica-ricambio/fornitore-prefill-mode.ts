import type { FornitoreMatchMethod } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { FornitorePrefillMode } from "@/lib/ordini-fornitori/identifica-ricambio/types";

const IDENTIFIED_METHODS: ReadonlySet<FornitoreMatchMethod> = new Set(["piva", "cf", "exact"]);
const SUGGESTED_METHODS: ReadonlySet<FornitoreMatchMethod> = new Set(["normalized", "fuzzy"]);

export function fornitoreModeFromMatch(
  matched: boolean,
  matchMethod: FornitoreMatchMethod,
  hasHint: boolean,
): FornitorePrefillMode {
  if (matched && IDENTIFIED_METHODS.has(matchMethod)) return "identified";
  if (matched && SUGGESTED_METHODS.has(matchMethod)) return "suggested";
  if (!matched && hasHint) return "suggested";
  return "none";
}
