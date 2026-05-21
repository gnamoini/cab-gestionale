/** @deprecated Usare `@/lib/supporto/support-notes-mapper`. */
export { mapSupportNoteToSupportoNote as mapSegnalazioneToSupportoNote } from "@/lib/supporto/support-notes-mapper";

/** @deprecated Risoluzione gestita con `resolved_at` su `support_notes`. */
export function supportoNoteToStato(resolved: boolean): "attiva" | "risolta" {
  return resolved ? "risolta" : "attiva";
}
