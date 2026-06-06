import type { QueryClient } from "@tanstack/react-query";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
import { QK } from "@/src/lib/react-query/query-keys";

/** Rimuove cache per-entity dopo soft-delete (evita accumulo heap in sessioni lunghe). */
export function evictLavorazioneDomainCache(qc: QueryClient, lavorazioneId: string): void {
  const id = lavorazioneId.trim();
  if (!id) return;

  const keys = [
    lavorazioniDomainQueryKeys.base(id),
    lavorazioniDomainQueryKeys.schede(id),
    lavorazioniDomainQueryKeys.movimenti(id),
    lavorazioniDomainQueryKeys.preventivi(id),
    lavorazioniDomainQueryKeys.log(id),
    lavorazioniDomainQueryKeys.lavorazionePdfs(id),
    [...QK.clientLavorazioniDetail, id],
    [...QK.clientLavorazioneDocuments, id],
    [...QK.clientLavorazionePhotos, id],
  ] as const;

  for (const key of keys) {
    qc.removeQueries({ queryKey: key });
  }

  qc.removeQueries({
    predicate: (q) => {
      const k = q.queryKey;
      return (
        k[0] === lavorazioniDomainQueryKeys.root[0] &&
        k[1] === "documenti" &&
        k[2] === id
      );
    },
  });
}
