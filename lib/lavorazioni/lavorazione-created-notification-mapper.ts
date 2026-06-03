import { isLavorazioniNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type NotificationIntent = {
  lavorazioneId: string;
  titolo: string;
  cliente: string;
  mezzo: string;
  targa: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function lavorazioneRowToNotificationIntent(row: LavorazioneListRow): NotificationIntent {
  const mezzo = row.mezzo;
  return {
    lavorazioneId: row.id,
    titolo: row.codice?.trim() || row.id,
    cliente: mezzo?.cliente?.trim() || "",
    mezzo: mezzo ? `${mezzo.marca} ${mezzo.modello}`.trim() : "",
    targa: mezzo?.targa?.trim() || null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at?.trim() || new Date().toISOString(),
  };
}

export function minimalNotificationIntent(lavorazioneId: string, createdAt?: string): NotificationIntent {
  const now = createdAt?.trim() || new Date().toISOString();
  return {
    lavorazioneId,
    titolo: lavorazioneId,
    cliente: "",
    mezzo: "",
    targa: null,
    createdBy: null,
    createdAt: now,
  };
}

export function lavorazioneCreatedEventToIntent(input: {
  event: CabSyncEvent;
  pathname: string;
  isAdmin: boolean;
  isLocalCreate: boolean;
  row?: LavorazioneListRow | null;
}): NotificationIntent | null {
  const { event, pathname, isAdmin, isLocalCreate, row } = input;
  if (event.type !== "entity_created" || event.entity !== "lavorazioni" || !event.id?.trim()) return null;
  if (!isAdmin) return null;
  if (isLocalCreate) return null;
  if (isLavorazioniNotificationsPath(pathname)) return null;

  const lavorazioneId = event.id.trim();
  if (row?.id === lavorazioneId) return lavorazioneRowToNotificationIntent(row);
  return minimalNotificationIntent(lavorazioneId);
}
