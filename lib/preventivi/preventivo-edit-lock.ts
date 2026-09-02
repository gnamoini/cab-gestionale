export function isPreventivoEditableByStaff(row: { stato_workflow: string }): boolean {
  return row.stato_workflow === "bozza";
}

/** @deprecated Colonna `stato_cliente` rimossa — usa `statoWorkflow === 'inviato'` in UI. */
export function isPreventivoPendingClientResponse(row: { stato_workflow: string }): boolean {
  return row.stato_workflow === "inviato";
}
