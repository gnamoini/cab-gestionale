"use client";

import type { QueryClient } from "@tanstack/react-query";
import { magazzinoListQueryKey, mapMagazzinoRowsToUI, patchMagazzinoListCache } from "@/lib/magazzino/magazzino-list-cache";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
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
};

const queues = new Map<string, QueueEntry>();

function getQueue(ricambioId: string): QueueEntry {
  let q = queues.get(ricambioId);
  if (!q) {
    q = { primaAtBurstStart: null, label: "", syncing: false };
    queues.set(ricambioId, q);
  }
  return q;
}

function readScortaFromCache(qc: QueryClient, ricambioId: string, autore: string): number | null {
  const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
  if (!rows) return null;
  const row = mapMagazzinoRowsToUI(rows, autore).find((p) => p.id === ricambioId);
  return row ? Math.max(0, Math.round(row.scorta)) : null;
}

/** Patch ottimistico scorta — usa sempre l’updater funzionale sulla cache. */
export function applyScortaOptimisticDelta(
  qc: QueryClient,
  ricambioId: string,
  delta: number,
  autore: string,
  touch: ScortaOptimisticTouch,
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
  );

  if (found) {
    markRecentLocalGestionaleMutation(["magazzino_ricambi"], ricambioId);
  }

  const q = getQueue(ricambioId);
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
  }) => void;
  onError?: (input: { ricambioId: string; error: string }) => void;
  invalidate?: (cabEvents: CabSyncEvent[]) => void;
};

/** Attende che la coda sync per il ricambio sia vuota (es. prima di undo scorta). */
export function awaitScortaSyncDrain(ricambioId: string): Promise<void> {
  const q = queues.get(ricambioId);
  if (!q?.syncing) return Promise.resolve();
  return new Promise((resolve) => {
    const poll = () => {
      const cur = queues.get(ricambioId);
      if (!cur?.syncing) {
        resolve();
        return;
      }
      setTimeout(poll, 40);
    };
    poll();
  });
}

async function revertScortaFromServer(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
): Promise<void> {
  const got = await magazzinoService.getById(ricambioId);
  if (!got.success || !got.data) return;
  const q = Math.max(0, Math.round(Number(got.data.quantita) || 0));
  patchMagazzinoListCache(
    qc,
    (prev) => prev.map((p) => (p.id === ricambioId ? { ...p, scorta: q } : p)),
    autore,
  );
}

async function runScortaSyncWorker(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  callbacks: ScortaSyncCallbacks,
): Promise<void> {
  const q = getQueue(ricambioId);
  q.syncing = true;
  let hadError = false;

  try {
    for (;;) {
      const targetQuantita = readScortaFromCache(qc, ricambioId, autore);
      if (targetQuantita === null) break;

      const res = await magazzinoService.update(ricambioId, { quantita: targetQuantita });
      if (!res.success) {
        hadError = true;
        callbacks.onError?.({ ricambioId, error: res.error ?? "Aggiornamento scorta non riuscito." });
        await revertScortaFromServer(qc, ricambioId, autore);
        break;
      }

      const serverQ = Math.max(0, Math.round(Number(res.data!.quantita) || 0));
      let cacheAfter = readScortaFromCache(qc, ricambioId, autore);
      if (cacheAfter === serverQ) {
        patchMagazzinoListCache(
          qc,
          (prev) => prev.map((p) => (p.id === ricambioId ? { ...p, scorta: serverQ } : p)),
          autore,
        );
        cacheAfter = serverQ;
      }

      if (cacheAfter === serverQ) break;
    }

    if (!hadError) {
      const burstPrima = q.primaAtBurstStart;
      const burstLabel = q.label;
      const finalDopo = readScortaFromCache(qc, ricambioId, autore);

      if (burstPrima !== null && finalDopo !== null && burstPrima !== finalDopo) {
        callbacks.onPersisted?.({
          ricambioId,
          label: burstLabel,
          prima: burstPrima,
          dopo: finalDopo,
        });
      }

      callbacks.invalidate?.([]);
    }
  } finally {
    q.syncing = false;
    q.primaAtBurstStart = null;
  }
}

/** Accoda sync verso server; UI già aggiornata da `applyScortaOptimisticDelta`. */
export function enqueueScortaSync(
  qc: QueryClient,
  ricambioId: string,
  autore: string,
  callbacks: ScortaSyncCallbacks = {},
): void {
  const q = getQueue(ricambioId);
  if (q.syncing) return;
  void runScortaSyncWorker(qc, ricambioId, autore, callbacks);
}

/** Solo per test — reset stato globale code. */
export function resetScortaSyncQueuesForTest(): void {
  queues.clear();
}
