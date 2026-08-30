import { CLIENTE_HOME_PATH } from "@/lib/auth/rbac";
import { Q_MEZZO_QR_TOKEN } from "@/lib/navigation/dashboard-log-links";
import type { RbacSnapshotBound } from "@/src/lib/rbac/rbac-snapshot-access";
import { snapshotHasPageRead } from "@/src/lib/rbac/rbac-snapshot-access";

export const PORTALE_CLIENTI_LABEL = "Portale Clienti";

export function userHasClientLavorazioniAccessFromSnapshot(snap: RbacSnapshotBound): boolean {
  return snapshotHasPageRead(snap, "lavorazioni_clienti");
}

export function clientLavorazioniListPath(): string {
  return CLIENTE_HOME_PATH;
}

export function buildClientPortalMezzoQrHref(token: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_MEZZO_QR_TOKEN, token.trim());
  return `${CLIENTE_HOME_PATH}?${sp.toString()}`;
}

export function clientLavorazioniDetailPath(lavorazioneId: string): string {
  return `${CLIENTE_HOME_PATH}/${encodeURIComponent(lavorazioneId.trim())}`;
}

export function clientLavorazioniPublicUrl(lavorazioneId: string, origin?: string): string {
  const base = (origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}${clientLavorazioniDetailPath(lavorazioneId)}`;
}
