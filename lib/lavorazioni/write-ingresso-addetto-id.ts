import { stripAddettoLegacyFieldsOnWrite, SCHEDA_INGRESSO_ADDETTO_WRITE_RULES } from "@/lib/lavorazioni/addetto-write-freeze";
import type { SchedaIngressoFields } from "@/types/schede";

/** Applica write freeze ingresso: solo addettoAccettazioneId, no dual-write stringa. */
export function writeIngressoAddettoId(
  campi: SchedaIngressoFields,
  addettoId: string,
): SchedaIngressoFields {
  const next = {
    ...campi,
    addettoAccettazioneId: addettoId.trim(),
    addettoAccettazione: "",
  };
  return stripAddettoLegacyFieldsOnWrite(
    next as unknown as Record<string, unknown>,
    SCHEDA_INGRESSO_ADDETTO_WRITE_RULES,
  ) as unknown as SchedaIngressoFields;
}
