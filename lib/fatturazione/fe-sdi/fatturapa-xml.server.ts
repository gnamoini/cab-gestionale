import { generateValidatedInvoiceXml, hashInvoiceXml, validateBusinessRules } from "@/lib/accounting/einvoice";
import { normalizeCanonicalInvoice } from "@/lib/accounting/einvoice/canonical/normalize";
import { validateCanonicalStructure } from "@/lib/accounting/einvoice/canonical/validate";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";
import { InvoiceBusinessRuleError } from "@/lib/accounting/einvoice/errors/invoice-business-rule-error";
import { InvoiceCanonicalizationError } from "@/lib/accounting/einvoice/errors/invoice-canonicalization-error";
import { InvoiceXmlValidationError } from "@/lib/accounting/einvoice/errors/invoice-xml-validation-error";

export type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";
export { hashInvoiceXml };

export type FatturapaXmlResult =
  | { ok: true; xml: string; xmlHash: string; schemaVersion: string; errors: [] }
  | { ok: false; xml: string; xmlHash: string; schemaVersion: string; errors: string[] };

/** XML FatturaPA from emission snapshot — delegates to FASE 10 pure engine. */
export function buildFatturapaXmlFromSnapshot(
  snapshot: InvoiceEmissionSnapshot,
  overlay?: { pec?: string | null; codice_destinatario?: string | null },
  invoiceId = "snapshot",
  companyId = "00000000-0000-4000-8000-000000000001",
): FatturapaXmlResult {
  const snap = { ...snapshot };
  if (overlay?.pec || overlay?.codice_destinatario) {
    snap.cliente = {
      ...(snap.cliente ?? {}),
      ...(overlay.pec ? { pec: overlay.pec } : {}),
      ...(overlay.codice_destinatario ? { codice_destinatario: overlay.codice_destinatario } : {}),
    };
  }

  try {
    const canonical = normalizeCanonicalInvoice(buildCanonicalFromSnapshot(invoiceId, companyId, snap));
    validateCanonicalStructure(canonical);
    const business = validateBusinessRules(canonical, { requireCabEnabled: true });
    if (!business.valid) {
      const errors = business.errors.map((e) => `${e.code}: ${e.message}`);
      return {
        ok: false,
        xml: "",
        xmlHash: hashInvoiceXml(""),
        schemaVersion: "FPR12-1.3.1",
        errors,
      };
    }
    const generated = generateValidatedInvoiceXml(canonical, { requireCabEnabled: true });
    return {
      ok: true,
      xml: generated.xml,
      xmlHash: generated.sha256,
      schemaVersion: `${generated.transmissionFormat}-${generated.schemaVersion}`,
      errors: [],
    };
  } catch (e) {
    const errors: string[] = [];
    if (e instanceof InvoiceBusinessRuleError || e instanceof InvoiceCanonicalizationError || e instanceof InvoiceXmlValidationError) {
      errors.push(`${e.code}: ${e.message}`);
      if (e instanceof InvoiceXmlValidationError) errors.push(...e.issues);
    } else {
      errors.push(e instanceof Error ? e.message : "XML_BUILD_FAILED");
    }
    const partial = "";
    return {
      ok: false,
      xml: partial,
      xmlHash: hashInvoiceXml(partial),
      schemaVersion: "FPR12-1.3.1",
      errors,
    };
  }
}
