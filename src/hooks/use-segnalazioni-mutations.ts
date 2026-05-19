"use client";

import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { segnalazioniService, type SegnalazioneInsert } from "@/src/services/segnalazioni.service";
import type { SegnalazioneStato } from "@/src/types/supabase-tables";

const invalidate = [QK.segnalazioni] as const;

export function useCreateSegnalazioneMutation() {
  return useServiceMutation((input: SegnalazioneInsert) => segnalazioniService.create(input), {
    invalidateQueryKeys: invalidate,
  });
}

export function useSetSegnalazioneStatoMutation() {
  return useServiceMutation(({ id, stato }: { id: string; stato: SegnalazioneStato }) => segnalazioniService.setStato(id, stato), {
    invalidateQueryKeys: invalidate,
  });
}

export function useDeleteSegnalazioneMutation() {
  return useServiceMutation((id: string) => segnalazioniService.softDelete(id), {
    invalidateQueryKeys: invalidate,
  });
}
