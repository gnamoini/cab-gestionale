import "server-only";

import { cache } from "react";
import { PREVENTIVI_BILLING_STATUS_COLUMNS, PREVENTIVI_COLUMNS, MEZZI_LIST_LIGHT_COLUMNS } from "@/lib/db/table-select-columns";
import {
  fetchPreventiviListRows,
  mapPreventiviEmbedRowsToRecords,
  mezziRowsFromPreventiviEmbed,
} from "@/lib/preventivi/preventivi-list-fetch";
import type { PreventiviRecordsPayload } from "@/lib/preventivi/preventivi-list-fetch";
import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow, PreventivoBillingStatusRow, PreventivoRow } from "@/src/types/supabase-tables";

export const fetchPreventiviRecordsServer = cache(async (): Promise<ServiceResult<PreventiviRecordsPayload>> => {
  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const rowsRes = await fetchPreventiviListRows(sb);
  if (!rowsRes.success) return err(rowsRes.error ?? "Lettura preventivi non riuscita.");
  const rows = rowsRes.data ?? [];
  return success({
    records: mapPreventiviEmbedRowsToRecords(rows),
    mezziRows: mezziRowsFromPreventiviEmbed(rows),
  });
});

export const fetchPreventiviBillingStatusServer = cache(
  async (): Promise<ServiceResult<PreventivoBillingStatusRow[]>> => {
    const allowed = await verifyServerPageRead("preventivi");
    if (!allowed) return success([]);
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb.from("preventivi_billing_status").select(PREVENTIVI_BILLING_STATUS_COLUMNS);
    if (error) return err(error.message);
    return success((data ?? []) as PreventivoBillingStatusRow[]);
  },
);

export async function fetchPreventivoRecordServer(id: string): Promise<ServiceResult<PreventivoRecord>> {
  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("preventivi").select(PREVENTIVI_COLUMNS).eq("id", id).maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Preventivo non trovato");
  const row = data as PreventivoRow;
  let mezzo: MezzoRow | null = null;
  if (row.mezzo_id) {
    const { data: m } = await sb.from("mezzi").select(MEZZI_LIST_LIGHT_COLUMNS).eq("id", row.mezzo_id).maybeSingle();
    mezzo = (m as MezzoRow | null) ?? null;
  }
  return success(preventivoRowToRecord(row, mezzo));
}
