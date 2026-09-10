import "server-only";

import { mapFiscalConflictError } from "@/lib/fiscal/conflict";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type FornitoreAdminPayload = {
  nome_display: string;
  ragione_sociale?: string | null;
  partita_iva?: string | null;
  codice_fiscale?: string | null;
  nazione?: string;
  indirizzo?: string | null;
  pec?: string | null;
  codice_destinatario?: string | null;
  telefono?: string | null;
  email?: string | null;
  fiscal_regime_id?: string | null;
  default_vat_code_id?: string | null;
  default_payment_term_id?: string | null;
  default_payment_method_id?: string | null;
  default_account_id?: string | null;
  default_accounting_journal_id?: string | null;
  default_document_series_id?: string | null;
  note?: string | null;
};

function wrapRpcError(error: { message: string }) {
  const mapped = mapFiscalConflictError(error);
  if (mapped) throw new Error(mapped);
  throw error;
}

export async function adminCreateFornitore(payload: FornitoreAdminPayload): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("admin_create_fornitore", { p_payload: payload });
  if (error) wrapRpcError(error);
  return data as string;
}

export async function adminUpdateFornitore(id: string, payload: Partial<FornitoreAdminPayload>): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_update_fornitore", { p_id: id, p_payload: payload });
  if (error) wrapRpcError(error);
}

export async function adminArchiveFornitore(id: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_archive_fornitore", { p_id: id });
  if (error) wrapRpcError(error);
}
