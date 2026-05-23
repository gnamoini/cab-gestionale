"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { mapSupportNoteToSupportoNote } from "@/lib/supporto/support-notes-mapper";
import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { supportNotesService } from "@/src/services/support-notes.service";

export function useSupportNotesQuery(): UseQueryResult<SupportoNote[], Error> {
  const { status, user } = useAuth();
  const viewOpts = useViewQueryOpts({ staleTime: 60_000 });

  return useQuery({
    queryKey: QK.supportNotes,
    queryFn: async () => {
      const r = await supportNotesService.list();
      if (!r.success) throw new Error(r.error ?? "Errore caricamento note supporto");
      return (r.data ?? []).map(mapSupportNoteToSupportoNote);
    },
    enabled: isSupabasePublicEnvConfigured() && isAuthSessionEstablished(status) && !!user?.id,
    ...viewOpts,
  });
}
