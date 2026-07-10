export const IMPORT_ERROR_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type ImportErrorSeverity = (typeof IMPORT_ERROR_SEVERITIES)[number];

export const IMPORT_ERROR_CODES = [
  "AI_TIMEOUT",
  "AI_INVALID_OUTPUT",
  "AI_PARSE_ERROR",
  "AI_NOT_CONFIGURED",
  "FILE_CORRUPTED",
  "FILE_QUARANTINED",
  "DUPLICATE_IMPORT",
  "BUSINESS_VALIDATION_FAILED",
  "PERMISSION_DENIED",
  "TENANT_ACCESS_DENIED",
  "EXECUTION_STUCK",
  "EXECUTION_NOT_FOUND",
  "IMPORT_FILE_NOT_FOUND",
  "COMMIT_FAILED",
  "COMMIT_IDEMPOTENCY_HIT",
  "STORAGE_ERROR",
  "RATE_LIMITED",
  "UNKNOWN",
] as const;

export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number];

export type ImportErrorDefinition = {
  code: ImportErrorCode;
  retryable: boolean;
  severity: ImportErrorSeverity;
  userMessage: string;
  technicalMessage: string;
};

export const IMPORT_ERROR_CATALOG: Record<ImportErrorCode, ImportErrorDefinition> = {
  AI_TIMEOUT: {
    code: "AI_TIMEOUT",
    retryable: true,
    severity: "error",
    userMessage: "L'analisi AI ha impiegato troppo tempo. Riprova.",
    technicalMessage: "Gemini extraction exceeded timeout",
  },
  AI_INVALID_OUTPUT: {
    code: "AI_INVALID_OUTPUT",
    retryable: true,
    severity: "error",
    userMessage: "L'output AI non è valido. Riprova o correggi manualmente.",
    technicalMessage: "AI output failed schema validation",
  },
  AI_PARSE_ERROR: {
    code: "AI_PARSE_ERROR",
    retryable: true,
    severity: "error",
    userMessage: "Impossibile interpretare il documento.",
    technicalMessage: "AI parse/extraction failed",
  },
  AI_NOT_CONFIGURED: {
    code: "AI_NOT_CONFIGURED",
    retryable: false,
    severity: "critical",
    userMessage: "Servizio AI non configurato. Contatta l'amministratore.",
    technicalMessage: "Gemini API key missing",
  },
  FILE_CORRUPTED: {
    code: "FILE_CORRUPTED",
    retryable: false,
    severity: "error",
    userMessage: "Il file non è leggibile o è corrotto.",
    technicalMessage: "File bytes invalid or unreadable",
  },
  FILE_QUARANTINED: {
    code: "FILE_QUARANTINED",
    retryable: false,
    severity: "warning",
    userMessage: "Il file è in quarantena e non può essere elaborato.",
    technicalMessage: "import_files.status=quarantined",
  },
  DUPLICATE_IMPORT: {
    code: "DUPLICATE_IMPORT",
    retryable: false,
    severity: "warning",
    userMessage: "Questo import risulta già presente.",
    technicalMessage: "Duplicate content_hash or semantic_key",
  },
  BUSINESS_VALIDATION_FAILED: {
    code: "BUSINESS_VALIDATION_FAILED",
    retryable: false,
    severity: "warning",
    userMessage: "Alcuni dati richiedono revisione prima del salvataggio.",
    technicalMessage: "BusinessValidator returned blocking issues",
  },
  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    retryable: false,
    severity: "error",
    userMessage: "Permesso negato.",
    technicalMessage: "RBAC denied import operation",
  },
  TENANT_ACCESS_DENIED: {
    code: "TENANT_ACCESS_DENIED",
    retryable: false,
    severity: "critical",
    userMessage: "Accesso negato per questa azienda.",
    technicalMessage: "Cross-tenant access denied",
  },
  EXECUTION_STUCK: {
    code: "EXECUTION_STUCK",
    retryable: true,
    severity: "error",
    userMessage: "Elaborazione bloccata. Usa Riprova dalla dashboard import.",
    technicalMessage: "heartbeat_at exceeded stuck threshold",
  },
  EXECUTION_NOT_FOUND: {
    code: "EXECUTION_NOT_FOUND",
    retryable: false,
    severity: "error",
    userMessage: "Elaborazione import non trovata.",
    technicalMessage: "import_executions row missing",
  },
  IMPORT_FILE_NOT_FOUND: {
    code: "IMPORT_FILE_NOT_FOUND",
    retryable: false,
    severity: "error",
    userMessage: "File import non trovato.",
    technicalMessage: "import_files row missing",
  },
  COMMIT_FAILED: {
    code: "COMMIT_FAILED",
    retryable: true,
    severity: "error",
    userMessage: "Salvataggio import non riuscito.",
    technicalMessage: "Commit transaction failed",
  },
  COMMIT_IDEMPOTENCY_HIT: {
    code: "COMMIT_IDEMPOTENCY_HIT",
    retryable: false,
    severity: "info",
    userMessage: "Import già salvato.",
    technicalMessage: "ImportCommitAdapter idempotency key hit",
  },
  STORAGE_ERROR: {
    code: "STORAGE_ERROR",
    retryable: true,
    severity: "error",
    userMessage: "Errore storage file.",
    technicalMessage: "Supabase storage operation failed",
  },
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    retryable: true,
    severity: "warning",
    userMessage: "Troppe richieste. Attendi qualche minuto.",
    technicalMessage: "Import rate limit exceeded",
  },
  UNKNOWN: {
    code: "UNKNOWN",
    retryable: false,
    severity: "error",
    userMessage: "Errore imprevisto durante l'import.",
    technicalMessage: "Unhandled import error",
  },
};

export function getImportErrorDefinition(code: string | null | undefined): ImportErrorDefinition {
  const key = (code ?? "UNKNOWN") as ImportErrorCode;
  return IMPORT_ERROR_CATALOG[key] ?? IMPORT_ERROR_CATALOG.UNKNOWN;
}

export function importErrorUserMessage(code: string | null | undefined): string {
  return getImportErrorDefinition(code).userMessage;
}
