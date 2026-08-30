import "server-only";

import { cache } from "react";
import { fetchDdtListPayload } from "@/lib/ddt/ddt-fetch";
import type { DdtDetail } from "@/lib/ddt/types";
import {
  DDT_DOCUMENTS_COLUMNS,
  DDT_LINKS_COLUMNS,
  DDT_ROWS_COLUMNS,
} from "@/lib/db/table-select-columns";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { DdtListPayload } from "@/lib/ddt/types";

export const fetchDdtListPayloadServer = cache(async (): Promise<ServiceResult<DdtListPayload>> => {
  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchDdtListPayload(sb);
});

export const fetchDdtDetailServer = cache(async (id: string): Promise<DdtDetail | null> => {
  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return null;
  const sb = await createSupabaseServerUserClient();
  const { data: document, error } = await sb
    .from("ddt_documents")
    .select(DDT_DOCUMENTS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !document) return null;

  const [rows, links] = await Promise.all([
    sb.from("ddt_rows").select(DDT_ROWS_COLUMNS).eq("ddt_id", id).order("ordine"),
    sb.from("ddt_links").select(DDT_LINKS_COLUMNS).eq("ddt_id", id),
  ]);

  return {
    document: document as import("@/src/types/supabase-tables").DdtDocumentRow,
    rows: rows.data ?? [],
    links: links.data ?? [],
  };
});
