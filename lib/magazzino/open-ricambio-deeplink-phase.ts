/** Snapshot minimo query lista — testabile senza React Query. */
export type MagazzinoListQuerySnapshot = {
  data: unknown | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
  status: "pending" | "error" | "success";
};

/**
 * La lista è pronta per risolvere openRicambio (lookup o getById).
 * Non assumere isFetching === false ⇒ dato definitivo: con data cached si risolve subito.
 */
export function isMagazzinoListQueryReadyForOpenRicambio(
  q: MagazzinoListQuerySnapshot,
  enabled = true,
): boolean {
  if (!enabled) return false;
  if (q.data !== undefined) return true;
  if (q.isLoading || q.isFetching) return false;
  if (q.fetchStatus === "idle" && q.status === "pending") return false;
  return true;
}

export const MAGAZZINO_QR_OPEN_ERROR_MESSAGE =
  "Impossibile caricare il ricambio. Controlla la connessione e riprova. Se il problema persiste, verifica che l'etichetta QR sia ancora valida.";

export type OpenRicambioDeepLinkStep =
  | { kind: "noop" }
  | { kind: "wait" }
  | { kind: "open_from_list"; id: string }
  | { kind: "fetch_by_id"; id: string };

export type PlanOpenRicambioDeepLinkInput = {
  openId: string | null;
  consumedOpenId: string | null;
  getByIdAttempted: boolean;
  inFlight: boolean;
  prodottiIds: readonly string[];
  listQuery: MagazzinoListQuerySnapshot;
  enabled?: boolean;
};

/** Planner puro per il deep-link openRicambio — SSOT per unit test race/getById. */
export function planOpenRicambioDeepLinkStep(input: PlanOpenRicambioDeepLinkInput): OpenRicambioDeepLinkStep {
  const { openId, consumedOpenId, getByIdAttempted, inFlight, prodottiIds, listQuery, enabled = true } =
    input;
  if (!openId) return { kind: "noop" };
  if (consumedOpenId === openId) return { kind: "noop" };
  if (prodottiIds.includes(openId)) return { kind: "open_from_list", id: openId };
  if (!isMagazzinoListQueryReadyForOpenRicambio(listQuery, enabled)) return { kind: "wait" };
  if (getByIdAttempted || inFlight) return { kind: "noop" };
  return { kind: "fetch_by_id", id: openId };
}
