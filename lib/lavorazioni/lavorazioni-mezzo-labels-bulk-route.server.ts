import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import {
  buildLavorazioneRowByIdMap,
  resolveMezzoIdsFromWorkOrderSelection,
} from "@/lib/lavorazioni/lavorazioni-label-mezzo-ids";
import { normalizeWorkOrderBulkIds } from "@/lib/lavorazioni/lavorazioni-mezzo-labels-validation";
import { buildMezzoLabelsBulkPdfResponse } from "@/lib/mezzo-labels/bulk-pdf-route.server";
import { MEZZO_BULK_ABSOLUTE_MAX } from "@/lib/mezzo-labels/validation";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/**
 * Stampa etichette mezzo da lavorazioni selezionate.
 * ponytail: mezzi/QR via service role solo dopo gate RLS su `lavorazioni` (user client).
 */
export async function buildLavorazioniMezzoLabelsBulkPdfResponse(input: {
  userSb: SupabaseClient;
  workOrderIds: string[];
  origin: string;
  userId: string | null;
  device: string | null;
}): Promise<Response> {
  const workOrderIds = normalizeWorkOrderBulkIds(input.workOrderIds);
  if (workOrderIds.length === 0) {
    return NextResponse.json({ error: "Nessuna lavorazione selezionata" }, { status: 400 });
  }
  if (workOrderIds.length > MEZZO_BULK_ABSOLUTE_MAX) {
    return NextResponse.json(
      { error: `Massimo ${MEZZO_BULK_ABSOLUTE_MAX} lavorazioni per richiesta` },
      { status: 400 },
    );
  }

  const { data: lavRows, error: lavErr } = await applyLavorazioniNotDeletedFilter(
    input.userSb.from("lavorazioni").select("id, mezzo_id"),
  ).in("id", workOrderIds);
  if (lavErr) return NextResponse.json({ error: lavErr.message }, { status: 500 });

  const rowById = buildLavorazioneRowByIdMap((lavRows ?? []) as LavorazioneListRow[]);
  const { mezzoIds } = resolveMezzoIdsFromWorkOrderSelection(workOrderIds, rowById);

  if (mezzoIds.length === 0) {
    return NextResponse.json(
      { error: "Le lavorazioni selezionate non hanno mezzi validi da stampare." },
      { status: 404 },
    );
  }

  const serviceSb = createSupabaseServerServiceClient();
  return buildMezzoLabelsBulkPdfResponse({
    sb: serviceSb,
    ids: mezzoIds,
    origin: input.origin,
    userId: input.userId,
    device: input.device,
  });
}
