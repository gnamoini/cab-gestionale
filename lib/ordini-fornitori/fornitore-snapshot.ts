/** Snapshot fornitore ordine — label + anagrafica minima (persistita su ordine). */

import { parseFornitoreEmailAggiuntive } from "@/lib/magazzino/fornitore-anagrafica";
import { isValidEmail } from "@/lib/validation/email";

export type OrdineFornitoreFornitoreSnapshot = {
  label: string;
  ragioneSociale: string;
  indirizzo: string;
  partitaIva: string;
  codiceFiscale: string;
  telefono: string;
  email: string;
  emailAggiuntive: string[];
};

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const ORDINE_FORNITORE_TELEFONO_DEFAULT = "+39";

export function emptyOrdineFornitoreFornitoreSnapshot(label = ""): OrdineFornitoreFornitoreSnapshot {
  return {
    label,
    ragioneSociale: label,
    indirizzo: "",
    partitaIva: "",
    codiceFiscale: "",
    telefono: ORDINE_FORNITORE_TELEFONO_DEFAULT,
    email: "",
    emailAggiuntive: [],
  };
}

export function parseOrdineFornitoreFornitoreSnapshot(
  raw: Record<string, unknown> | null | undefined,
  fallbackLabel = "",
): OrdineFornitoreFornitoreSnapshot {
  if (!raw || typeof raw !== "object") return emptyOrdineFornitoreFornitoreSnapshot(fallbackLabel);
  const emailRaw = strField(raw.email ?? raw.email_fornitore).trim();
  return {
    label: strField(raw.label) || fallbackLabel,
    ragioneSociale: strField(raw.ragioneSociale ?? raw.ragione_sociale) || strField(raw.label) || fallbackLabel,
    indirizzo: strField(raw.indirizzo),
    partitaIva: strField(raw.partitaIva ?? raw.partita_iva),
    codiceFiscale: strField(raw.codiceFiscale ?? raw.codice_fiscale),
    telefono: strField(raw.telefono),
    email: isValidEmail(emailRaw) ? emailRaw : "",
    emailAggiuntive: parseFornitoreEmailAggiuntive(raw.emailAggiuntive ?? raw.email_aggiuntive),
  };
}

/** ponytail: CF vuoto eredita P. IVA (fornitore giuridico). */
export function resolveOrdineFornitoreCodiceFiscale(
  snapshot: Pick<OrdineFornitoreFornitoreSnapshot, "codiceFiscale" | "partitaIva">,
): string {
  const cf = snapshot.codiceFiscale.trim();
  if (cf) return cf;
  return snapshot.partitaIva.trim();
}

/** ponytail: fallback +39 solo in export; in form resta il valore digitato (es. "+"). */
export function resolveOrdineFornitoreTelefono(
  snapshot: Pick<OrdineFornitoreFornitoreSnapshot, "telefono">,
): string {
  const tel = snapshot.telefono.trim();
  if (tel) return tel;
  return ORDINE_FORNITORE_TELEFONO_DEFAULT;
}

export function ordineFornitoreFornitoreSnapshotToRecord(
  snapshot: OrdineFornitoreFornitoreSnapshot,
): Record<string, unknown> {
  return {
    label: snapshot.label.trim(),
    ragioneSociale: snapshot.ragioneSociale.trim(),
    indirizzo: snapshot.indirizzo.trim(),
    partitaIva: snapshot.partitaIva.trim(),
    codiceFiscale: snapshot.codiceFiscale.trim(),
    telefono: snapshot.telefono.trim(),
    email: snapshot.email.trim(),
    emailAggiuntive: [...snapshot.emailAggiuntive],
  };
}

export function buildFornitoreSnapshotFromLabel(label: string): Record<string, unknown> {
  return ordineFornitoreFornitoreSnapshotToRecord(emptyOrdineFornitoreFornitoreSnapshot(label.trim()));
}

export function patchOrdineFornitoreFornitoreSnapshot(
  raw: Record<string, unknown> | null | undefined,
  fallbackLabel: string,
  patch: Partial<OrdineFornitoreFornitoreSnapshot>,
): Record<string, unknown> {
  const current = parseOrdineFornitoreFornitoreSnapshot(raw, fallbackLabel);
  return ordineFornitoreFornitoreSnapshotToRecord({
    ...current,
    ...patch,
    label: (patch.label ?? current.label ?? fallbackLabel).trim(),
  });
}

export function ordineFornitoreFornitorePdfFields(
  fornitoreLabel: string,
  snapshot: OrdineFornitoreFornitoreSnapshot,
): { label: string; value: string | undefined }[] {
  const rows = [
    {
      label: "Ragione sociale",
      value: snapshot.ragioneSociale.trim() || fornitoreLabel.trim() || snapshot.label.trim() || undefined,
    },
    { label: "Indirizzo", value: snapshot.indirizzo.trim() || undefined },
    { label: "Partita IVA", value: snapshot.partitaIva.trim() || undefined },
    { label: "Codice fiscale", value: resolveOrdineFornitoreCodiceFiscale(snapshot) || undefined },
    { label: "Telefono", value: resolveOrdineFornitoreTelefono(snapshot) || undefined },
  ];
  return rows.filter((r) => r.value);
}
