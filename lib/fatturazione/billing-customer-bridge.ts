import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import type { ClienteAnagraficaRow } from "@/src/types/supabase-tables";

export type BillingCustomerSnapshot = {
  ragione_sociale?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  pec?: string;
  codice_sdi?: string;
  indirizzo?: {
    via?: string;
    numero_civico?: string;
    cap?: string;
    citta?: string;
    provincia?: string;
    stato?: string;
  };
};

export function billingSnapshotFromAnagrafica(anag: ClienteAnagrafica): BillingCustomerSnapshot {
  const op = anag.sedi.operativa;
  const pecContact = anag.contatti.find((c) => c.tipo === "pec");
  return {
    ragione_sociale: anag.ragioneSociale || anag.nomeDisplay,
    partita_iva: anag.partitaIva || undefined,
    codice_sdi: anag.codiceDestinatario || undefined,
    pec: pecContact?.valore || undefined,
    indirizzo: {
      via: op.via || undefined,
      numero_civico: op.numeroCivico || undefined,
      cap: op.cap || undefined,
      citta: op.citta || undefined,
      provincia: op.provincia || undefined,
      stato: op.stato || "IT",
    },
  };
}

export function billingSnapshotFromClienteRow(row: ClienteAnagraficaRow): BillingCustomerSnapshot {
  return {
    ragione_sociale: row.ragione_sociale ?? row.nome_display,
    partita_iva: row.partita_iva ?? undefined,
    codice_fiscale: row.codice_fiscale ?? undefined,
    pec: row.pec ?? undefined,
    codice_sdi: row.codice_destinatario ?? undefined,
  };
}

/** Resolve cliente by internal id only — no text/label matching. */
export function findClienteById(
  customers: readonly ClienteAnagraficaRow[],
  clienteId: string,
): ClienteAnagraficaRow | null {
  return customers.find((c) => c.id === clienteId) ?? null;
}

export function mergeBillingSnapshot(
  base: BillingCustomerSnapshot,
  patch: Partial<BillingCustomerSnapshot>,
): BillingCustomerSnapshot {
  return {
    ...base,
    ...patch,
    indirizzo: { ...base.indirizzo, ...patch.indirizzo },
  };
}
