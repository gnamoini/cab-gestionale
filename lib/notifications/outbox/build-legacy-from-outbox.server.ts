import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { LAVORAZIONI_COLUMNS, MEZZI_LIST_EMBED_COLUMNS } from "@/lib/db/table-select-columns";
import { lavorazioneRowToNotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { lavorazioneRowToCompletedIntent } from "@/lib/lavorazioni/lavorazione-completed-notification-mapper";
import { parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  didCrossToZero,
  shouldNotifyStockCrossing,
  type StockSnapshot,
} from "@/lib/magazzino/ricambio-stock-crossing";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import {
  wrapLavorazioneCompletataNotification,
  wrapLavorazioneNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow, MezzoRow } from "@/src/types/supabase-tables";

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
    const payload = row.payload ?? {};
    const prevQuantita = Number(payload.prev_quantita);
    const currQuantita = Number(payload.curr_quantita);
    if (!Number.isFinite(prevQuantita) || !Number.isFinite(currQuantita)) return null;

    const { data: ricambioRow, error } = await client
      .from("magazzino_ricambi")
      .select("id, codice, nome, marca, quantita, meta")
      .eq("id", row.entity_id)
      .maybeSingle();
    if (error || !ricambioRow) return null;

    const meta = parseMagazzinoRicambioMeta((ricambioRow as MagazzinoRicambioRow).meta);
    const scortaMinima = meta.scortaMinima ?? 0;
    const prev: StockSnapshot = {
      scorta: Math.max(0, Math.round(prevQuantita)),
      scortaMinima: Math.max(0, Math.round(scortaMinima)),
    };
    const curr: StockSnapshot = {
      scorta: Math.max(0, Math.round(currQuantita)),
      scortaMinima: Math.max(0, Math.round(scortaMinima)),
    };
    if (!shouldNotifyStockCrossing(prev, curr)) return null;

    const esaurito = didCrossToZero(prev, curr);
    const ricambioId = String(ricambioRow.id);
    return {
      kind: "magazzino_sotto_scorta",
      id: ricambioId,
      ricambioId,
      marca: ricambioRow.marca?.trim() || "—",
      descrizione: ricambioRow.nome?.trim() || "—",
      scorta: curr.scorta,
      scortaMinima: curr.scortaMinima,
      esaurito,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}
