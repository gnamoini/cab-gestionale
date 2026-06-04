import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

export type DocumentoFileAccessBlockReason =
  | "no_file_linked"
  | "legacy_url_unparsed"
  | "invalid_path";

export type DocumentoFileAccessState = {
  /** Può tentare l'apertura (blob locale o path storage risolvibile). */
  canOpen: boolean;
  hasLocalBlob: boolean;
  hasStoredReference: boolean;
  storagePath: string | null;
  isLegacyHttpUrl: boolean;
  blockReason: DocumentoFileAccessBlockReason | null;
};

export type DocumentoFileOpenFailureCode =
  | "no_path"
  | "legacy_unparsed"
  | "signed_url_failed"
  | "permission_denied"
  | "not_found"
  | "unknown";

export type DocumentoFileOpenResult =
  | { ok: true; href: string }
  | { ok: false; code: DocumentoFileOpenFailureCode; message: string };

const LEGACY_HTTP = /^https?:\/\//i;

export function getDocumentoFileAccessState(
  doc: Pick<DocumentoGestionale, "urlBlob" | "urlDocumento">,
): DocumentoFileAccessState {
  const blob = doc.urlBlob?.trim() ?? "";
  if (blob && /^blob:/i.test(blob)) {
    return {
      canOpen: true,
      hasLocalBlob: true,
      hasStoredReference: false,
      storagePath: null,
      isLegacyHttpUrl: false,
      blockReason: null,
    };
  }

  const raw = doc.urlDocumento?.trim() ?? "";
  if (!raw) {
    return {
      canOpen: false,
      hasLocalBlob: false,
      hasStoredReference: false,
      storagePath: null,
      isLegacyHttpUrl: false,
      blockReason: "no_file_linked",
    };
  }

  const isLegacyHttpUrl = LEGACY_HTTP.test(raw);
  const storagePath = documentoStoragePathFromStored(raw);
  if (!storagePath) {
    return {
      canOpen: false,
      hasLocalBlob: false,
      hasStoredReference: true,
      storagePath: null,
      isLegacyHttpUrl,
      blockReason: isLegacyHttpUrl ? "legacy_url_unparsed" : "invalid_path",
    };
  }

  return {
    canOpen: true,
    hasLocalBlob: false,
    hasStoredReference: true,
    storagePath,
    isLegacyHttpUrl,
    blockReason: null,
  };
}

export function documentoFileAccessBlockLabel(reason: DocumentoFileAccessBlockReason): string {
  switch (reason) {
    case "no_file_linked":
      return "Nessun file collegato al documento.";
    case "legacy_url_unparsed":
      return "URL archivio obsoleto: ricarica il file o contatta l'amministratore.";
    case "invalid_path":
      return "Percorso file non valido in archivio.";
  }
}

export function documentoFileOpenFailureMessage(code: DocumentoFileOpenFailureCode): string {
  switch (code) {
    case "no_path":
      return "File non collegato al documento.";
    case "legacy_unparsed":
      return "URL archivio obsoleto. Ricarica il documento.";
    case "permission_denied":
      return "Permesso negato per aprire il file. Verifica accesso Documenti.";
    case "not_found":
      return "File non trovato nello storage. Potrebbe essere stato eliminato.";
    case "signed_url_failed":
      return "Impossibile aprire il file. Riprova tra poco.";
    case "unknown":
      return "File non disponibile.";
  }
}

/** Classifica errore Supabase Storage per messaggio utente. */
export function classifyDocumentoStorageOpenError(error: unknown): DocumentoFileOpenFailureCode {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message).toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

  if (
    msg.includes("row-level security") ||
    msg.includes("policy") ||
    msg.includes("permission") ||
    msg.includes("403") ||
    msg.includes("jwt")
  ) {
    return "permission_denied";
  }
  if (msg.includes("not found") || msg.includes("object not found") || msg.includes("404")) {
    return "not_found";
  }
  return "signed_url_failed";
}
