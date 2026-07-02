import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";
import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { isLavorazioniNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type LavorazioneCompletedIntent = NotificationIntent;

export function lavorazioneRowToCompletedIntent(row: LavorazioneListRow): LavorazioneCompletedIntent {
  const ctx = composeInterventoContextFromListRow(row);
  const oggetto = resolveInterventoOggettoDisplay(ctx);
  const mezzoSnap = ctx.mezzo;
  return {
    lavorazioneId: row.id,
    titolo: row.codice?.trim() || row.id,
    cliente: mezzoSnap.cliente?.trim() || ctx.lavorazione.cliente?.trim() || "",
    mezzo: oggetto.label.trim(),
    targa: mezzoSnap.targa?.trim() || ctx.ident.targa?.trim() || null,
    createdBy: row.updated_by ?? row.created_by ?? null,
    createdAt: row.updated_at?.trim() || new Date().toISOString(),
  };
}

export function didTransitionToCompletata(prevStato: string | undefined, currStato: string): boolean {
  const curr = currStato.trim();
  if (curr !== STATO_LAVORAZIONE_COMPLETATA_ID) return false;
  const prev = prevStato?.trim();
  if (!prev) return false;
  return prev !== STATO_LAVORAZIONE_COMPLETATA_ID;
}

export function lavorazioneCompletedEventToIntent(input: {
  lavorazioneId: string;
  prevStato: string | undefined;
  currRow: LavorazioneListRow | null | undefined;
  pathname: string;
  isLocalUpdate: boolean;
}): LavorazioneCompletedIntent | null {
  const { lavorazioneId, prevStato, currRow, pathname, isLocalUpdate } = input;
  if (isLocalUpdate) return null;
  if (isLavorazioniNotificationsPath(pathname)) return null;
  if (!currRow || currRow.id !== lavorazioneId) return null;
  if (!didTransitionToCompletata(prevStato, currRow.stato)) return null;
  return lavorazioneRowToCompletedIntent(currRow);
}
