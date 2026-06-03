"use client";

import type { QueryClient } from "@tanstack/react-query";
import { clampBunderDocument } from "@/lib/validation/clamp-free-text";
import { BUNDER_DOCUMENTS_STORAGE_KEY } from "@/lib/bunder/constants";
import { loadBunderDocuments, saveBunderDocuments } from "@/lib/bunder/bunder-storage";
import type { BunderCommercialDocument } from "@/lib/bunder/types";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import { bunderService } from "@/src/services/bunder.service";
import { QK } from "@/src/lib/react-query/query-keys";

const MIGRATION_FLAG = "gestionale-bunder-local-migrated-v1";

function markMigrated(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    window.localStorage.removeItem(BUNDER_DOCUMENTS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return true;
  }
}

async function migrateLocalStorageToDb(): Promise<void> {
  if (isMigrated()) return;
  const local = loadBunderDocuments();
  if (local.length === 0) {
    markMigrated();
    return;
  }
  const countRes = await bunderService.count();
  if (countRes.success && (countRes.data ?? 0) > 0) {
    markMigrated();
    return;
  }
  for (const doc of local) {
    await bunderService.upsert(doc);
  }
  markMigrated();
}

function notifyBunderMutation(
  qc: QueryClient | undefined,
  id: string,
  type: "entity_created" | "entity_updated" | "entity_deleted",
  skipDispatch?: boolean,
): void {
  if (!qc || skipDispatch) return;
  dispatchGestionaleLocalMutation(qc, ["bunder_documents"], [
    cabSyncEventForEntity("bunder_documents", id, type, "bunder"),
  ]);
}

export async function fetchBunderDocuments(): Promise<BunderCommercialDocument[]> {
  await migrateLocalStorageToDb();
  const res = await bunderService.getAll();
  if (!res.success) throw new Error(res.error ?? "Caricamento BUNDER non riuscito.");
  return res.data ?? [];
}

export async function persistBunderDocument(
  doc: BunderCommercialDocument,
  options?: { queryClient?: QueryClient; isNew?: boolean; skipDispatch?: boolean },
): Promise<BunderCommercialDocument> {
  const safe = clampBunderDocument(doc);
  const res = options?.isNew ? await bunderService.create(safe) : await bunderService.upsert(safe);
  if (!res.success || !res.data) throw new Error(res.error ?? "Salvataggio BUNDER non riuscito.");
  notifyBunderMutation(
    options?.queryClient,
    doc.id,
    options?.isNew ? "entity_created" : "entity_updated",
    options?.skipDispatch,
  );
  return res.data;
}

export async function removeBunderDocument(
  id: string,
  options?: { queryClient?: QueryClient; skipDispatch?: boolean },
): Promise<void> {
  const res = await bunderService.remove(id);
  if (!res.success) throw new Error(res.error ?? "Eliminazione BUNDER non riuscita.");
  notifyBunderMutation(options?.queryClient, id, "entity_deleted", options?.skipDispatch);
}

/** Fallback offline: scrive solo localStorage (dev/emergenza). */
export function persistBunderDocumentsLocalFallback(docs: BunderCommercialDocument[]): void {
  saveBunderDocuments(docs);
}

export const BUNDER_QUERY_KEY = QK.bunder;
