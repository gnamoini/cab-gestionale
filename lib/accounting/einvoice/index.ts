import { normalizeCanonicalInvoice } from "@/lib/accounting/einvoice/canonical/normalize";
import { validateCanonicalStructure } from "@/lib/accounting/einvoice/canonical/validate";
import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";
import { buildFatturapaXmlAst } from "@/lib/accounting/einvoice/builders/faturapa/faturapa-builder";
import { hashInvoiceXml } from "@/lib/accounting/einvoice/hash/invoice-xml-hash";
import { generateInvoiceXmlFilename } from "@/lib/accounting/einvoice/filename/invoice-filename";
import { serializeXmlAst } from "@/lib/accounting/einvoice/serialization/xml-serializer";
import { buildFatturapaSemanticModel } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";
import { adaptSemanticForSchemaVersion } from "@/lib/accounting/einvoice/semantic/version-adapter";
import { resolveSchemaVersion } from "@/lib/accounting/einvoice/schemas/schema-registry";
import { validateBusinessRules } from "@/lib/accounting/einvoice/validation/business-rules";
import { validateXmlAgainstXsd } from "@/lib/accounting/einvoice/validation/xsd-validator";
import { InvoiceBusinessRuleError } from "@/lib/accounting/einvoice/errors/invoice-business-rule-error";
import { InvoiceXmlValidationError } from "@/lib/accounting/einvoice/errors/invoice-xml-validation-error";
import type { GeneratedInvoiceXml } from "@/lib/accounting/einvoice/types/generated-invoice-xml";

export type { CanonicalElectronicInvoice, TransmissionFormat, Party, InvoiceLine, VatSummary, StampDutyData } from "@/lib/accounting/einvoice/canonical/model";
export type { GeneratedInvoiceXml } from "@/lib/accounting/einvoice/types/generated-invoice-xml";
export type { SchemaSupportedDocumentType, CabEnabledDocumentType, DocumentTypePolicy } from "@/lib/accounting/einvoice/canonical/document-types";
export { listDocumentTypePolicies, isCabEnabledDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
export { hashInvoiceXml } from "@/lib/accounting/einvoice/hash/invoice-xml-hash";
export { generateInvoiceXmlFilename } from "@/lib/accounting/einvoice/filename/invoice-filename";
export { validateBusinessRules } from "@/lib/accounting/einvoice/validation/business-rules";
export { resolveSchemaVersion, listSchemaVersions } from "@/lib/accounting/einvoice/schemas/schema-registry";

export function generateValidatedInvoiceXml(
  raw: CanonicalElectronicInvoice,
  opts?: { requireCabEnabled?: boolean },
): GeneratedInvoiceXml {
  const invoice = normalizeCanonicalInvoice(raw);
  validateCanonicalStructure(invoice);

  const business = validateBusinessRules(invoice, opts);
  if (!business.valid) {
    const first = business.errors[0];
    throw new InvoiceBusinessRuleError(first.code, first.message, { field: first.field, path: first.path });
  }

  const schema = resolveSchemaVersion(invoice.document.date, invoice.transmissionFormat, invoice.schemaVersion);
  const semantic = adaptSemanticForSchemaVersion(
    buildFatturapaSemanticModel(invoice, schema.namespace),
    schema,
  );
  const ast = buildFatturapaXmlAst(semantic);
  const xml = serializeXmlAst(ast);

  const xsd = validateXmlAgainstXsd(xml, schema);
  if (!xsd.valid) {
    throw new InvoiceXmlValidationError(
      "XSD_VALIDATION_FAILED",
      "XML non valido rispetto allo schema ufficiale",
      xsd.errors.map((e) => e.message),
    );
  }

  return {
    xml,
    schemaVersion: schema.schemaVersion,
    transmissionFormat: invoice.transmissionFormat,
    documentType: invoice.document.type,
    documentNumber: invoice.document.number,
    documentDate: invoice.document.date,
    sha256: hashInvoiceXml(xml),
    filename: generateInvoiceXmlFilename(invoice),
    validated: true,
  };
}
