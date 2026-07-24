import type { SchedaIngressoFields } from "@/types/schede";

const INGRESSO_TO_CAPTURE: Partial<Record<keyof SchedaIngressoFields, string>> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  dataIngresso: "data_ingresso",
  tipoAttrezzatura: "tipo_attrezzatura",
  marcaAttrezzatura: "attrezzatura_marca",
  modelloAttrezzatura: "attrezzatura_modello",
  matricola: "attrezzatura_matricola",
  nScuderia: "n_scuderia",
  oreLavoro: "ore",
  tipoTelaio: "tipo_telaio",
  marcaTelaio: "telaio_marca",
  modelloTelaio: "telaio_modello",
  targa: "targa",
  vin: "vin",
  km: "km",
  descrizioneAnomalia: "descrizione_anomalia",
  livelloCarburante: "livello_carburante",
  addettoAccettazione: "addetto_accettazione",
  richiedente: "richiedente",
  richiedenteTelefono: "telefono",
};

/** Maps scheda ingresso form → document_capture_fields patches for apply. */
export function schedaIngressoFieldsToCapturePatches(
  fields: SchedaIngressoFields,
): Array<{ fieldKey: string; confirmedValue: string | null }> {
  const out: Array<{ fieldKey: string; confirmedValue: string | null }> = [];
  for (const [ingressoKey, captureKey] of Object.entries(INGRESSO_TO_CAPTURE) as Array<
    [keyof SchedaIngressoFields, string]
  >) {
    const v = fields[ingressoKey];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    out.push({ fieldKey: captureKey, confirmedValue: trimmed });
  }
  return out;
}
