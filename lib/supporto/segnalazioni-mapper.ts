import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import type { SegnalazioneStato, SegnalazioneWithProfileRow } from "@/src/types/supabase-tables";

const FALLBACK_AUTHOR = "Utente CAB";

export function mapSegnalazioneToSupportoNote(row: SegnalazioneWithProfileRow): SupportoNote {
  const nome = row.profiles?.nome?.trim();
  return {
    id: row.id,
    body: row.messaggio,
    autore: nome || FALLBACK_AUTHOR,
    at: row.created_at,
    resolved: row.stato === "risolta",
  };
}

export function supportoNoteToStato(resolved: boolean): SegnalazioneStato {
  return resolved ? "risolta" : "attiva";
}
