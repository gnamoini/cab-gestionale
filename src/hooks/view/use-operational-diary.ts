"use client";

import { operationalDiaryEntry, type OperationalDiaryUpsert } from "@/lib/domain/operational-diary-entry";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { OperationalDiaryEntryRow } from "@/src/types/supabase-tables";

export function operationalDiaryQueryKey(fromYmd?: string, toYmd?: string) {
  return [...QK.operationalDiary, fromYmd ?? "", toYmd ?? ""] as const;
}

export function useOperationalDiaryQuery(input?: { fromYmd?: string; toYmd?: string }) {
  const fromYmd = input?.fromYmd;
  const toYmd = input?.toYmd;
  return useServiceQuery(operationalDiaryQueryKey(fromYmd, toYmd), () =>
    operationalDiaryEntry.list({ fromYmd, toYmd }),
  );
}

export function useOperationalDiaryUpsertMutation(_fromYmd?: string, _toYmd?: string) {
  return useServiceMutation((payload: OperationalDiaryUpsert) => operationalDiaryEntry.upsert(payload), {
    invalidateQueryKeys: [QK.operationalDiary],
  });
}

export type { OperationalDiaryEntryRow, OperationalDiaryUpsert };
