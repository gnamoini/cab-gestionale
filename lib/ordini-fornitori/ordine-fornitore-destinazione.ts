import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import {
  destinatarioSnapshotToRecord,
  parseOrdineFornitoreDestinatarioSnapshot,
  type OrdineFornitoreDestinatarioAnagrafica,
} from "@/lib/ordini-fornitori/destinatario-snapshot";

export type OrdineFornitoreDestinazioneTipo = "magazzino" | "altro";

export type OrdineFornitoreDestinazioneSnapshot = {
  tipo?: OrdineFornitoreDestinazioneTipo;
  indirizzoMagazzino?: string;
  label?: string;
  indirizzo?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  telefono?: string;
};

export function readDestinazioneTipo(
  snapshot: Record<string, unknown> | null | undefined,
  destinazione: string,
  magazzinoLine: string,
): OrdineFornitoreDestinazioneTipo {
  const parsed = parseOrdineFornitoreDestinatarioSnapshot(snapshot, destinazione);
  if (parsed.tipo === "magazzino" || parsed.tipo === "altro") return parsed.tipo;
  const dest = parsed.indirizzo.trim() || destinazione.trim();
  const mag = magazzinoLine.trim();
  if (!dest) return "magazzino";
  if (mag && dest === mag) return "magazzino";
  return "altro";
}

function syncDestinazioneRecord(
  record: OrdineFornitoreRecord,
  snapshot: ReturnType<typeof parseOrdineFornitoreDestinatarioSnapshot>,
): OrdineFornitoreRecord {
  const indirizzo = snapshot.indirizzo.trim();
  return {
    ...record,
    destinazione: indirizzo,
    destinazioneSnapshot: destinatarioSnapshotToRecord(snapshot),
  };
}

export function applyDestinazioneMagazzino(
  record: OrdineFornitoreRecord,
  magazzinoLine: string,
  settingsAnagrafica?: Partial<OrdineFornitoreDestinatarioAnagrafica>,
): OrdineFornitoreRecord {
  const line = magazzinoLine.trim();
  const fromSettings = settingsAnagrafica ?? {};
  return syncDestinazioneRecord(record, {
    tipo: "magazzino",
    indirizzoMagazzino: line || undefined,
    label: fromSettings.label?.trim() ?? "",
    indirizzo: line || fromSettings.indirizzo?.trim() || "",
    partitaIva: fromSettings.partitaIva?.trim() ?? "",
    codiceFiscale: fromSettings.codiceFiscale?.trim() ?? "",
    telefono: fromSettings.telefono?.trim() ?? "",
    bancaAppoggioNome: "",
    bancaAppoggioIban: "",
  });
}

export function applyDestinazioneAltro(record: OrdineFornitoreRecord): OrdineFornitoreRecord {
  return syncDestinazioneRecord(record, {
    tipo: "altro",
    indirizzoMagazzino: undefined,
    label: "",
    indirizzo: "",
    partitaIva: "",
    codiceFiscale: "",
    telefono: "",
    bancaAppoggioNome: "",
    bancaAppoggioIban: "",
  });
}

export function defaultNewOrdineDestinazione(
  record: OrdineFornitoreRecord,
  magazzinoLine: string,
  settingsAnagrafica?: Partial<OrdineFornitoreDestinatarioAnagrafica>,
): OrdineFornitoreRecord {
  const current = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
  if (
    current.indirizzo.trim() ||
    current.label.trim() ||
    current.partitaIva.trim() ||
    current.codiceFiscale.trim() ||
    current.telefono.trim() ||
    current.bancaAppoggioNome.trim() ||
    current.bancaAppoggioIban.trim()
  ) {
    return record;
  }
  return applyDestinazioneMagazzino(record, magazzinoLine, settingsAnagrafica);
}
