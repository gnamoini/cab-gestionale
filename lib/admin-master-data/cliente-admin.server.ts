import "server-only";

import { recordAuditEvent } from "@/lib/audit/record";
import { resolveWriteActorIdFromClient } from "@/lib/audit/resolve-actor";
import { rbacLogEntitaModule } from "@/lib/audit/resolve-module";
import { mapFiscalConflictError } from "@/lib/fiscal/conflict";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";

const CLIENTI_ENTITA = "clienti_anagrafica";

async function auditClienteMasterData(
  client: SupabaseClient,
  entityId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  after?: Record<string, unknown>,
): Promise<void> {
  try {
    const autoreId = await resolveWriteActorIdFromClient(client);
    await recordAuditEvent(client, {
      entityType: CLIENTI_ENTITA,
      entityId,
      action,
      autoreId,
      module: rbacLogEntitaModule(CLIENTI_ENTITA),
      after,
    });
  } catch {
    // ponytail: audit failure must not roll back RPC master-data write
  }
}

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
  const id = data as string;
  await auditClienteMasterData(sb, id, "CREATE", { nome_display: payload.nome_display });
  return id;
}

export async function adminUpdateCliente(id: string, payload: Partial<ClienteAdminPayload>): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_update_cliente", { p_id: id, p_payload: payload });
  if (error) wrapRpcError(error);
  await auditClienteMasterData(sb, id, "UPDATE", payload as Record<string, unknown>);
}

export async function adminArchiveCliente(id: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("admin_archive_cliente", { p_id: id });
  if (error) wrapRpcError(error);
  await auditClienteMasterData(sb, id, "DELETE");
}
