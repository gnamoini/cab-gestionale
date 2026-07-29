import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { ExpandRicambioCompatOpts } from "@/lib/magazzino/ricambio-compat-expand";
import {
  expandRicambioCompatibilitaMezzi,
  preferExplicitModelsOverUniversalMarca,
} from "@/lib/magazzino/ricambio-compat-expand";
import {
  buildCompatMetaForSave,
  compatRefsFromExpandedLabels,
} from "@/lib/magazzino/compat/build-compat-meta";
import {
  compatDisplayLabel,
  compatLabelDedupeKey,
  compatLineDisplayText,
  compatSortKey,
  COMPAT_NOT_CONFIGURED_LABEL,
  dedupeCompatDisplayLines,
  dedupeCompatLabels,
} from "@/lib/magazzino/compat/compat-display";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import type { CompatInput, ResolvedCompatibilita } from "@/lib/magazzino/compat/compat-types";
import {
  collapseLegacyExpandedMarcaUniversal,
  dedupeCompatRefs,
  dedupeCompatRefsPreferExplicitModels,
  resolveCompatRefLabel,
  type ResolveCompatRefLabelOptions,
} from "@/lib/magazzino/ricambio-compat-resolver";

export type ResolveCompatibilitaOpts = {
  expand?: ExpandRicambioCompatOpts;
  prefsListe?: MezziListePrefs;
};

function refLabelOpts(opts?: ResolveCompatibilitaOpts): ResolveCompatRefLabelOptions | undefined {
  return opts?.prefsListe ? { prefsListe: opts.prefsListe } : undefined;
}

function mergeLegacyFallbackLabels(
  resolvedLabels: string[],
  rawLegacy: readonly string[],
  liste: MezziListePrefs,
): string[] {
  const legacyLabels = preferExplicitModelsOverUniversalMarca(
    collapseLegacyExpandedMarcaUniversal(rawLegacy, liste),
    liste,
  );
  const merged = [...resolvedLabels];
  const seen = new Set(resolvedLabels.map(compatLabelDedupeKey));
  for (const leg of legacyLabels) {
    const k = compatLabelDedupeKey(leg);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(leg);
  }
  return dedupeCompatLabels(merged);
}

function buildResolved(
  refs: ReturnType<typeof dedupeCompatRefs>,
  labels: string[],
  orphanLabels: string[],
  isConfigured: boolean,
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
      !isConfigured
        ? COMPAT_NOT_CONFIGURED_LABEL
        : labels.length > 0
          ? compatDisplayLabel(labels)
          : orphanLabels.length > 0
            ? orphanLabels.join(", ")
            : COMPAT_NOT_CONFIGURED_LABEL,
    sortKey: isConfigured ? compatSortKey([...labels, ...orphanLabels]) : "",
    isUniversal: !isConfigured,
    isConfigured,
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
  opts?: ResolveCompatibilitaOpts,
): ResolvedCompatibilita {
  const rawLegacy = normalizeCompatList(input.compatibilitaMezzi ?? []);
  const isConfigured =
    (input.compatibilitaRefs?.length ?? 0) > 0 || rawLegacy.length > 0;
  let refs = input.compatibilitaRefs?.length
    ? dedupeCompatRefsPreferExplicitModels(input.compatibilitaRefs)
    : [];

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
      opts,
    );
  }

  if (!liste) {
    return buildResolved(refs, rawLegacy, [], isConfigured);
  }

  const labelOpts = refLabelOpts(opts);

  if (refs.length > 0) {
    const labels: string[] = [];
    let orphanRefCount = 0;
    for (const ref of refs) {
      const label = resolveCompatRefLabel(ref, liste, labelOpts);
      if (label) labels.push(label);
      else orphanRefCount += 1;
    }

    let mergedLabels = dedupeCompatLabels([...new Set(labels)]).sort((a, b) => a.localeCompare(b, "it"));
    if (orphanRefCount > 0 && rawLegacy.length > 0) {
      mergedLabels = mergeLegacyFallbackLabels(mergedLabels, rawLegacy, liste).sort((a, b) =>
        a.localeCompare(b, "it"),
      );
    }

    const orphanLabels: string[] =
      mergedLabels.length === 0 && orphanRefCount > 0 ? ["[compatibilità non risolvibile]"] : [];

    return buildResolved(refs, mergedLabels, orphanLabels, isConfigured);
  }

  const labels = preferExplicitModelsOverUniversalMarca(
    collapseLegacyExpandedMarcaUniversal(rawLegacy, liste),
    liste,
  );
  return buildResolved([], dedupeCompatLabels(labels), [], isConfigured);
}

/** Alias read-path: labels risolte per adapter UI. */
export function resolveCompatibilitaLabels(
  input: CompatInput,
  liste: MezziListePrefs,
  opts?: ResolveCompatibilitaOpts,
): string[] {
  return resolveCompatibilitaRicambio(input, liste, opts).labels;
}
