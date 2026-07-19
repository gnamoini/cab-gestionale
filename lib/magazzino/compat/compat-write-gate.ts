/**
 * WRITE ALLOWLIST — scrittura diretta compatibilitaMezzi consentita SOLO in:
 * - parseMagazzinoRicambioMeta (parse DB in ingresso)
 * - ricambio-form-fields.tsx / form state (non persistito finché non passa save)
 * - test fixtures
 *
 * Tutti i write path persistiti devono usare writeCompatibilitaRicambio().
 */
import {
  buildCompatMetaForSave,
  compatRefsFromExpandedLabels,
} from "@/lib/magazzino/compat/build-compat-meta";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import type { CompatInput } from "@/lib/magazzino/compat/compat-types";
import type { MagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  dedupeCompatRefs,
  type RicambioCompatRef,
} from "@/lib/magazzino/ricambio-compat-resolver";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { trackDeprecatedUsage } from "@/lib/observability/deprecated-usage";

export type CompatWriteInput = CompatInput & { ricambioId?: string };

export type CompatWriteRisk = "ok" | "legacy_only" | "legacy_mismatch_refs" | "missing_mezzi_liste";

export type CompatWriteContext = {
  ricambioId?: string;
  risk?: CompatWriteRisk;
  hasListe?: boolean;
};

/** Dev-only override — mai attivo in production. */
export const COMPAT_LEGACY_WRITE_MODE = false;

const warnedSources = new Set<string>();

/** @internal Solo test — reset dedupe sessione guard. */
export function resetCompatWriteGuardWarningsForTest(): void {
  warnedSources.clear();
}

export function compatLegacyWriteModeEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return COMPAT_LEGACY_WRITE_MODE || process.env.NEXT_PUBLIC_COMPAT_LEGACY_WRITE === "1";
}

export function devInvariantCompatWriteGuard(source: string, context?: CompatWriteContext): void {
  if (process.env.NODE_ENV === "production") return;

  const risk = context?.risk ?? "legacy_only";
  const key = `${source}:${risk}`;
  if (warnedSources.has(key)) return;
  warnedSources.add(key);

  trackDeprecatedUsage("magazzino-compat-write", { source, risk });
  const stack = new Error("[compat-write-guard]").stack;
  console.warn(
    `[compat-write-guard] Legacy compat write blocked — use writeCompatibilitaRicambio() at "${source}"`,
    context,
    stack,
  );
}

function sortedLabelsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.localeCompare(y, "it"));
  const sb = [...b].sort((x, y) => x.localeCompare(y, "it"));
  return sa.every((v, i) => v === sb[i]);
}

export function normalizeCompatWrite(input: CompatWriteInput): CompatWriteInput {
  const legacy = normalizeCompatList(input.compatibilitaMezzi ?? []);
  const refs = input.compatibilitaRefs?.length ? dedupeCompatRefs(input.compatibilitaRefs) : undefined;
  return {
    ricambioId: input.ricambioId,
    compatibilitaMezzi: legacy,
    compatibilitaRefs: refs,
  };
}

/** Converte input legacy-only in refs quando liste disponibile. */
export function legacyToSSOTWriteAdapter(input: CompatWriteInput, liste: MezziListePrefs): CompatWriteInput {
  const normalized = normalizeCompatWrite(input);
  if (normalized.compatibilitaRefs && normalized.compatibilitaRefs.length > 0) {
    return normalized;
  }
  const legacy = normalizeCompatList(normalized.compatibilitaMezzi ?? []);
  if (legacy.length === 0) return normalized;
  return {
    ...normalized,
    compatibilitaRefs: compatRefsFromExpandedLabels(legacy, liste),
    compatibilitaMezzi: legacy,
  };
}

export function detectLegacyWriteRisk(
  input: CompatWriteInput,
  liste?: MezziListePrefs,
): { risk: CompatWriteRisk } {
  const normalized = normalizeCompatWrite(input);
  const refs = normalized.compatibilitaRefs ?? [];
  const legacy = normalizeCompatList(normalized.compatibilitaMezzi ?? []);

  if (refs.length === 0 && legacy.length === 0) return { risk: "ok" };
  if (refs.length === 0 && legacy.length > 0 && !liste) return { risk: "missing_mezzi_liste" };
  if (refs.length === 0 && legacy.length > 0) return { risk: "legacy_only" };

  if (refs.length > 0 && liste) {
    const expected = buildCompatMetaForSave(refs, liste).compatibilitaMezzi ?? [];
    if (legacy.length > 0 && !sortedLabelsEqual(expected, legacy)) {
      return { risk: "legacy_mismatch_refs" };
    }
    return { risk: "ok" };
  }

  if (refs.length > 0 && legacy.length > 0) return { risk: "legacy_mismatch_refs" };
  return { risk: "ok" };
}

function resolveRefs(normalized: CompatWriteInput, liste?: MezziListePrefs): RicambioCompatRef[] {
  if (normalized.compatibilitaRefs && normalized.compatibilitaRefs.length > 0) {
    return dedupeCompatRefs(normalized.compatibilitaRefs);
  }
  const legacy = normalizeCompatList(normalized.compatibilitaMezzi ?? []);
  if (legacy.length > 0 && liste) {
    return compatRefsFromExpandedLabels(legacy, liste);
  }
  return [];
}

export type CompatWriteOptions = {
  /** Audit preview (suggestedFix): calcola meta senza warn dev write-guard. */
  auditPreview?: boolean;
};

/**
 * Unico write path SSOT: refs = source of truth, legacy sempre derivato da buildCompatMetaForSave.
 */
export function writeCompatibilitaRicambio(
  input: CompatWriteInput,
  liste: MezziListePrefs | undefined,
  source: string,
  options?: CompatWriteOptions,
): Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi"> {
  const normalized = normalizeCompatWrite(input);
  const { risk } = detectLegacyWriteRisk(normalized, liste);

  if (risk !== "ok" && !options?.auditPreview) {
    devInvariantCompatWriteGuard(source, {
      ricambioId: normalized.ricambioId,
      risk,
      hasListe: !!liste,
    });
  }

  const legacy = normalizeCompatList(normalized.compatibilitaMezzi ?? []);
  const refs = resolveRefs(normalized, liste);

  if (refs.length > 0 && liste) {
    return buildCompatMetaForSave(refs, liste);
  }

  if (refs.length > 0 && !liste) {
    return {
      compatibilitaRefs: refs,
      compatibilitaMezzi: undefined,
    };
  }

  if (legacy.length > 0) {
    if (compatLegacyWriteModeEnabled()) {
      console.warn(`[compat-write-gate] LEGACY_WRITE_MODE active at "${source}"`);
      return {
        compatibilitaMezzi: legacy,
        compatibilitaRefs: undefined,
      };
    }
    return {
      compatibilitaMezzi: legacy,
      compatibilitaRefs: undefined,
    };
  }

  return {
    compatibilitaRefs: undefined,
    compatibilitaMezzi: undefined,
  };
}
