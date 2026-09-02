/** SSOT dedup_key — deve matchare bridge + RPC. */

export function lavorazioneCreatedDedupKey(lavorazioneId: string): string {
  return `lav:${lavorazioneId}`;
}

export function magazzinoSottoScortaDedupKey(ricambioId: string, episodeId: string): string {
  return `mag:${ricambioId}:below:${episodeId}`;
}

/** @deprecated Solo notifiche legacy pre-episodio. */
export function magazzinoSottoScortaLegacyDedupKey(ricambioId: string): string {
  return `mag:${ricambioId}:crossing`;
}

export function dipendentiPresenzeReminderDedupKey(dateYmd: string): string {
  return `dip-pres:${dateYmd}`;
}

export function adminDashboardTestDedupKey(userId: string, now = Date.now()): string {
  const minuteBucket = Math.floor(now / 60_000);
  return `test:${userId}:${minuteBucket}`;
}

export function lavorazioneCompletataDedupKey(lavorazioneId: string): string {
  return `lav:${lavorazioneId}:done`;
}

export function fattureScaduteDigestDedupKey(dateYmd: string): string {
  return `fatt-scad:${dateYmd}`;
}

export function lavorazioniRitardoDigestDedupKey(dateYmd: string): string {
  return `lav-ritardo:${dateYmd}`;
}

export function tagliandoDaEseguireDedupKey(lavorazioneId: string): string {
  return `tagliando-due:${lavorazioneId}`;
}
