import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { calculateVatDocumentSummary, calculateVatLine } from "@/lib/vat/vat-calculation";
import { resolveEsigibilitaIva } from "@/lib/vat/vat-einvoice-context";
import { buildVatSnapshot } from "@/lib/vat/vat-snapshot.server";
import {
  validateConfigurationCombo,
  validateDocumentTotals,
  validateInvoiceVatForEInvoiceRow,
  validateLineAmounts,
} from "@/lib/vat/vat-validation.server";
import type {
  DocumentFiscalContext,
  VatCodeListItem,
  VatConfiguration,
  VatDirection,
  VatLineCalculation,
  VatValidationError,
} from "@/lib/vat/types";

export type ResolveVatInput = {
  vat_code_id?: string | null;
  vat_code?: string | null;
  operation_date: string;
  direction: VatDirection;
  company_id?: string | null;
};

export async function resolveVatConfiguration(input: ResolveVatInput): Promise<VatConfiguration> {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_resolve_configuration", {
    p_payload: {
      vat_code_id: input.vat_code_id ?? undefined,
      vat_code: input.vat_code ?? undefined,
      operation_date: input.operation_date,
      direction: input.direction,
      company_id: input.company_id ?? undefined,
    },
  });

  if (error) {
    throw new Error(error.message || "VAT_CONFIGURATION_INVALID");
  }

  const cfg = data as Record<string, unknown>;
  const configuration: VatConfiguration = {
    configuration_id: String(cfg.configuration_id),
    vat_code_id: String(cfg.vat_code_id),
    vat_code: String(cfg.vat_code),
    description: String(cfg.description),
    rate: Number(cfg.rate),
    nature_code: cfg.nature_code ? String(cfg.nature_code) : null,
    operation_type_code: String(cfg.operation_type_code),
    direction: cfg.direction as VatDirection,
    deductibility_rate: Number(cfg.deductibility_rate),
    vat_account_id: cfg.vat_account_id ? String(cfg.vat_account_id) : null,
    vat_register_id: cfg.vat_register_id ? String(cfg.vat_register_id) : null,
    valid_from: String(cfg.valid_from),
    valid_to: cfg.valid_to ? String(cfg.valid_to) : null,
    normative_reference: cfg.normative_reference ? String(cfg.normative_reference) : null,
  };

  const comboError = validateConfigurationCombo(configuration);
  if (comboError) {
    throw new Error(comboError.code);
  }

  return configuration;
}

export async function listVatCodesForContext(input: {
  operation_date: string;
  direction: VatDirection;
  company_id?: string | null;
}): Promise<VatCodeListItem[]> {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_list_codes_for_context", {
    p_payload: {
      operation_date: input.operation_date,
      direction: input.direction,
      company_id: input.company_id ?? undefined,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VatCodeListItem[];
}

export async function resolveSuggestedVatCode(input: {
  suggested_vat_code_id: string | null | undefined;
  operation_date: string;
  direction: VatDirection;
}): Promise<VatConfiguration | null> {
  if (!input.suggested_vat_code_id) return null;
  try {
    return await resolveVatConfiguration({
      vat_code_id: input.suggested_vat_code_id,
      operation_date: input.operation_date,
      direction: input.direction,
    });
  } catch {
    return null;
  }
}

export {
  calculateVatLine,
  calculateVatDocumentSummary,
  buildVatSnapshot,
  resolveEsigibilitaIva,
  validateConfigurationCombo,
  validateLineAmounts,
  validateDocumentTotals,
  validateInvoiceVatForEInvoiceRow,
};

export async function validateVatPreConsolidation(invoiceId: string): Promise<{
  ok: boolean;
  errors: VatValidationError[];
}> {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_validate_document", {
    p_invoice_id: invoiceId,
    p_context: {},
  });

  if (error) {
    return { ok: false, errors: [{ code: "VAT_CONFIGURATION_INVALID", message: error.message }] };
  }

  const result = data as { ok: boolean; errors: VatValidationError[] };
  return { ok: Boolean(result.ok), errors: result.errors ?? [] };
}

export async function validateInvoiceVatForEInvoice(invoiceId: string): Promise<{
  ok: boolean;
  errors: VatValidationError[];
}> {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_validate_invoice_for_einvoice", {
    p_invoice_id: invoiceId,
  });

  if (error) {
    return { ok: false, errors: [{ code: "VAT_CONFIGURATION_INVALID", message: error.message }] };
  }

  const result = data as { ok: boolean; errors: VatValidationError[] };
  return { ok: Boolean(result.ok), errors: result.errors ?? [] };
}

export type { VatConfiguration, VatLineCalculation, DocumentFiscalContext };
