import "server-only";

import { mapFiscalConflictError } from "@/lib/fiscal/conflict";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type ClienteAdminPayload = {
  nome_display: string;
  entity_key?: string;
  ragione_sociale?: string | null;
  nome_commerciale?: string | null;
  tipo_soggetto?: string | null;
  partita_iva?: string | null;
  codice_fiscale?: string | null;
  nazione?: string;
  pec?: string | null;
  codice_destinatario?: string | null;
  fiscal_regime_id?: string | null;
  default_vat_code_id?: string | null;
  split_payment?: boolean;
  natura_iva_default?: string | null;
  default_payment_term_id?: string | null;
  default_payment_method_id?: string | null;
  default_account_id?: string | null;
  default_accounting_journal_id?: string | null;
  default_document_series_id?: string | null;
  note?: string | null;
  in_lista_settings?: boolean;
};

function wrapRpcError(error: { message: string }) {
  const mapped = mapFiscalConflictError(error);
  if (mapped) throw new Error(mapped);
  throw error;
}

export async function adminCreateCliente(payload: ClienteAdminPayload): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("admin_create_cliente", { p_payload: payload });
  if (error) wrapRpcError(error);
  return data as string;
}

export async function adminUpdateCliente(id: string, payload: Partial<ClienteAdminPayload>): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_update_cliente", { p_id: id, p_payload: payload });
  if (error) wrapRpcError(error);
}

export async function adminArchiveCliente(id: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_archive_cliente", { p_id: id });
  if (error) wrapRpcError(error);
}
