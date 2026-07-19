"use client";

import type { QueryClient } from "@tanstack/react-query";
import { magazzinoListQueryKey, mapMagazzinoRowsToUI, patchMagazzinoListCache } from "@/lib/magazzino/magazzino-list-cache";
import { applyScortaDeltaViaMovimento } from "@/lib/magazzino/scorta-movement";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { magazzinoService } from "@/src/services/magazzino.service";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";

export type ScortaOptimisticTouch = (row: RicambioMagazzino) => RicambioMagazzino;

export type ApplyScortaDeltaResult = {
  ricambioId: string;
  prima: number;
  dopo: number;
  label: string;
  found: boolean;
};

type QueueEntry = {
  primaAtBurstStart: number | null;
  label: string;
  syncing: boolean;
  /** ponytail: primo enqueue del burst — toggle mid-burst non splitta il flag. */
  contaStatistiche: boolean;
};

const queues = new Map<string, QueueEntry>();

function getQueue(ricambioId: string, contaStatistiche: boolean): QueueEntry {
  let q = queues.get(ricambioId);
  if (!q) {
    q = { primaAtBurstStart: null, label: "", syncing: false, contaStatistiche };
    queues.set(ricambioId, q);
  }
  return q;
}

function readScortaFromCache(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  mezziListe?: MezziListePrefs,
): number | null {
  const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
  if (!rows) return null;
  const row = mapMagazzinoRowsToUI(rows, autore, mezziListe).find((p) => p.id === ricambioId);
  return row ? Math.max(0, Math.round(row.scorta)) : null;
}

/** Patch ottimistico scorta — usa sempre l’updater funzionale sulla cache. */
export function applyScortaOptimisticDelta(
  qc: QueryClient,
  ricambioId: string,
  delta: number,
  autore: string,
  touch: ScortaOptimisticTouch,
  mezziListe?: MezziListePrefs,
  contaStatistiche = false,
): ApplyScortaDeltaResult {
  let prima = 0;
  let dopo = 0;
  let label = "";
  let found = false;

  patchMagazzinoListCache(
    qc,
    (prev) => {
      const row = prev.find((p) => p.id === ricambioId);
      if (!row) return prev;
      found = true;
      prima = Math.round(row.scorta);
      dopo = Math.max(0, prima + Math.round(delta));
      label = row.descrizione;
      return prev.map((p) => (p.id === ricambioId ? touch({ ...p, scorta: dopo }) : p));
    },
    autore,
    mezziListe,
    { quantitaOnly: true },
  );

  if (found) {
    markRecentLocalGestionaleMutation(["magazzino_ricambi"], ricambioId);
  }

  const q = getQueue(ricambioId, contaStatistiche);
  if (found) {
    if (q.primaAtBurstStart === null) q.primaAtBurstStart = prima;
    q.label = label;
  }

  return { ricambioId, prima, dopo, label, found };
}

export type ScortaSyncCallbacks = {
  onPersisted?: (input: {
    ricambioId: string;
    label: string;
    prima: number;
    dopo: number;
    contaStatistiche: boolean;
  }) => void;
  onError?: (input: { ricambioId: string; error: string }) => void;
  invalidate?: (cabEvents: CabSyncEvent[]) => void;
};

async function revertScortaFromServer(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  mezziListe?: MezziListePrefs,
): Promise<void> {
  const got = await magazzinoService.getById(ricambioId);
  if (!got.success || !got.data) return;
  const q = Math.max(0, Math.round(Number(got.data.quantita) || 0));
  patchMagazzinoListCache(
    qc,
    (prev) => prev.map((p) => (p.id === ricambioId ? { ...p, scorta: q } : p)),
    autore,
    mezziListe,
    { quantitaOnly: true },
  );
}

async function runScortaSyncWorker(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  callbacks: ScortaSyncCallbacks,
  contaStatistiche: boolean,
  mezziListe?: MezziListePrefs,
): Promise<void> {
  const q = getQueue(ricambioId, contaStatistiche);
  q.syncing = true;
  let hadError = false;

  try {
    for (;;) {
      const targetQuantita = readScortaFromCache(qc, ricambioId, autore, mezziListe);
      if (targetQuantita === null) break;

      const before = await magazzinoService.getById(ricambioId);
      if (!before.success || !before.data) {
        hadError = true;
        callbacks.onError?.({ ricambioId, error: before.error ?? "Ricambio non trovato." });
        await revertScortaFromServer(qc, ricambioId, autore, mezziListe);
        break;
      }
      const serverQ = Math.max(0, Math.round(Number(before.data.quantita) || 0));
      const delta = targetQuantita - serverQ;
      if (delta === 0) break;

      const moved = await applyScortaDeltaViaMovimento(ricambioId, delta, contaStatistiche);
      if (!moved.success) {
        hadError = true;
        callbacks.onError?.({ ricambioId, error: moved.error ?? "Aggiornamento scorta non riuscito." });
        await revertScortaFromServer(qc, ricambioId, autore, mezziListe);
        break;
      }

      const serverQ2 = moved.data!;
      patchMagazzinoListCache(
        qc,
        (prev) => prev.map((p) => (p.id === ricambioId ? { ...p, scorta: serverQ2 } : p)),
        autore,
        mezziListe,
        { quantitaOnly: true },
      );

      const cacheAfter = readScortaFromCache(qc, ricambioId, autore, mezziListe);
      if (cacheAfter === serverQ2) break;
    }

    if (!hadError) {
      const burstPrima = q.primaAtBurstStart;
      const burstLabel = q.label;
      const finalDopo = readScortaFromCache(qc, ricambioId, autore, mezziListe);

      if (burstPrima !== null && finalDopo !== null && burstPrima !== finalDopo) {
        callbacks.onPersisted?.({
          ricambioId,
          label: burstLabel,
          prima: burstPrima,
          dopo: finalDopo,
          contaStatistiche,
        });
      }

      callbacks.invalidate?.([]);
    }
  } finally {
    q.syncing = false;
    q.primaAtBurstStart = null;
    queues.delete(ricambioId);
  }
}

export function getScortaSyncQueueSize(): number {
  return queues.size;
}

/** Accoda sync verso server; UI già aggiornata da `applyScortaOptimisticDelta`. */
export function enqueueScortaSync(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  callbacks: ScortaSyncCallbacks = {},
  mezziListe?: MezziListePrefs,
  contaStatistiche = false,
): void {
  const q = getQueue(ricambioId, contaStatistiche);
  if (q.syncing) return;
  void runScortaSyncWorker(qc, ricambioId, autore, callbacks, q.contaStatistiche, mezziListe);
}

/** Reset code scorta (logout / test). */
export function clearScortaSyncQueues(): void {
  queues.clear();
}

/** @deprecated Usare `clearScortaSyncQueues`. */
export function resetScortaSyncQueuesForTest(): void {
  clearScortaSyncQueues();
}
