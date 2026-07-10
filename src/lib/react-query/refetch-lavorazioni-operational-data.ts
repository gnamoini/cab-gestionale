"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

export const LAVORAZIONI_TOOLBAR_REFRESH_TIMEOUT_MS = 25_000;

export function isCoreLavorazioniOperationalQueryKey(key: QueryKey): boolean {
  const root = key[0];
  return (
    root === QK.lavorazioniQueries[0] ||
    root === QK.schede[0] ||
    root === QK.magazzino[0] ||
    root === QK.movimenti[0] ||
    root === QK.preventivi[0] ||
    root === QK.log[0] ||
    root === QK.mezzi[0]
  );
}

/** Dettaglio, documenti PDF e foto lavorazione — portale clienti. */
export function isClientPortalLavorazioniQueryKey(key: QueryKey): boolean {
  const root = key[0];
  return (
    root === QK.clientLavorazioniDetail[0] ||
    root === QK.clientLavorazioneDocuments[0] ||
    root === QK.clientLavorazionePhotos[0]
  );
}

export function clientPortalRefreshQueryKey(key: QueryKey): boolean {
  return isCoreLavorazioniOperationalQueryKey(key) || isClientPortalLavorazioniQueryKey(key);
}

export function lavorazioniOperationalQueryKey(key: QueryKey, includeClientPortal = false): boolean {
  return includeClientPortal ? clientPortalRefreshQueryKey(key) : isCoreLavorazioniOperationalQueryKey(key);
}

function firstRefetchError(results: unknown[]): Error | null {
  for (const r of results) {
    if (r && typeof r === "object" && "error" in r) {
      const err = (r as { error?: unknown }).error;
      if (err) return err instanceof Error ? err : new Error(String(err));
    }
  }
  return null;
}

/** Esegue i refetch del toolbar con timeout — evita spinner bloccato. */
export async function runLavorazioniToolbarRefresh(tasks: Promise<unknown>[]): Promise<void> {

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const results = await Promise.race([
      Promise.all(tasks),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Aggiornamento scaduto. Riprova.")),
          LAVORAZIONI_TOOLBAR_REFRESH_TIMEOUT_MS,
        );
      }),
    ]);
    const err = firstRefetchError(Array.isArray(results) ? results : []);
    if (err) throw err;
  } catch (e) {
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Refetch mirato portale clienti: solo query attive (foto/documenti visibili). */
export function refetchActiveClientPortalMedia(qc: QueryClient): Promise<void> {
  return qc.refetchQueries({
    predicate: (query) => isClientPortalLavorazioniQueryKey(query.queryKey),
    type: "active",
  });
}

/** Refetch bundle schede montati in pagina. */
export function refetchActiveSchedeBundles(qc: QueryClient): Promise<void> {
  return qc.refetchQueries({ queryKey: QK.schede, type: "active" });
}
