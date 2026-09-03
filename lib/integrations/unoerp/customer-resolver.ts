import type { CustomerResolveResult } from "@/lib/integrations/unoerp/types";

export type CabCustomerIdentity = {
  cabCustomerId: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  codiceClienteUnoerp: string | null;
};

export type StoredCustomerMapping = {
  cabCustomerId: string;
  unoerpCustomerId: string;
  unoerpVat: string | null;
  unoerpTaxId: string | null;
};

/**
 * Mapping consolidato = authority. Nessuna riassociazione automatica.
 */
export function resolveCustomer(input: {
  identity: CabCustomerIdentity;
  mapping: StoredCustomerMapping | null;
  vatMatches: string[];
  cfMatches: string[];
  codeMatches: string[];
}): CustomerResolveResult {
  const { identity, mapping } = input;
  if (mapping) {
    const vat = normalizeTax(identity.partitaIva);
    const mappedVat = normalizeTax(mapping.unoerpVat);
    if (vat && mappedVat && vat !== mappedVat) {
      return { ok: false, code: "UNOERP_CUSTOMER_IDENTITY_DRIFT" };
    }
    const cf = normalizeTax(identity.codiceFiscale);
    const mappedCf = normalizeTax(mapping.unoerpTaxId);
    if (cf && mappedCf && cf !== mappedCf) {
      return { ok: false, code: "UNOERP_CUSTOMER_IDENTITY_DRIFT" };
    }
    return { ok: true, unoerpCustomerId: mapping.unoerpCustomerId, matchedBy: "mapping" };
  }
  const vat = unique(input.vatMatches);
  if (vat.length === 1) return { ok: true, unoerpCustomerId: vat[0]!, matchedBy: "partita_iva" };
  if (vat.length > 1) return { ok: false, code: "UNOERP_CUSTOMER_AMBIGUOUS" };
  const cf = unique(input.cfMatches);
  if (cf.length === 1) return { ok: true, unoerpCustomerId: cf[0]!, matchedBy: "codice_fiscale" };
  if (cf.length > 1) return { ok: false, code: "UNOERP_CUSTOMER_AMBIGUOUS" };
  const code = unique(input.codeMatches);
  if (code.length === 1) return { ok: true, unoerpCustomerId: code[0]!, matchedBy: "codice_cliente" };
  if (code.length > 1) return { ok: false, code: "UNOERP_CUSTOMER_AMBIGUOUS" };
  return { ok: false, code: "UNOERP_CUSTOMER_NOT_FOUND" };
}

function normalizeTax(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, "").toUpperCase();
}

function unique(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
