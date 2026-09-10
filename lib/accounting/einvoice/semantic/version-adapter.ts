import type { FatturapaSemanticDocument } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";
import type { InvoiceXmlSchemaVersion } from "@/lib/accounting/einvoice/schemas/schema-registry";

/** Maps semantic model to version-specific field constraints. ponytail: passthrough for 1.3.1; extend for future XSD deltas. */
export function adaptSemanticForSchemaVersion(
  semantic: FatturapaSemanticDocument,
  schema: InvoiceXmlSchemaVersion,
): FatturapaSemanticDocument {
  if (schema.schemaVersion === "1.2.2" || schema.schemaVersion === "1.3.1") {
    return { ...semantic, namespace: schema.namespace };
  }
  return semantic;
}
