import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

/** Post-share: ordine consegnato al client di posta, non «email inviata al fornitore». */
export const ORDINE_FORNITORE_SHARE_SUCCESS_MESSAGE =
  "Ordine trasmesso al client di posta. Completa e invia l'email dal tuo programma.";

export const ORDINE_FORNITORE_FALLBACK_MANUAL_MESSAGE = "PDF scaricato. Allegalo manualmente alla mail.";

export const ORDINE_FORNITORE_SUPPLIER_EMAIL_MISSING_MESSAGE =
  "Email del fornitore non configurata. Inserisci l'email nell'anagrafica fornitore in Magazzino.";

export function ordineFornitoreEmailDraftSubject(record: Pick<OrdineFornitoreRecord, "numero">): string {
  const num = record.numero?.trim();
  return num ? `Ordine fornitore #${num}` : "Ordine fornitore";
}

export function ordineFornitoreEmailDraftBody(): string {
  return "Buongiorno, in allegato trasmettiamo il nostro ordine.";
}

export function ordineFornitoreEmailAttachmentFileName(record: Pick<OrdineFornitoreRecord, "numero">): string {
  const safeNum = (record.numero || "ordine").replace(/[^\w\-]+/g, "-").replace(/\//g, "-");
  return `Ordine-${safeNum}.pdf`;
}

export function buildOrdineFornitoreMailtoHref(
  email: string,
  record: Pick<OrdineFornitoreRecord, "numero">,
): string {
  const subject = ordineFornitoreEmailDraftSubject(record);
  const body = ordineFornitoreEmailDraftBody();
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${encodeURIComponent(email)}?${params.toString()}`;
}

export type OrdineFornitoreEmailDraftShareOutcome = "shared" | "cancelled" | "fallback_manual";

/** Mappa errore share → azione successiva (testabile senza DOM). */
export function classifyOrdineFornitoreShareError(err: unknown): "cancelled" | "fallback" {
  if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
  return "fallback";
}
