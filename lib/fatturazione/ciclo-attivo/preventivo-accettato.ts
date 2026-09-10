export function isPreventivoAccettato(record: {
  statoCliente?: string | null;
  statoWorkflow?: string | null;
}): boolean {
  return record.statoCliente === "accettato" || record.statoWorkflow === "acquisito";
}
