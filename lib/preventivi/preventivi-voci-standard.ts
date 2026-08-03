/** Voci e regole strutturali obbligatorie per ogni preventivo. */

export const PREVENTIVO_SANIFICAZIONE_DESCRIZIONE =
  "Sanificazione e lavaggio cabina e parti da lavorare";

export function resolveSanificazioneDescrizione(desc?: string | null): string {
  const t = typeof desc === "string" ? desc.trim() : "";
  return t || PREVENTIVO_SANIFICAZIONE_DESCRIZIONE;
}

export function isVoceSanificazionePreventivo(desc: string, sanificazioneDescrizione?: string | null): boolean {
  if (
    normDescrizioneVoce(desc) === normDescrizioneVoce(resolveSanificazioneDescrizione(sanificazioneDescrizione))
  ) {
    return true;
  }
  return isDescrizioneSanificazione(desc);
}

export const PREVENTIVO_COLLAUDO_DESCRIZIONE = "Collaudo funzionale";

export function resolveCollaudoDescrizione(desc?: string | null): string {
  const t = typeof desc === "string" ? desc.trim() : "";
  return t || PREVENTIVO_COLLAUDO_DESCRIZIONE;
}

export function isVoceCollaudoPreventivo(desc: string, collaudoDescrizione?: string | null): boolean {
  if (normDescrizioneVoce(desc) === normDescrizioneVoce(resolveCollaudoDescrizione(collaudoDescrizione))) {
    return true;
  }
  return isDescrizioneCollaudo(desc);
}

export const PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE = "Materiali di consumo";

export const PREVENTIVO_SMALTIMENTO_DESCRIZIONE = "Contributo smaltimento rifiuti";

export const PREVENTIVO_SMALTIMENTO_PERCENT = 1;

export const PREVENTIVO_RIGA_MATERIALI_ID = "prr-materiali-consumo";

export function normDescrizioneVoce(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isDescrizioneSanificazione(desc: string): boolean {
  const n = normDescrizioneVoce(desc);
  return n.includes("sanificazione") && n.includes("lavaggio");
}

export function isDescrizioneSmaltimento(desc: string): boolean {
  return normDescrizioneVoce(desc).includes("smaltimento") && normDescrizioneVoce(desc).includes("rifiut");
}

export function isDescrizioneMaterialiConsumo(desc: string): boolean {
  return normDescrizioneVoce(desc) === normDescrizioneVoce(PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE);
}

export function isDescrizioneCollaudo(desc: string): boolean {
  const n = normDescrizioneVoce(desc);
  return n.includes("collaudo funzionale") || (n.startsWith("collaudo") && n.length < 48);
}
