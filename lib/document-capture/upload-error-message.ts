export function mapDocumentCaptureUploadError(message: string): string {
  if (message.includes("uq_document_capture_company_sha256_finalized")) {
    return "Questo file è già stato usato di recente. Riprova: la finestra è stata resettata automaticamente.";
  }
  if (message.includes("duplicate key")) {
    return "Documento già presente. Carica di nuovo il file o scegline un altro.";
  }
  return message;
}
