import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { InvoiceXmlSchemaNotFoundError } from "@/lib/accounting/einvoice/errors/invoice-xml-schema-not-found-error";
import type { TransmissionFormat } from "@/lib/accounting/einvoice/canonical/model";

export type InvoiceXmlSchemaVersion = {
  id: string;
  format: TransmissionFormat;
  schemaVersion: string;
  specificationVersion: string;
  namespace: string;
  xsdEntrypoint: string;
  xsdSha256: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
};

const SCHEMAS_ROOT = join(process.cwd(), "lib/accounting/einvoice/schemas/faturapa");

const FATTURAPA_NAMESPACE = "http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function buildVersion(
  id: string,
  format: TransmissionFormat,
  schemaVersion: string,
  specVersion: string,
  folder: string,
  entrypoint: string,
  effectiveFrom: string,
  effectiveTo: string | undefined,
  isActive: boolean,
): InvoiceXmlSchemaVersion {
  const fullPath = join(SCHEMAS_ROOT, folder, entrypoint);
  if (!existsSync(fullPath)) {
    throw new InvoiceXmlSchemaNotFoundError(schemaVersion, format, `File XSD assente: ${fullPath}`);
  }
  return {
    id,
    format,
    schemaVersion,
    specificationVersion: specVersion,
    namespace: FATTURAPA_NAMESPACE,
    xsdEntrypoint: fullPath,
    xsdSha256: sha256File(fullPath),
    effectiveFrom,
    effectiveTo,
    isActive,
  };
}

const REGISTRY: InvoiceXmlSchemaVersion[] = [
  buildVersion("fpr12-1.3.1", "FPR12", "1.3.1", "1.3.1", "1.3.1", "VFPR12-root.xsd", "2024-01-01", undefined, true),
  buildVersion("fpa12-1.3.1", "FPA12", "1.3.1", "1.3.1", "1.3.1", "VFPA12-root.xsd", "2024-01-01", undefined, true),
  buildVersion("fpr12-1.2.2", "FPR12", "1.2.2", "1.2.2", "1.2.2", "VFPR12-root.xsd", "2020-01-01", "2025-03-31", false),
];

export function listSchemaVersions(): InvoiceXmlSchemaVersion[] {
  return [...REGISTRY];
}

export function resolveSchemaVersion(
  emissionDate: string | undefined,
  format: TransmissionFormat,
  preferredVersion = "1.3.1",
): InvoiceXmlSchemaVersion {
  const date = emissionDate ?? new Date().toISOString().slice(0, 10);
  const candidates = REGISTRY.filter((s) => s.format === format && s.isActive);
  const preferred = candidates.find((s) => s.schemaVersion === preferredVersion);
  if (preferred) {
    if (preferred.effectiveFrom && date < preferred.effectiveFrom) {
      throw new InvoiceXmlSchemaNotFoundError(preferredVersion, format, `Schema non ancora efficace per data ${date}`);
    }
    return preferred;
  }
  const fallback = candidates.find((s) => {
    if (s.effectiveFrom && date < s.effectiveFrom) return false;
    if (s.effectiveTo && date > s.effectiveTo) return false;
    return true;
  });
  if (!fallback) {
    throw new InvoiceXmlSchemaNotFoundError(preferredVersion, format);
  }
  return fallback;
}

export function getSchemaDirectory(schema: InvoiceXmlSchemaVersion): string {
  return join(SCHEMAS_ROOT, schema.schemaVersion === "1.2.2" ? "1.2.2" : "1.3.1");
}
