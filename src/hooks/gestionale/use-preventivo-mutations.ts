"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { persistPreventivoRecord, removePreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MezzoRow } from "@/src/types/supabase-tables";

export function usePreventivoPersistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      record,
      mezziRows,
      expectedUpdatedAt,
      skipDispatch,
    }: {
      record: PreventivoRecord;
      mezziRows: readonly MezzoRow[];
      expectedUpdatedAt?: string;
      skipDispatch?: boolean;
    }) => {
      const res = await persistPreventivoRecord(record, mezziRows, {
        expectedUpdatedAt,
        queryClient,
        skipDispatch,
      });
      if (!res.ok) throw new Error(res.error);
      return res.record;
    },
  });
}

export function usePreventivoRemoveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await removePreventivoRecord(id, { queryClient });
      if (!res.ok) throw new Error(res.error);
    },
  });
}
