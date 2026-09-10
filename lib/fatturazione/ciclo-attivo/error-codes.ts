export const CICLO_ATTIVO_ERROR = {
  COMPANY_FISCAL_PROFILE_MISSING: "COMPANY_FISCAL_PROFILE_MISSING",
  SOURCE_ALREADY_BILLED: "SOURCE_ALREADY_BILLED",
  ACCOUNTING_PERIOD_CLOSED: "ACCOUNTING_PERIOD_CLOSED",
  XML_SCHEMA_INVALID: "XML_SCHEMA_INVALID",
  SDI_REJECTED: "SDI_REJECTED",
  FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED: "FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED",
  PAYMENT_ALLOCATION_INVALID: "PAYMENT_ALLOCATION_INVALID",
  PREVENTIVO_NOT_ACCEPTED: "PREVENTIVO_NOT_ACCEPTED",
} as const;

export type CicloAttivoErrorCode = (typeof CICLO_ATTIVO_ERROR)[keyof typeof CICLO_ATTIVO_ERROR];

const MESSAGES: Record<string, string> = {
  COMPANY_FISCAL_PROFILE_MISSING: "Profilo fiscale azienda mancante. Compilalo in Impostazioni fatturazione.",
  SOURCE_ALREADY_BILLED: "Sorgente già fatturata.",
  SOURCE_ALREADY_FULLY_BILLED: "Sorgente già fatturata per intero.",
  ACCOUNTING_PERIOD_CLOSED: "Periodo contabile chiuso: emissione bloccata.",
  XML_SCHEMA_INVALID: "XML FatturaPA non valido.",
  SDI_REJECTED: "Fattura scartata da SdI: non è fiscalmente valida. Correggi e ritrasmetti lo stesso numero.",
  FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED: "Operazione ammessa solo su documento fiscalmente valido.",
  PAYMENT_ALLOCATION_INVALID: "Allocazione pagamento non valida.",
  PREVENTIVO_NOT_ACCEPTED: "Preventivo non accettato: non fatturabile.",
  VAT_CONFIGURATION_INVALID: "Configurazione IVA non valida.",
};

export function mapCicloAttivoError(message: string): string {
  const code = message.split(":")[0]?.trim() ?? "";
  return MESSAGES[code] ?? message;
}
