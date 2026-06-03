/**
 * ALLOWLIST — accesso diretto a compatibilitaMezzi in LETTURA consentito SOLO in:
 * - parseMagazzinoRicambioMeta (parse DB in ingresso)
 * - form.ts, ricambio-form-fields.tsx (form state, non persistito)
 * - magazzino-view undo/diff/heal dry-run
 * - log-summary.ts (audit payload storico)
 * - test fixtures
 *
 * Per display/filter/search/sort usare readCompat*ForUi().
 * Per write persistiti usare writeCompatibilitaRicambio() (compat-write-gate.ts).
 */
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { CompatInput } from "@/lib/magazzino/compat/compat-types";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";

export type CompatReadContext = {
  ricambioId?: string;
  hasListePrefs?: boolean;
  accessKind?: "labels" | "sortKey" | "display" | "searchIndex";
};

const warnedSources = new Set<string>();

/** @internal Solo test — reset dedupe sessione guard. */
export function resetCompatReadGuardWarningsForTest(): void {
  warnedSources.clear();
}

export function devInvariantCompatReadGuard(source: string, context?: CompatReadContext): void {
  if (process.env.NODE_ENV === "production") return;

  const accessKind = context?.accessKind ?? "labels";
  const key = `${source}:${accessKind}`;
  if (warnedSources.has(key)) return;
  warnedSources.add(key);

  const stack = new Error("[compat-read-guard]").stack;
  console.warn(
    `[compat-read-guard] Legacy compat read bypassed — use readCompat*ForUi() at "${source}"`,
    context,
    stack,
  );
}

function guardIfMissingListe(
  source: string,
  liste: MezziListePrefs | undefined,
  accessKind: CompatReadContext["accessKind"],
  ricambioId?: string,
): void {
  if (!liste) {
    devInvariantCompatReadGuard(source, { hasListePrefs: false, accessKind, ricambioId });
  }
}

export function readCompatLabelsForUi(
  ricambio: CompatInput & { id?: string },
  liste: MezziListePrefs | undefined,
  source: string,
): string[] {
  guardIfMissingListe(source, liste, "labels", ricambio.id);
  return resolveCompatibilitaRicambio(ricambio, liste).labels;
}

export function readCompatSortKeyForUi(
  ricambio: CompatInput & { id?: string },
  liste: MezziListePrefs | undefined,
  source: string,
): string {
  guardIfMissingListe(source, liste, "sortKey", ricambio.id);
  return resolveCompatibilitaRicambio(ricambio, liste).sortKey;
}

export function readCompatDisplayForUi(
  ricambio: CompatInput & { id?: string },
  liste: MezziListePrefs | undefined,
  source: string,
): string {
  guardIfMissingListe(source, liste, "display", ricambio.id);
  return resolveCompatibilitaRicambio(ricambio, liste).display;
}
