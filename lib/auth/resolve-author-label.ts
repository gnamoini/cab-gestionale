import { profileDisplayName } from "@/lib/auth/profile-display-name";

export type AuthorProfileSlice = {
  nome?: string | null;
  cognome?: string | null;
} | null;

export type ResolveAuthorLabelInput = {
  /** UUID autore dal record/evento — mai dal viewer. */
  userId?: string | null;
  /** Snapshot al momento della write (es. autore_nome_snapshot). */
  snapshotName?: string | null;
  /** Join profilo opzionale. */
  profile?: AuthorProfileSlice;
  /** Viewer corrente — solo per etichetta «Tu». */
  viewerId?: string | null;
  viewerDisplayName?: string | null;
  /** Etichetta se autore_id assente (default «Sistema»). */
  systemLabel?: string;
  /** Etichetta se UUID senza profilo (default «Utente»). */
  unknownUserLabel?: string;
};

/**
 * SSOT display autore: snapshot → profilo → «Tu» (solo match viewer) → fallback.
 * Il viewer non sostituisce mai un autore storico non risolto.
 */
export function resolveAuthorLabel(input: ResolveAuthorLabelInput): string {
  const systemLabel = input.systemLabel ?? "Sistema";
  const unknownUserLabel = input.unknownUserLabel ?? "Utente";

  const snapshot = input.snapshotName?.trim();
  if (snapshot) {
    if (input.userId && input.viewerId && input.userId === input.viewerId) {
      return input.viewerDisplayName?.trim() || snapshot || "Tu";
    }
    return snapshot;
  }

  const profileNome = input.profile
    ? profileDisplayName({
        nome: input.profile.nome ?? "",
        cognome: input.profile.cognome,
      })
    : "";

  if (input.userId && input.viewerId && input.userId === input.viewerId) {
    return input.viewerDisplayName?.trim() || profileNome || "Tu";
  }
  if (profileNome) return profileNome;
  if (input.userId?.trim()) return unknownUserLabel;
  return systemLabel;
}
