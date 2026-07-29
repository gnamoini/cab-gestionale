import type { MagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  dedupeCompatRefsPreferExplicitModels,
  labelsToCompatRefs,
  refsToCompatLabels,
  sanitizeCompatRefsForPersist,
  type LabelToCompatRefOptions,
  type RicambioCompatRef,
} from "@/lib/magazzino/ricambio-compat-resolver";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

function sortedLabelsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.localeCompare(y, "it"));
  const sb = [...b].sort((x, y) => x.localeCompare(y, "it"));
  return sa.every((v, i) => v === sb[i]);
}

/**
 * Dual-write controllato: refs = source of truth, legacy sempre derivato.
 */
export function buildCompatMetaForSave(
  refs: readonly RicambioCompatRef[],
  liste: MezziListePrefs,
  opts?: LabelToCompatRefOptions,
): Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi"> {
  const sanitized = sanitizeCompatRefsForPersist(refs, liste, opts);
  const deduped = dedupeCompatRefsPreferExplicitModels(sanitized);
  const labels = refsToCompatLabels(deduped, liste, opts?.prefsListe ? { prefsListe: opts.prefsListe } : undefined);
  const stableRefs =
    opts?.prefsListe && labels.length > 0
      ? labelsToCompatRefs(labels, liste, opts)
      : deduped;
  const finalRefs = dedupeCompatRefsPreferExplicitModels(stableRefs);
  return {
    compatibilitaRefs: finalRefs.length > 0 ? finalRefs : undefined,
    compatibilitaMezzi: labels.length > 0 ? labels : undefined,
  };
}

/** Infer refs da label espansi (write path form). */
export function compatRefsFromExpandedLabels(
  labels: readonly string[],
  liste: MezziListePrefs,
  opts?: LabelToCompatRefOptions,
): RicambioCompatRef[] {
  return labelsToCompatRefs(normalizeCompatList(labels), liste, opts);
}

export function diffCompatLegacy(
  refs: readonly RicambioCompatRef[],
  storedLegacy: readonly string[] | undefined,
  liste: MezziListePrefs,
): { mismatch: boolean; expected: string[] } {
  const expected = buildCompatMetaForSave(refs, liste).compatibilitaMezzi ?? [];
  const stored = normalizeCompatList(storedLegacy ?? []);
  return {
    mismatch: !sortedLabelsEqual(expected, stored),
    expected,
  };
}
