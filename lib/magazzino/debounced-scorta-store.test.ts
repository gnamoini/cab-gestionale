import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  __testGetDebouncedScortaRow,
  acquireDebouncedScortaSubscriber,
  clearDebouncedScortaStoreForTest,
  commitDebouncedScortaNow,
  DEBOUNCED_SCORTA_MS,
  decrementDebouncedScorta,
  incrementDebouncedScorta,
  getDebouncedScortaSnapshot,
  initDebouncedScortaRow,
  releaseDebouncedScortaSubscriber,
  setDebouncedScortaQuantity,
  syncDebouncedScortaServerQuantity,
  flushDebouncedScorta,
} from "@/lib/magazzino/debounced-scorta-store";
import type { StockAdjustMutationOutcome } from "@/src/hooks/gestionale/use-stock-adjust-mutation-types";

const RICAMBIO_ID = "11111111-1111-4111-8111-111111111111";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupRow(serverQuantity = 10) {
  const qc = new QueryClient();
  let commits = 0;
  const adjustDelta = async (): Promise<StockAdjustMutationOutcome> => {
    commits += 1;
    const row = __testGetDebouncedScortaRow(RICAMBIO_ID)!;
    const next = row.displayQuantity;
    return { ok: true, data: { ricambioId: RICAMBIO_ID, quantita: next, stockVersion: commits, movimentoId: null, operationId: crypto.randomUUID() } };
  };
  acquireDebouncedScortaSubscriber(RICAMBIO_ID, serverQuantity, {
    ricambioLabel: "Test",
    contaStatistiche: true,
    debounceMs: 50,
    enabled: true,
    callbacks: {
      onPersistLog: () => {},
      onRemoveLog: () => {},
      onCommitSuccess: () => {},
      onCommitError: () => {},
    },
    commitDeps: { qc, adjustDelta },
  });
  return { qc, getCommits: () => commits, adjustDelta };
}

async function run(): Promise<void> {
  clearDebouncedScortaStoreForTest();

  const snap = initDebouncedScortaRow(RICAMBIO_ID, 10, {
    ricambioLabel: "Test",
    contaStatistiche: false,
  });
  assert.equal(snap.displayQuantity, 10);
  assert.equal(snap.isDirty, false);
  const snapAgain = getDebouncedScortaSnapshot(RICAMBIO_ID);
  assert.equal(snapAgain, snap, "snapshot ref stable when values unchanged");
  clearDebouncedScortaStoreForTest();

  {
    const { getCommits } = setupRow(10);
    for (let i = 0; i < 20; i++) incrementDebouncedScorta(RICAMBIO_ID);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 30);
    await flushDebouncedScorta(RICAMBIO_ID);
    assert.equal(getCommits(), 1);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  {
    setupRow(10);
    incrementDebouncedScorta(RICAMBIO_ID);
    decrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    decrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 12);
    await commitDebouncedScortaNow(RICAMBIO_ID);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.serverQuantity, 12);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  {
    const { getCommits } = setupRow(10);
    await commitDebouncedScortaNow(RICAMBIO_ID);
    assert.equal(getCommits(), 0);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  {
    const qc = new QueryClient();
    acquireDebouncedScortaSubscriber(RICAMBIO_ID, 10, {
      ricambioLabel: "Test",
      contaStatistiche: false,
      debounceMs: 50,
      enabled: true,
      callbacks: {
        onPersistLog: () => {},
        onRemoveLog: () => {},
        onCommitSuccess: () => {},
        onCommitError: () => {},
      },
      commitDeps: {
        qc,
        adjustDelta: async () => ({ ok: false, error: "fail" }),
      },
    });
    incrementDebouncedScorta(RICAMBIO_ID);
    await commitDebouncedScortaNow(RICAMBIO_ID);
    const row = __testGetDebouncedScortaRow(RICAMBIO_ID)!;
    assert.equal(row.displayQuantity, 11);
    assert.equal(row.serverQuantity, 10);
    assert.equal(row.isCommitting, false);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  {
    const { getCommits } = setupRow(5);
    incrementDebouncedScorta(RICAMBIO_ID);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    await sleep(20);
    assert.equal(getCommits(), 1);
    clearDebouncedScortaStoreForTest();
  }

  {
    initDebouncedScortaRow(RICAMBIO_ID, 10, { ricambioLabel: "T", contaStatistiche: false });
    syncDebouncedScortaServerQuantity(RICAMBIO_ID, 15);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 15);
    incrementDebouncedScorta(RICAMBIO_ID);
    syncDebouncedScortaServerQuantity(RICAMBIO_ID, 20);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 16);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.serverQuantity, 20);
    clearDebouncedScortaStoreForTest();
  }

  {
    setupRow(10);
    setDebouncedScortaQuantity(RICAMBIO_ID, 25);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 25);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  {
    const qc = new QueryClient();
    let resolveFirst: ((v: StockAdjustMutationOutcome) => void) | null = null;
    let call = 0;
    acquireDebouncedScortaSubscriber(RICAMBIO_ID, 10, {
      ricambioLabel: "Test",
      contaStatistiche: false,
      debounceMs: 50,
      enabled: true,
      callbacks: {
        onPersistLog: () => {},
        onRemoveLog: () => {},
        onCommitSuccess: () => {},
        onCommitError: () => {},
      },
      commitDeps: {
        qc,
        adjustDelta: () => {
          call += 1;
          if (call === 1) {
            return new Promise<StockAdjustMutationOutcome>((resolve) => {
              resolveFirst = resolve;
            });
          }
          const row = __testGetDebouncedScortaRow(RICAMBIO_ID)!;
          return Promise.resolve({
            ok: true,
            data: {
              ricambioId: RICAMBIO_ID,
              quantita: row.displayQuantity,
              stockVersion: call,
              movimentoId: null,
              operationId: crypto.randomUUID(),
            },
          });
        },
      },
    });
    incrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    void commitDebouncedScortaNow(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    incrementDebouncedScorta(RICAMBIO_ID);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.displayQuantity, 15);
    resolveFirst!({
      ok: true,
      data: { ricambioId: RICAMBIO_ID, quantita: 13, stockVersion: 1, movimentoId: null, operationId: crypto.randomUUID() },
    });
    await sleep(30);
    assert.equal(__testGetDebouncedScortaRow(RICAMBIO_ID)!.serverQuantity, 15);
    releaseDebouncedScortaSubscriber(RICAMBIO_ID);
    clearDebouncedScortaStoreForTest();
  }

  console.log("debounced-scorta-store.test.ts OK");
}

void run();
