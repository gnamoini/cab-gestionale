"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { mapSupportNoteToSupportoNote } from "@/lib/supporto/support-notes-mapper";
import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { supportNotesService } from "@/src/services/support-notes.service";

export function useSupportNotesQuery(): UseQueryResult<SupportoNote[], Error> {
  const { status, user } = useAuth();

  return useQuery({
    queryKey: QK.supportNotes,
    queryFn: async () => {
      const r = await supportNotesService.list();
      if (!r.success) throw new Error(r.error ?? "Errore caricamento note supporto");
      return (r.data ?? []).map(mapSupportNoteToSupportoNote);
    },
    enabled: isSupabasePublicEnvConfigured() && isAuthSessionEstablished(status) && !!user?.id,
    staleTime: 8_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 25_000,
    retry: 2,
  });
}
