import "server-only";

import { PREVENTIVO_EVENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PreventivoEventRow } from "@/src/types/supabase-tables";

import type { PreventivoEventViewModel } from "@/lib/preventivi/preventivo-events-types";

const STAFF_EVENT_LABELS: Record<string, string> = {
  created: "Creato",
  sent: "Inviato al cliente",
  viewed: "Visualizzato dal cliente",
  accepted_client: "Accettato dal cliente",
  rejected_client: "Rifiutato dal cliente",
  accepted_timeout: "Accettato per timeout 24h",
  cancelled: "Annullato",
  withdrawn: "Ritirato in bozza",
  version_incremented: "Versione incrementata",
};

function eventLabel(type: string): string {
  return STAFF_EVENT_LABELS[type] ?? type;
}

export async function loadPreventivoEventsServer(
  preventivoId: string,
): Promise<ServiceResult<PreventivoEventViewModel[]>> {
  const trimmed = preventivoId.trim();
  if (!trimmed) return err("Id preventivo non valido");

  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return err("Permesso richiesto.");

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("preventivo_events")
    .select(PREVENTIVO_EVENTS_COLUMNS)
    .eq("preventivo_id", trimmed)
    .order("created_at", { ascending: false });

  if (error) return err(error.message);

  const events = ((data ?? []) as PreventivoEventRow[]).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    label: eventLabel(row.event_type),
    actorType: row.actor_type,
    createdAt: row.created_at,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    snapshot: (row.snapshot ?? {}) as Record<string, unknown>,
  }));

  return success(events);
}
