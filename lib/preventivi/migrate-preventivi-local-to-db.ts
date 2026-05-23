"use client";

import type { QueryClient } from "@tanstack/react-query";
import { clearPreventiviLocalEntityData, loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { persistPreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** Import idempotente localStorage → Supabase (admin / one-shot da impostazioni). */
export async function migratePreventiviLocalToDb(
  mezziRows: readonly MezzoRow[],
  options?: { queryClient?: QueryClient; clearLocalOnSuccess?: boolean },
): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const local = loadPreventivi();
  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of local) {
    const res = await persistPreventivoRecord(p, mezziRows, {
      queryClient: options?.queryClient,
      skipDispatch: true,
    });
    if (res.ok) migrated += 1;
    else {
      skipped += 1;
      errors.push(`${p.numero}: ${res.error}`);
    }
  }

  if (options?.queryClient) {
    dispatchGestionaleLocalMutation(options.queryClient, ["preventivi"]);
  }

  if (options?.clearLocalOnSuccess && local.length > 0 && errors.length === 0) {
    clearPreventiviLocalEntityData();
  }

  return { migrated, skipped, errors };
}
