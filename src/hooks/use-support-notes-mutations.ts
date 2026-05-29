"use client";

import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { QK } from "@/src/lib/react-query/invalidate-related";
import {
  SUPPORT_NOTE_CONCURRENCY_CONFLICT,
  supportNotesService,
  type SupportNoteInsert,
} from "@/src/services/support-notes.service";

const invalidate = [[...QK.supportNotes]] as const;

function useSupportNoteConflictToast() {
  const gestToast = useGestionaleToast();
  return (message: string) => {
    if (message === SUPPORT_NOTE_CONCURRENCY_CONFLICT) {
      gestToast.warning("Un altro utente ha aggiornato questa nota. Ricarica la pagina.");
    }
  };
}

export function useCreateSupportNoteMutation() {
  return useServiceMutation((input: SupportNoteInsert) => supportNotesService.create(input), {
    invalidateQueryKeys: invalidate,
  });
}

export function useUpdateSupportNoteContentMutation() {
  const onConflict = useSupportNoteConflictToast();
  return useServiceMutation(
    ({ id, content, expectedUpdatedAt }: { id: string; content: string; expectedUpdatedAt: string }) =>
      supportNotesService.updateContent(id, content, expectedUpdatedAt),
    {
      invalidateQueryKeys: invalidate,
      onError: (e) => onConflict(e.message),
    },
  );
}

export function useSetSupportNoteResolvedMutation() {
  return useServiceMutation(({ id, resolved }: { id: string; resolved: boolean }) => supportNotesService.setResolved(id, resolved), {
    invalidateQueryKeys: invalidate,
  });
}

export function useDeleteSupportNoteMutation() {
  return useServiceMutation((id: string) => supportNotesService.softDelete(id), {
    invalidateQueryKeys: invalidate,
  });
}
