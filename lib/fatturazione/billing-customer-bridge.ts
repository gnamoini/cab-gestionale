import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import type { BillingCustomerRow } from "@/src/types/supabase-tables";

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
  return {
    ragione_sociale: anag.ragioneSociale || anag.nomeDisplay,
    partita_iva: anag.partitaIva || undefined,
    codice_sdi: anag.codiceDestinatario || undefined,
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

export function billingSnapshotFromCustomerRow(row: BillingCustomerRow): BillingCustomerSnapshot {
  const addr = row.indirizzo && typeof row.indirizzo === "object" ? row.indirizzo : {};
  return {
    ragione_sociale: row.ragione_sociale ?? row.cliente_label,
    partita_iva: row.partita_iva ?? undefined,
    codice_fiscale: row.codice_fiscale ?? undefined,
    pec: row.pec ?? undefined,
    codice_sdi: row.codice_sdi ?? undefined,
    indirizzo: addr as BillingCustomerSnapshot["indirizzo"],
  };
}

export function findBillingCustomerByLabel(
  customers: readonly BillingCustomerRow[],
  clienteLabel: string,
): BillingCustomerRow | null {
  const key = buildClienteEntityKey(clienteLabel);
  if (key) {
    const byKey = customers.find((c) => c.entity_key === key);
    if (byKey) return byKey;
  }
  const norm = clienteLabel.trim().toLowerCase();
  return customers.find((c) => c.cliente_label.trim().toLowerCase() === norm) ?? null;
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
