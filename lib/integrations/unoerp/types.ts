export const UNOERP_ALLOWED_ACTS = ["info", "index", "show", "create", "update"] as const;

export type UnoerpAct = (typeof UNOERP_ALLOWED_ACTS)[number];

export type CabDocumentType = "preventivo" | "consuntivo" | "ddt";

export type UnoerpJobOperation = "CREATE" | "UPDATE";

export type UnoerpSyncStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PROCESSING"
  | "PERSISTED"
  | "VERIFIED"
  | "SYNCED"
  | "RETRYABLE_ERROR"
  | "BLOCKED"
  | "CONFLICT"
  | "MANUAL_REVIEW"
  | "STALE_JOB"
  | "CREATE_RECOVERED"
  | "CAB_DDT_CANCELLED_AFTER_SYNC"
  | "CAB_DOCUMENT_REMOVED";

export type UnoerpErrorCode =
  | "UNOERP_AUTH_ERROR"
  | "UNOERP_NETWORK_ERROR"
  | "UNOERP_TIMEOUT"
  | "UNOERP_VALIDATION_ERROR"
  | "UNOERP_CUSTOMER_NOT_FOUND"
  | "UNOERP_CUSTOMER_AMBIGUOUS"
  | "UNOERP_CUSTOMER_IDENTITY_DRIFT"
  | "UNOERP_ITEM_MAPPING_MISSING"
  | "UNOERP_ITEM_IDENTITY_DRIFT"
  | "UNOERP_VAT_MAPPING_MISSING"
  | "UNOERP_MODULE_NOT_FOUND"
  | "UNOERP_MODULE_UNRESOLVED"
  | "UNOERP_RECORD_NOT_FOUND"
  | "UNOERP_RECORD_MISSING"
  | "UNOERP_NUMBER_MISMATCH"
  | "UNOERP_MAPPING_CONFLICT"
  | "UNOERP_OWNERSHIP_VIOLATION"
  | "UNOERP_UNSUPPORTED_DOCUMENT_TYPE"
  | "UNOERP_PAYLOAD_FIELD_NOT_ALLOWED"
  | "UNOERP_PREFLIGHT_BLOCKED"
  | "UNOERP_HARD_STOP"
  | "UNOERP_SCHEMA_MISMATCH"
  | "UNOERP_STALE_JOB"
  | "CONSUNTIVO_UNOERP_MAPPING_UNRESOLVED"
  | "INTEGRATION_SCHEMA_MISMATCH"
  | "UNOERP_UNKNOWN_ERROR";

export type UnoerpFieldsetEntry = {
  label?: string | null;
  format?: string;
  insert_ignore?: boolean;
  valori?: unknown;
};

export type UnoerpInfoResponse = {
  uid?: string;
  method?: string;
  info?: {
    primary_key?: string | null;
    fieldset?: Record<string, UnoerpFieldsetEntry>;
  };
};

export type DocumentTypeRegistryEntry = {
  cabDocumentType: CabDocumentType;
  unoerpModule: string | null;
  unoerpFile: string | null;
  unoerpRepresentation: string | null;
  mappingStrategy: string | null;
  resolved: boolean;
};

export type PreflightDecision =
  | { decision: "PREPARED"; reasons: [] }
  | { decision: "BLOCKED"; reasons: UnoerpErrorCode[] };

export type CustomerResolveResult =
  | { ok: true; unoerpCustomerId: string; matchedBy: "mapping" | "partita_iva" | "codice_fiscale" | "codice_cliente" }
  | { ok: false; code: UnoerpErrorCode };

export type FieldOwnership =
  | "CAB_MASTER"
  | "UNOERP_MASTER"
  | "CAB_READ_ONLY"
  | "IMMUTABLE_AFTER_CREATE"
  | "IMMUTABLE_AFTER_CONFIRM"
  | "REFERENCE_ONLY";
