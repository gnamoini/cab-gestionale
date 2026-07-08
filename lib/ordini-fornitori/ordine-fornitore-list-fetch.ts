import {
  ORDINI_FORNITORI_COLUMNS,
  ORDINI_FORNITORI_RIGHE_COLUMNS,
} from "@/lib/db/table-select-columns";
import { mapOrdineFornitoreRow } from "@/lib/ordini-fornitori/ordine-fornitore-db-mapper";
import type { OrdineFornitoreListPayload, OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";

export async function fetchOrdiniFornitoriListPayload(
  sb: SupabaseClient,
): Promise<ServiceResult<OrdineFornitoreListPayload>> {
  const { data: ordiniData, error: ordiniError } = await sb
    .from("ordini_fornitori")
    .select(ORDINI_FORNITORI_COLUMNS)
    .order("created_at", { ascending: false })
    .order("data_ordine", { ascending: false })
    .order("numero", { ascending: false, nullsFirst: true });
  if (ordiniError) return err(ordiniError.message);

  const ordini = (ordiniData ?? []) as OrdineFornitoreRow[];
  const ids = ordini.map((o) => o.id);

  const righeRes = ids.length
    ? await sb.from("ordini_fornitori_righe").select(ORDINI_FORNITORI_RIGHE_COLUMNS).in("ordine_id", ids).order("ordine")
    : { data: [], error: null };

  if (righeRes.error) return err(righeRes.error.message);

  return success({
    ordini,
    righe: (righeRes.data ?? []) as OrdineFornitoreRigaRow[],
  });
}

export function mapOrdiniFornitoriListToRecords(payload: OrdineFornitoreListPayload): OrdineFornitoreRecord[] {
  return payload.ordini.map((o) => mapOrdineFornitoreRow(o, payload.righe));
}
