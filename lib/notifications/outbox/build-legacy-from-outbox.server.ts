import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { LAVORAZIONI_COLUMNS, MEZZI_LIST_EMBED_COLUMNS } from "@/lib/db/table-select-columns";
import { lavorazioneRowToNotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { lavorazioneRowToCompletedIntent } from "@/lib/lavorazioni/lavorazione-completed-notification-mapper";
import { parseMagazzinoStockAlertOutboxPayload } from "@/lib/magazzino/magazzino-stock-alert-outbox-payload";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import {
  wrapLavorazioneCompletataNotification,
  wrapLavorazioneNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

export type OutboxRow = {
  id: string;
  company_id: string | null;
  notification_event_id: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  trace_id: string;
};

function mapLavorazioneRow(
  row: Record<string, unknown> & { mezzo?: MezzoRow | MezzoRow[] | null },
): LavorazioneListRow {
  const mezzoRaw = row.mezzo;
  const mezzo = Array.isArray(mezzoRaw) ? (mezzoRaw[0] ?? null) : (mezzoRaw ?? null);
  return { ...(row as LavorazioneListRow), mezzo };
}

async function loadLavorazioneRow(
  client: SupabaseClient,
  lavorazioneId: string,
): Promise<LavorazioneListRow | null> {
  const { data, error } = await client
    .from("lavorazioni")
    .select(`${LAVORAZIONI_COLUMNS}, mezzo:mezzi!lavorazioni_mezzo_id_fkey(${MEZZI_LIST_EMBED_COLUMNS})`)
    .eq("id", lavorazioneId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return mapLavorazioneRow(data as unknown as Record<string, unknown> & { mezzo?: MezzoRow | null });
}

export async function buildLegacyNotificationFromOutbox(
  client: SupabaseClient,
  row: OutboxRow,
): Promise<AdminDashboardNotification | null> {
  const eventId = row.notification_event_id;

  if (eventId === "lavorazioni.created") {
    const lavRow = await loadLavorazioneRow(client, row.entity_id);
    if (!lavRow) return null;
    return wrapLavorazioneNotification(lavorazioneRowToNotificationIntent(lavRow));
  }

  if (eventId === "lavorazioni.completed") {
    const lavRow = await loadLavorazioneRow(client, row.entity_id);
    if (!lavRow) return null;
    return wrapLavorazioneCompletataNotification(lavorazioneRowToCompletedIntent(lavRow));
  }

  if (eventId === "magazzino.below_minimum") {
    const snapshot = parseMagazzinoStockAlertOutboxPayload(row.payload);
    if (!snapshot) return null;

    return {
      kind: "magazzino_sotto_scorta",
      id: snapshot.ricambio_id,
      ricambioId: snapshot.ricambio_id,
      episodeId: snapshot.episode_id,
      codice: snapshot.codice?.trim() || undefined,
      marca: snapshot.marca?.trim() || "—",
      descrizione: snapshot.nome?.trim() || "—",
      scorta: snapshot.quantita,
      scortaMinima: snapshot.scorta_minima,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

/** ponytail: consume-only — episodio e snapshot dal payload outbox immutabile. */
export function magazzinoEpisodeIdFromOutboxRow(row: OutboxRow): string | null {
  if (row.notification_event_id !== "magazzino.below_minimum") return null;
  return parseMagazzinoStockAlertOutboxPayload(row.payload)?.episode_id ?? null;
}
