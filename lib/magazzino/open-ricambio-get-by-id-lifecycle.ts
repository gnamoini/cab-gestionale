import type { QueryClient } from "@tanstack/react-query";
import { patchMagazzinoListCache, ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { ServiceResult } from "@/src/services/service-result";

/** Gate generation per getById — invalidazione su cleanup effect, non flag sticky. */
export type OpenRicambioGetByIdGenerationGate = {
  beginAttempt(): number;
  invalidate(): void;
  isCurrent(attemptGen: number): boolean;
};

export function createOpenRicambioGetByIdGenerationGate(): OpenRicambioGetByIdGenerationGate {
  let generation = 0;
  return {
    beginAttempt(): number {
      generation += 1;
      return generation;
    },
    invalidate(): void {
      generation += 1;
    },
    isCurrent(attemptGen: number): boolean {
      return attemptGen === generation;
    },
  };
}

export type OpenRicambioGetByIdOutcome = "success" | "not_found" | "error";

export type OpenRicambioGetByIdApplyInput = {
  attemptGen: number;
  gate: OpenRicambioGetByIdGenerationGate;
  ricambioId: string;
  res: ServiceResult<MagazzinoRicambioRow>;
  listQueryIsError: boolean;
  queryClient: QueryClient;
  listQueryKey: readonly unknown[];
  mezziListe: MezziListePrefs;
  authorName: string;
  onSuccess: (id: string, outcome: string) => void;
  onFailure: (id: string, outcome: string) => void;
};

/** Applica risposta getById solo se la generation è ancora corrente. */
export function applyOpenRicambioGetByIdResult(input: OpenRicambioGetByIdApplyInput): OpenRicambioGetByIdOutcome | null {
  const {
    attemptGen,
    gate,
    ricambioId,
    res,
    listQueryIsError,
    queryClient,
    listQueryKey,
    mezziListe,
    authorName,
    onSuccess,
    onFailure,
  } = input;

  if (!gate.isCurrent(attemptGen)) return null;

  if (!res.success || !res.data) {
    onFailure(ricambioId, listQueryIsError ? "list_error_not_found" : "not_found");
    return "not_found";
  }

  const ui = ricambioUiFromMagazzinoRow(res.data, authorName, mezziListe);
  patchMagazzinoListCache(
    queryClient,
    (prev) => (prev.some((p) => p.id === ui.id) ? prev : [...prev, ui]),
    mezziListe,
    { queryKey: listQueryKey },
  );
  onSuccess(ricambioId, "getById_hit");
  return "success";
}
