import {
  DDT_DOCUMENTS_COLUMNS,
  DDT_LINKS_COLUMNS,
  DDT_ROWS_COLUMNS,
  PREVENTIVO_DDT_FULFILLMENT_COLUMNS,
} from "@/lib/db/table-select-columns";
import type { DdtListPayload } from "@/lib/ddt/types";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  DdtDocumentRow,
  DdtLineRow,
  DdtLinkRow,
  PreventivoDdtFulfillmentRow,
} from "@/src/types/supabase-tables";

export async function fetchDdtListPayload(sb: SupabaseClient): Promise<ServiceResult<DdtListPayload>> {
  const { data: documentsData, error: documentsError } = await sb
    .from("ddt_documents")
    .select(DDT_DOCUMENTS_COLUMNS)
    .order("data_documento", { ascending: false })
    .order("numero", { ascending: false, nullsFirst: true });
  if (documentsError) return err(documentsError.message);

  const documents = (documentsData ?? []) as DdtDocumentRow[];
  const ids = documents.map((d) => d.id);

  const [rowsRes, linksRes, fulfillmentRes] = await Promise.all([
    ids.length
      ? sb.from("ddt_rows").select(DDT_ROWS_COLUMNS).in("ddt_id", ids).order("ordine")
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? sb.from("ddt_links").select(DDT_LINKS_COLUMNS).in("ddt_id", ids)
      : Promise.resolve({ data: [], error: null }),
    sb.from("preventivo_ddt_fulfillment").select(PREVENTIVO_DDT_FULFILLMENT_COLUMNS),
  ]);

  if (rowsRes.error) return err(rowsRes.error.message);
  if (linksRes.error) return err(linksRes.error.message);
  if (fulfillmentRes.error) return err(fulfillmentRes.error.message);

  return success({
    documents,
    rows: (rowsRes.data ?? []) as DdtLineRow[],
    links: (linksRes.data ?? []) as DdtLinkRow[],
    fulfillment: (fulfillmentRes.data ?? []) as PreventivoDdtFulfillmentRow[],
  });
}

export async function fetchDdtByPreventivoId(
  sb: SupabaseClient,
  preventivoId: string,
): Promise<ServiceResult<DdtDocumentRow[]>> {
  const { data, error } = await sb
    .from("ddt_documents")
    .select(DDT_DOCUMENTS_COLUMNS)
    .eq("preventivo_id", preventivoId)
    .order("created_at", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as DdtDocumentRow[]);
}

export async function fetchDdtByLavorazioneId(
  sb: SupabaseClient,
  lavorazioneId: string,
): Promise<ServiceResult<DdtDocumentRow[]>> {
  const { data, error } = await sb
    .from("ddt_documents")
    .select(DDT_DOCUMENTS_COLUMNS)
    .eq("lavorazione_id", lavorazioneId)
    .neq("status", "annullato")
    .order("data_documento", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as DdtDocumentRow[]);
}

export async function fetchPreventivoDdtFulfillment(
  sb: SupabaseClient,
  preventivoId: string,
): Promise<ServiceResult<PreventivoDdtFulfillmentRow[]>> {
  const { data, error } = await sb
    .from("preventivo_ddt_fulfillment")
    .select(PREVENTIVO_DDT_FULFILLMENT_COLUMNS)
    .eq("preventivo_id", preventivoId);
  if (error) return err(error.message);
  return success((data ?? []) as PreventivoDdtFulfillmentRow[]);
}
