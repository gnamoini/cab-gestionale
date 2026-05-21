"use client";

import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { persistPreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** Import idempotente localStorage → Supabase (admin / primo avvio). */
export async function migratePreventiviLocalToDb(
  mezziRows: readonly MezzoRow[],
): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const local = loadPreventivi();
  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of local) {
    const res = await persistPreventivoRecord(p, mezziRows, { skipDb: false });
    if (res.ok) migrated += 1;
    else {
      skipped += 1;
      errors.push(`${p.numero}: ${res.error}`);
    }
  }

  return { migrated, skipped, errors };
}
