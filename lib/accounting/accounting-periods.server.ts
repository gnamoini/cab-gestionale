import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AccountingFiscalYearRow, AccountingPeriodRow } from "@/src/types/supabase-tables";

export type FiscalYearWithPeriods = AccountingFiscalYearRow & {
  periods: AccountingPeriodRow[];
};

export async function accountingListFiscalPeriods(): Promise<FiscalYearWithPeriods[]> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_list_fiscal_periods");
  if (error) throw error;
  return (data ?? []) as FiscalYearWithPeriods[];
}

export async function accountingOpenFiscalYear(
  year: number,
  startDate?: string | null,
  endDate?: string | null,
): Promise<{ id: string; year: number; status: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_open_fiscal_year", {
    p_year: year,
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  });
  if (error) throw error;
  return data as { id: string; year: number; status: string };
}

export async function accountingCloseFiscalYear(
  fiscalYearId: string,
): Promise<{ id: string; status: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_close_fiscal_year", {
    p_fiscal_year_id: fiscalYearId,
  });
  if (error) throw error;
  return data as { id: string; status: string };
}

export async function accountingClosePeriod(
  periodId: string,
  reason?: string | null,
): Promise<{ id: string; status: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_close_accounting_period", {
    p_period_id: periodId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as { id: string; status: string };
}

export async function accountingLockPeriod(
  periodId: string,
  reason: string,
): Promise<{ id: string; status: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_lock_accounting_period", {
    p_period_id: periodId,
    p_reason: reason,
  });
  if (error) throw error;
  return data as { id: string; status: string };
}

export async function accountingReopenPeriod(
  periodId: string,
  reason?: string | null,
): Promise<{ id: string; status: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("accounting_reopen_accounting_period", {
    p_period_id: periodId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as { id: string; status: string };
}
