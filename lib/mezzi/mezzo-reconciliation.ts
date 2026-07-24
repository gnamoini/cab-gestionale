import {
  lavorazioneStrongIdentMatchesMezzo,
  normMezzoKey,
} from "@/lib/mezzi/lavorazioni-sync";
import { resolveMezzoByIdentFromCatalog } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoResolutionResult } from "@/lib/domain/mezzo/mezzo-resolution";
import type { MezzoGestito } from "@/lib/mezzi/types";

/** Proposta riconciliazione lavorazione orfana → mezzo (no attach automatico). */
export function proposeMezzoReconciliation(
  mezzi: readonly MezzoGestito[],
  lav: { targa: string; matricola: string; nScuderia?: string },
): MezzoResolutionResult {
  return resolveMezzoByIdentFromCatalog(mezzi, {
    targa: lav.targa,
    matricola: lav.matricola,
    nScuderia: lav.nScuderia,
  });
}

export { lavorazioneStrongIdentMatchesMezzo, normMezzoKey };
