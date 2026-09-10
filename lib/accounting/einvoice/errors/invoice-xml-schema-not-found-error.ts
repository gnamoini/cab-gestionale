export class InvoiceXmlSchemaNotFoundError extends Error {
  readonly code = "INVOICE_XML_SCHEMA_NOT_FOUND";
  readonly schemaVersion: string;
  readonly format: string;

  constructor(schemaVersion: string, format: string, message?: string) {
    super(message ?? `Schema XSD non trovato: ${format} ${schemaVersion}`);
    this.name = "InvoiceXmlSchemaNotFoundError";
    this.schemaVersion = schemaVersion;
    this.format = format;
  }
}
