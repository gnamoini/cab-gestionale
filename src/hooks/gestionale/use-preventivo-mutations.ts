"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { persistPreventivoRecord, removePreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MezzoGestito } from "@/lib/mezzi/types";

export function usePreventivoPersistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      record,
      mezziGestiti,
      expectedUpdatedAt,
      skipDispatch,
    }: {
      record: PreventivoRecord;
      mezziGestiti: readonly MezzoGestito[];
      expectedUpdatedAt?: string;
      skipDispatch?: boolean;
    }) => {
      const res = await persistPreventivoRecord(record, mezziGestiti, {
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
