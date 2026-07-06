import "server-only";

import { cache } from "react";
import { DOCUMENTI_COLUMNS } from "@/lib/db/table-select-columns";
import { documentoRowToListRow } from "@/lib/documenti/documenti-list-mapper";
import type { DocumentoListRow } from "@/lib/documents/documento-list-dto";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DocumentoRow } from "@/src/types/supabase-tables";

export const fetchDocumentiListServer = cache(async (): Promise<ServiceResult<DocumentoListRow[]>> => {
  const rowsRes = await fetchDocumentiRowsServer();
  if (!rowsRes.success) return err(rowsRes.error ?? "Documenti non disponibili.");
  return success((rowsRes.data ?? []).map((row) => documentoRowToListRow(row)));
});

/** Righe DB grezze — allineate a `documentiService.getAll` / `useDocumentiListQuery`. */
export const fetchDocumentiRowsServer = cache(async (): Promise<ServiceResult<DocumentoRow[]>> => {
  const allowed = await verifyServerPageRead("documenti");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("documenti").select(DOCUMENTI_COLUMNS).order("created_at", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as DocumentoRow[]);
});
