/** Snapshot destinatario ordine — anagrafica + tipo destinazione (JSON su ordine). */

import type { OrdineFornitoreDestinazioneTipo } from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";
import {
  ORDINE_FORNITORE_TELEFONO_DEFAULT,
  resolveOrdineFornitoreCodiceFiscale,
  resolveOrdineFornitoreTelefono,
} from "@/lib/ordini-fornitori/fornitore-snapshot";

export type OrdineFornitoreDestinatarioAnagrafica = {
  label: string;
  indirizzo: string;
  partitaIva: string;
  codiceFiscale: string;
  telefono: string;
  bancaAppoggioNome: string;
  bancaAppoggioIban: string;
};

export type OrdineFornitoreDestinatarioSnapshot = OrdineFornitoreDestinatarioAnagrafica & {
  tipo?: OrdineFornitoreDestinazioneTipo;
  indirizzoMagazzino?: string;
};

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBancaAppoggioFields(raw: Record<string, unknown>): Pick<
  OrdineFornitoreDestinatarioAnagrafica,
  "bancaAppoggioNome" | "bancaAppoggioIban"
> {
  const legacy = strField(raw.bancaAppoggio ?? raw.banca_appoggio);
  const bancaAppoggioNome =
    strField(raw.bancaAppoggioNome ?? raw.banca_appoggio_nome) || legacy;
  const bancaAppoggioIban = strField(raw.bancaAppoggioIban ?? raw.banca_appoggio_iban);
  return { bancaAppoggioNome, bancaAppoggioIban };
}

export function emptyOrdineFornitoreDestinatarioAnagrafica(): OrdineFornitoreDestinatarioAnagrafica {
  return {
    label: "",
    indirizzo: "",
    partitaIva: "",
    codiceFiscale: "",
    telefono: "",
    bancaAppoggioNome: "",
    bancaAppoggioIban: "",
  };
}

export function parseOrdineFornitoreDestinatarioSnapshot(
  raw: Record<string, unknown> | null | undefined,
  fallbackIndirizzo = "",
): OrdineFornitoreDestinatarioSnapshot {
  if (!raw || typeof raw !== "object") {
    return {
      ...emptyOrdineFornitoreDestinatarioAnagrafica(),
      indirizzo: fallbackIndirizzo.trim(),
    };
  }
  const indirizzo = strField(raw.indirizzo) || fallbackIndirizzo.trim();
  const tipo = raw.tipo;
  const banca = readBancaAppoggioFields(raw);
  return {
    label: strField(raw.label),
    indirizzo,
    partitaIva: strField(raw.partitaIva ?? raw.partita_iva),
    codiceFiscale: strField(raw.codiceFiscale ?? raw.codice_fiscale),
    telefono: strField(raw.telefono),
    ...banca,
    tipo: tipo === "magazzino" || tipo === "altro" ? tipo : undefined,
    indirizzoMagazzino: strField(raw.indirizzoMagazzino ?? raw.indirizzo_magazzino) || undefined,
  };
}

export function destinatarioSnapshotToRecord(snapshot: OrdineFornitoreDestinatarioSnapshot): Record<string, unknown> {
  return {
    tipo: snapshot.tipo,
    indirizzoMagazzino: snapshot.indirizzoMagazzino?.trim() || undefined,
    label: snapshot.label.trim(),
    indirizzo: snapshot.indirizzo.trim(),
    partitaIva: snapshot.partitaIva.trim(),
    codiceFiscale: snapshot.codiceFiscale.trim(),
    telefono: snapshot.telefono.trim(),
    bancaAppoggioNome: snapshot.bancaAppoggioNome.trim(),
    bancaAppoggioIban: snapshot.bancaAppoggioIban.trim(),
  };
}

export function patchOrdineFornitoreDestinatarioSnapshot(
  raw: Record<string, unknown> | null | undefined,
  fallbackIndirizzo: string,
  patch: Partial<OrdineFornitoreDestinatarioSnapshot>,
): Record<string, unknown> {
  const current = parseOrdineFornitoreDestinatarioSnapshot(raw, fallbackIndirizzo);
  return destinatarioSnapshotToRecord({ ...current, ...patch });
}

export function ordineFornitoreDestinatarioPdfFields(
  snapshot: OrdineFornitoreDestinatarioSnapshot,
): { label: string; value: string | undefined }[] {
  const rows = [
    { label: "Ragione sociale", value: snapshot.label.trim() || undefined },
    { label: "Indirizzo", value: snapshot.indirizzo.trim() || undefined },
    { label: "Partita IVA", value: snapshot.partitaIva.trim() || undefined },
    {
      label: "Codice fiscale",
      value: resolveOrdineFornitoreCodiceFiscale(snapshot) || undefined,
    },
    { label: "Telefono", value: resolveOrdineFornitoreTelefono(snapshot) || undefined },
    { label: "Banca d'appoggio", value: snapshot.bancaAppoggioNome.trim() || undefined },
    { label: "IBAN", value: snapshot.bancaAppoggioIban.trim() || undefined },
  ];
  return rows.filter((r) => r.value);
}

export { ORDINE_FORNITORE_TELEFONO_DEFAULT };
