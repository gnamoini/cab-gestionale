export class InvoiceXmlValidationError extends Error {
  readonly code: string;
  readonly issues: string[];
  readonly field?: string;
  readonly path?: string;

  constructor(code: string, message: string, issues: string[] = [], opts?: { field?: string; path?: string }) {
    super(message);
    this.name = "InvoiceXmlValidationError";
    this.code = code;
    this.issues = issues;
    this.field = opts?.field;
    this.path = opts?.path;
  }
}
