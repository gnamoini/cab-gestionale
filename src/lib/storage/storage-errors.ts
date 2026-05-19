import type { StorageBucketId } from "@/src/lib/storage/storage-config";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function isBucketNotFoundError(error: unknown): boolean {
  const msg = errorMessage(error).toLowerCase();
  return msg.includes("bucket not found") || msg.includes("bucket_not_found");
}

export function isStoragePolicyError(error: unknown): boolean {
  const msg = errorMessage(error).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("new row violates") ||
    (msg.includes("policy") && msg.includes("storage"))
  );
}

/** Messaggi leggibili al posto di errori Supabase Storage grezzi. */
export function mapStorageError(error: unknown, bucket?: StorageBucketId): string {
  const raw = errorMessage(error).trim();
  const msg = raw.toLowerCase();

  if (isBucketNotFoundError(error)) {
    if (bucket === "images") return "Storage immagini non configurato. Esegui le migration Supabase o contatta l'amministratore.";
    if (bucket === "documenti") return "Bucket documenti mancante. Configurazione upload incompleta.";
    return "Configurazione upload incompleta. Storage Supabase non disponibile.";
  }

  if (isStoragePolicyError(error)) {
    return "Permesso storage negato. Verifica di essere autenticato e di avere i permessi necessari.";
  }

  if (msg.includes("payload too large") || msg.includes("entity too large") || msg.includes("file size")) {
    return "File troppo grande per il limite di storage configurato.";
  }

  if (msg.includes("invalid key") || msg.includes("invalid object path") || msg.includes("invalid file path")) {
    return "Percorso file non valido.";
  }

  if (msg.includes("already exists") || msg.includes("duplicate")) {
    return "Un file con lo stesso nome esiste già.";
  }

  if (msg.includes("not found") && msg.includes("object")) {
    return "File non trovato nello storage.";
  }

  return raw || "Errore storage sconosciuto.";
}
