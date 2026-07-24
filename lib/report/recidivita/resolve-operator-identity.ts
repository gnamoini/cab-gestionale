import {
  addettoDisplayName,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import type { OperatorIdentity } from "@/lib/report/recidivita/types";

export type OperatorConfidence = "high" | "medium" | "low" | "unknown";

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripPunctuation(value: string): string {
  return value.replace(/[.\-_]/g, " ").replace(/\s+/g, " ").trim();
}

/** ponytail: fuzzy iniziali+cognome — O(n) scan addetti; upgrade: indice precomputato */
function fuzzyMatchAddetto(stored: string, records: readonly AddettoRecord[]): AddettoRecord | undefined {
  const norm = normalizeName(stripPunctuation(stored));
  if (!norm) return undefined;

  const parts = norm.split(" ").filter(Boolean);
  if (parts.length < 2) return undefined;

  const initial = parts[0]!.length === 1 ? parts[0]! : parts[0]!.slice(0, 1);
  const surname = parts[parts.length - 1]!;

  for (const rec of records) {
    const recNorm = normalizeName(stripPunctuation(addettoDisplayName(rec)));
    const recParts = recNorm.split(" ").filter(Boolean);
    if (recParts.length < 2) continue;
    const recInitial = recParts[0]!.slice(0, 1);
    const recSurname = recParts[recParts.length - 1]!;
    if (recInitial === initial && recSurname === surname) return rec;
  }

  return undefined;
}

export function resolveOperatorIdentity(
  storedName: string,
  addettiRecords: readonly AddettoRecord[],
): OperatorIdentity {
  const stored = storedName.trim();
  if (!stored || stored === "—") {
    return { storedName: stored || "—", addettoId: null, confidence: "unknown" };
  }

  const exact = findAddettoByStoredName(addettiRecords, stored);
  if (exact) {
    return { storedName: stored, addettoId: exact.id, confidence: "high" };
  }

  const fuzzy = fuzzyMatchAddetto(stored, addettiRecords);
  if (fuzzy) {
    const normStored = normalizeName(stripPunctuation(stored));
    const hasInitialOnly = normStored.split(" ")[0]?.length === 1;
    return {
      storedName: stored,
      addettoId: fuzzy.id,
      confidence: hasInitialOnly ? "medium" : "low",
    };
  }

  return { storedName: stored, addettoId: null, confidence: "unknown" };
}

export function collectOperatorNamesFromBundle(
  bundle: import("@/types/schede").LavorazioneSchedeBundle | null | undefined,
): string[] {
  if (!bundle) return [];
  const names = new Set<string>();
  const acc = bundle.ingresso?.campi?.addettoAccettazione?.trim();
  if (acc) names.add(acc);
  for (const riga of bundle.lavorazioni?.campi?.righe ?? []) {
    for (const a of riga.addettiAssegnati ?? []) {
      const n = a.addetto?.trim();
      if (n) names.add(n);
    }
  }
  for (const r of bundle.ricambi?.campi?.righe ?? []) {
    const n = r.addetto?.trim();
    if (n) names.add(n);
  }
  return [...names];
}

export function computeOperatorAttributionPrecision(
  identities: readonly OperatorIdentity[],
): number {
  if (identities.length === 0) return 100;
  const ok = identities.filter((i) => i.confidence === "high" || i.confidence === "medium").length;
  return Math.round((ok / identities.length) * 1000) / 10;
}
