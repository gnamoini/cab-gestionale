import "server-only";

import { resolveWriteActorIdFromServerSession } from "@/lib/audit/resolve-write-actor.server";
import type { ApplyLinePayload, ApplyResult } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { auditContext, writeModificaLog } from "@/src/services/internal/audit-log";

export class InventoryReceivingApplyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InventoryReceivingApplyError";
    this.code = code;
  }
}

export async function applyInventoryReceivingDocument(input: {
  documentId: string;
  lines: ApplyLinePayload[];
  documentNumber?: string | null;
  supplierLabel?: string | null;
}): Promise<ApplyResult> {
  const userId = await resolveWriteActorIdFromServerSession();
  if (!userId) {
    throw new InventoryReceivingApplyError("AUTH", "Sessione non valida");
  }

  const sb = await createSupabaseServerUserClient();

  const { data, error } = await sb.rpc("inventory_receiving_apply", {
    p_document_id: input.documentId,
    p_lines: input.lines,
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("già applicato")) {
      throw new InventoryReceivingApplyError("ALREADY_APPLIED", error.message);
    }
    throw new InventoryReceivingApplyError("APPLY_FAILED", error.message);
  }

  const result = data as ApplyResult;

  await writeModificaLog(sb, {
    entita: "inventory_documents",
    entita_id: input.documentId,
    azione: "UPDATE",
    autore_id: userId,
    payload: auditContext(
      `Caricato DDT ${input.documentNumber ?? input.documentId} dal fornitore ${input.supplierLabel ?? "—"} (${result.applied} righe)`,
    ),
  });

  return result;
}
