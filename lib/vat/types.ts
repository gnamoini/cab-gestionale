export type VatDirection = "sales" | "purchase" | "both";

export type VatConfiguration = {
  configuration_id: string;
  vat_code_id: string;
  vat_code: string;
  description: string;
  rate: number;
  nature_code: string | null;
  operation_type_code: string;
  direction: VatDirection;
  deductibility_rate: number;
  vat_account_id: string | null;
  vat_register_id: string | null;
  valid_from: string;
  valid_to: string | null;
  normative_reference: string | null;
};

export type VatLineCalculation = {
  taxable_amount: number;
  vat_rate: number;
  vat_nature: string | null;
  vat_amount: number;
  gross_amount: number;
  deductible_vat_amount: number;
  non_deductible_vat_amount: number;
};

export type VatCodeListItem = {
  vat_code_id: string;
  code: string;
  description: string;
  rate: number;
  nature_code: string | null;
  operation_type_code: string;
  direction: VatDirection;
};

export type VatValidationError = {
  code: string;
  message?: string;
  row_id?: string;
};

export type EsigibilitaIva = "I" | "D" | "S";

export type DocumentFiscalContext = {
  document_type?: string;
  split_payment?: boolean;
  esigibilita_iva?: EsigibilitaIva;
  fiscal_regime_code?: string | null;
};

export const VAT_SNAPSHOT_VERSION = 1;
