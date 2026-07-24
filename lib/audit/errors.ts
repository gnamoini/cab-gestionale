export class AuditLogWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditLogWriteError";
  }
}
