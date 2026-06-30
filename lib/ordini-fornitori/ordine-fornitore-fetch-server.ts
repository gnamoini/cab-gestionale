import "server-only";

import {
  ORDINI_FORNITORI_COLUMNS,
  ORDINI_FORNITORI_RIGHE_COLUMNS,
} from "@/lib/db/table-select-columns";
import { mapOrdineFornitoreRow } from "@/lib/ordini-fornitori/ordine-fornitore-db-mapper";
import type { OrdineFornitoreDetail, OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import {
  fetchOrdiniFornitoriListPayload,
  mapOrdiniFornitoriListToRecords,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-fetch";

export async function fetchOrdineFornitoreDetailServer(id: string): Promise<OrdineFornitoreDetail | null> {
  if (!(await verifyServerSectionRead("ordini_fornitori"))) return null;

  const sb = await createSupabaseServerUserClient();
  const { data: ordine, error } = await sb
    .from("ordini_fornitori")
    .select(ORDINI_FORNITORI_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !ordine) return null;

  const { data: righe } = await sb
    .from("ordini_fornitori_righe")
    .select(ORDINI_FORNITORI_RIGHE_COLUMNS)
    .eq("ordine_id", id)
    .order("ordine");

  return {
    ordine: ordine as OrdineFornitoreRow,
    righe: (righe ?? []) as OrdineFornitoreRigaRow[],
  };
}

export async function fetchOrdineFornitoreRecordServer(id: string): Promise<OrdineFornitoreRecord | null> {
  const detail = await fetchOrdineFornitoreDetailServer(id);
  if (!detail) return null;
  return mapOrdineFornitoreRow(detail.ordine, detail.righe);
}

export async function fetchOrdiniFornitoriRecordsServer(): Promise<ServiceResult<OrdineFornitoreRecord[]>> {
  if (!(await verifyServerSectionRead("ordini_fornitori"))) {
    return success([]);
  }
  const sb = await createSupabaseServerUserClient();
  const res = await fetchOrdiniFornitoriListPayload(sb);
  if (!res.success || !res.data) return err(res.error ?? "Errore caricamento ordini.");
  return success(mapOrdiniFornitoriListToRecords(res.data));
}
