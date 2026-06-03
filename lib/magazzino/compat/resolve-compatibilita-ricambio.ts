import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { ExpandRicambioCompatOpts } from "@/lib/magazzino/ricambio-compat-expand";
import { expandRicambioCompatibilitaMezzi } from "@/lib/magazzino/ricambio-compat-expand";
import {
  buildCompatMetaForSave,
  compatRefsFromExpandedLabels,
} from "@/lib/magazzino/compat/build-compat-meta";
import {
  compatDisplayLabel,
  compatLineDisplayText,
  compatSortKey,
  dedupeCompatDisplayLines,
  dedupeCompatLabels,
} from "@/lib/magazzino/compat/compat-display";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import type { CompatInput, ResolvedCompatibilita } from "@/lib/magazzino/compat/compat-types";
import {
  collapseLegacyExpandedMarcaUniversal,
  dedupeCompatRefs,
  resolveCompatRefLabel,
} from "@/lib/magazzino/ricambio-compat-resolver";

const ORPHAN_FALLBACK = "[compatibilità non risolvibile]";

function buildResolved(
  refs: ReturnType<typeof dedupeCompatRefs>,
  labels: string[],
  orphanLabels: string[],
): ResolvedCompatibilita {
  const displayLines = dedupeCompatDisplayLines([
    ...labels.map(compatLineDisplayText),
    ...orphanLabels,
  ]);
  return {
    refs,
    labels,
    displayLines,
    display:
      labels.length === 0 && orphanLabels.length === 0
        ? compatDisplayLabel([])
        : labels.length > 0
          ? compatDisplayLabel(labels)
          : orphanLabels.join(", "),
    sortKey: compatSortKey([...labels, ...orphanLabels]),
    isUniversal: labels.length === 0 && orphanLabels.length === 0,
    orphanLabels,
  };
}

/**
 * Single source of truth compatibilità ricambio.
 * refs-first read; legacy collapse se assenti refs; expand opzionale solo write-path.
 */
export function resolveCompatibilitaRicambio(
  input: CompatInput,
  liste?: MezziListePrefs,
  opts?: { expand?: ExpandRicambioCompatOpts },
): ResolvedCompatibilita {
  const rawLegacy = normalizeCompatList(input.compatibilitaMezzi ?? []);
  let refs = input.compatibilitaRefs?.length ? dedupeCompatRefs(input.compatibilitaRefs) : [];

  if (opts?.expand && liste) {
    const expanded = expandRicambioCompatibilitaMezzi(rawLegacy, opts.expand);
    refs = compatRefsFromExpandedLabels(expanded, liste);
    const built = buildCompatMetaForSave(refs, liste);
    return resolveCompatibilitaRicambio(
      {
        compatibilitaRefs: built.compatibilitaRefs,
        compatibilitaMezzi: built.compatibilitaMezzi ?? [],
      },
      liste,
    );
  }

  if (!liste) {
    return buildResolved(refs, rawLegacy, []);
  }

  if (refs.length > 0) {
    const labels: string[] = [];
    const orphanLabels: string[] = [];
    for (const ref of refs) {
      const label = resolveCompatRefLabel(ref, liste);
      if (label) labels.push(label);
      else orphanLabels.push(ORPHAN_FALLBACK);
    }
    const sorted = dedupeCompatLabels([...new Set(labels)]).sort((a, b) => a.localeCompare(b, "it"));
    return buildResolved(refs, sorted, orphanLabels);
  }

  const labels = dedupeCompatLabels(collapseLegacyExpandedMarcaUniversal(rawLegacy, liste));
  return buildResolved([], labels, []);
}

/** Alias read-path: labels risolte per adapter UI. */
export function resolveCompatibilitaLabels(input: CompatInput, liste: MezziListePrefs): string[] {
  return resolveCompatibilitaRicambio(input, liste).labels;
}
