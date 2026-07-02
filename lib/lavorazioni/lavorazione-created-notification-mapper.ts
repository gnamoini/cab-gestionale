import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
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
  const ctx = composeInterventoContextFromListRow(row);
  const oggetto = resolveInterventoOggettoDisplay(ctx);
  const mezzoSnap = ctx.mezzo;
  return {
    lavorazioneId: row.id,
    titolo: row.codice?.trim() || row.id,
    cliente: mezzoSnap.cliente?.trim() || ctx.lavorazione.cliente?.trim() || "",
    mezzo: oggetto.label.trim(),
    targa: mezzoSnap.targa?.trim() || ctx.ident.targa?.trim() || null,
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
  isLocalCreate: boolean;
  row?: LavorazioneListRow | null;
}): NotificationIntent | null {
  const { event, pathname, isLocalCreate, row } = input;
  if (event.type !== "entity_created" || event.entity !== "lavorazioni" || !event.id?.trim()) return null;
  if (isLocalCreate) return null;
  if (isLavorazioniNotificationsPath(pathname)) return null;

  const lavorazioneId = event.id.trim();
  if (row?.id === lavorazioneId) return lavorazioneRowToNotificationIntent(row);
  return minimalNotificationIntent(lavorazioneId);
}
