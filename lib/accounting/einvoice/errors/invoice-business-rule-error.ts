export class InvoiceBusinessRuleError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly path?: string;
  readonly context?: Record<string, unknown>;

  constructor(code: string, message: string, opts?: { field?: string; path?: string; context?: Record<string, unknown> }) {
    super(message);
    this.name = "InvoiceBusinessRuleError";
    this.code = code;
    this.field = opts?.field;
    this.path = opts?.path;
    this.context = opts?.context;
  }
}
