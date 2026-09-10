import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type AccountingEntryLineInput = {
  account_id?: string | null;
  account_code?: string;
  description?: string | null;
  debit: number;
  credit: number;
};

export type AccountingCreateEntryInput = {
  journal_id: string;
  cause_id?: string | null;
  competence_date?: string;
  registration_date?: string;
  description?: string;
  source_type?: string | null;
  source_id?: string | null;
  invoice_id?: string | null;
  entry_origin?: string;
  idempotency_key?: string | null;
  lines: AccountingEntryLineInput[];
};

export type AccountingUpdateEntryInput = AccountingCreateEntryInput & {
  id: string;
};

export type AccountingAdjustmentEntryInput = AccountingCreateEntryInput & {
  corrects_entry_id: string;
  adjustment_date: string;
  reason?: string | null;
};

export type AccountingEntryResult = {
  id: string;
  status: string;
  entry_number?: number;
  fiscal_year?: number;
  fiscal_year_id?: string;
  period_id?: string;
  idempotent?: boolean;
};

export async function accountingCreateEntry(
  input: AccountingCreateEntryInput,
): Promise<AccountingEntryResult> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_create_entry", { p_payload: input });
  if (error) throw error;
  return data as AccountingEntryResult;
}

export async function accountingUpdateEntry(
  input: AccountingUpdateEntryInput,
): Promise<AccountingEntryResult> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_update_entry", { p_payload: input });
  if (error) throw error;
  return data as AccountingEntryResult;
}

export async function accountingGetEntry(entryId: string): Promise<Record<string, unknown>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_get_entry", { p_entry_id: entryId });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function accountingListEntries(
  filters: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ items: unknown[]; total: number; limit: number; offset: number }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_list_entries", { p_filters: filters });
  if (error) throw error;
  return data as { items: unknown[]; total: number; limit: number; offset: number };
}

export async function accountingPostEntry(
  entryId: string,
  idempotencyKey?: string | null,
): Promise<AccountingEntryResult> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_post_entry", {
    p_entry_id: entryId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as AccountingEntryResult;
}

export async function accountingCancelEntry(
  entryId: string,
  reason?: string | null,
): Promise<AccountingEntryResult> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_cancel_entry", {
    p_entry_id: entryId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as AccountingEntryResult;
}

export async function accountingReverseEntry(
  entryId: string,
  reversalDate: string,
  reason?: string | null,
  idempotencyKey?: string | null,
): Promise<Record<string, unknown>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_reverse_entry", {
    p_entry_id: entryId,
    p_reversal_date: reversalDate,
    p_reason: reason ?? null,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function accountingCreateAdjustmentEntry(
  input: AccountingAdjustmentEntryInput,
): Promise<Record<string, unknown>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_create_adjustment_entry", {
    p_payload: input,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}
