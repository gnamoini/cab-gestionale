/** SSOT copy notifiche inbox/toast sotto scorta. */

export const MAGAZZINO_SOTTO_SCORTA_NOTIFICATION_TITLE = "Ricambio sotto scorta";

export function formatMagazzinoSottoScortaNotificationBody(input: {
  nome?: string | null;
  codice?: string | null;
  quantita: number;
  scortaMinima: number;
}): string {
  const nome = input.nome?.trim() || "Ricambio";
  const codice = input.codice?.trim();
  const qty = Math.max(0, Math.round(input.quantita));
  const min = Math.max(0, Math.round(input.scortaMinima));
  const head = codice ? `${nome} — Cod. ${codice}` : nome;
  return `${head}\nDisponibili: ${qty} — Soglia minima: ${min}`;
}
