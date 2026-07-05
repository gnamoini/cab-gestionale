import { CLIENTE_HOME_PATH } from "@/lib/auth/rbac";
import type { RbacSnapshotBound } from "@/src/lib/rbac/rbac-snapshot-access";
import { snapshotHasPageRead } from "@/src/lib/rbac/rbac-snapshot-access";

export const PORTALE_CLIENTI_LABEL = "Portale Clienti";

export function userHasClientLavorazioniAccessFromSnapshot(snap: RbacSnapshotBound): boolean {
  return snapshotHasPageRead(snap, "lavorazioni_clienti");
}

export function clientLavorazioniListPath(): string {
  return CLIENTE_HOME_PATH;
}

export function clientLavorazioniDetailPath(lavorazioneId: string): string {
  return `${CLIENTE_HOME_PATH}/${encodeURIComponent(lavorazioneId.trim())}`;
}

export function clientLavorazioniPublicUrl(lavorazioneId: string, origin?: string): string {
  const base = (origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}${clientLavorazioniDetailPath(lavorazioneId)}`;
}
