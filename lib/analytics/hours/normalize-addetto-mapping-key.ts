/** Chiave normalizzata per mapping addetto → employee (SSOT lookup). */
export function normalizeAddettoMappingKey(nome: string): string {
  return nome.trim().toLowerCase();
}
