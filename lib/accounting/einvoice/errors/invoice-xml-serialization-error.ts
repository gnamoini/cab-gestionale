export class InvoiceXmlSerializationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvoiceXmlSerializationError";
    this.code = code;
  }
}
