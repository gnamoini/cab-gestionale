import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import type { SupportNoteWithProfileRow } from "@/src/types/supabase-tables";

const FALLBACK_AUTHOR = "Utente CAB";

export function mapSupportNoteToSupportoNote(row: SupportNoteWithProfileRow): SupportoNote {
  const nome = row.profiles?.nome?.trim();
  return {
    id: row.id,
    body: row.content,
    autore: nome || FALLBACK_AUTHOR,
    at: row.created_at,
    updatedAt: row.updated_at,
    resolved: row.resolved_at != null,
  };
}
