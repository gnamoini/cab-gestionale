import "server-only";

import { z } from "zod";
import {
  validateOrdineFornitoreDeliveryRequest,
} from "@/lib/ordini-fornitori/ordine-fornitore-delivery-validation";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

const deliveryLineSchema = z.object({
  riga_id: z.string().uuid(),
  quantita_ricevuta_target: z.number().min(0),
});

const deliveryBodySchema = z.object({
  batch_id: z.string().min(1).max(128),
  apply_stock: z.boolean(),
  lines: z.array(deliveryLineSchema).min(1),
});

export type OrdineFornitoreDeliveryInput = z.infer<typeof deliveryBodySchema>;

export type OrdineFornitoreDeliveryResult = {
  ordineId: string;
  status: OrdineFornitoreStatus;
  complete: boolean;
  warnings: Array<{ riga_id?: string; code?: string }>;
  batchId: string;
};

export async function receiveOrdineFornitoreDeliveryServer(
  ordineId: string,
  input: OrdineFornitoreDeliveryInput,
): Promise<ServiceResult<OrdineFornitoreDeliveryResult>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "write"))) {
    return err("Permesso richiesto.");
  }
  if (input.apply_stock && !(await verifyServerModuleCan("magazzino", "write"))) {
    return err("Permesso magazzino richiesto per il carico.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const validationError = validateOrdineFornitoreDeliveryRequest({
    status: record.status,
    righe: record.righe,
    lines: input.lines,
    applyStock: input.apply_stock,
  });
  if (validationError) return err(validationError);

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("ordine_fornitore_receive_delivery", {
    p_ordine_id: ordineId,
    p_batch_id: input.batch_id,
    p_lines: input.lines,
    p_apply_stock: input.apply_stock,
  });

  if (error) return err(error.message);
  if (!data || typeof data !== "object") return err("Risposta ricezione non valida.");

  const raw = data as Record<string, unknown>;
  return success({
    ordineId: String(raw.ordine_id ?? ordineId),
    status: String(raw.status ?? record.status) as OrdineFornitoreStatus,
    complete: raw.complete === true,
    warnings: Array.isArray(raw.warnings) ? (raw.warnings as OrdineFornitoreDeliveryResult["warnings"]) : [],
    batchId: String(raw.batch_id ?? input.batch_id),
  });
}

export function parseOrdineFornitoreDeliveryBody(body: unknown): OrdineFornitoreDeliveryInput | null {
  const parsed = deliveryBodySchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
