import type { PreventivoStatoWorkflow } from "@/lib/preventivi/types";

const WORKFLOW_TARGETS: Record<PreventivoStatoWorkflow, readonly PreventivoStatoWorkflow[]> = {
  bozza: ["inviato", "annullato"],
  inviato: ["bozza", "annullato"],
  acquisito: ["annullato"],
  annullato: [],
};

export const PREVENTIVO_WORKFLOW_STATI = [
  "bozza",
  "inviato",
  "acquisito",
  "annullato",
] as const satisfies readonly PreventivoStatoWorkflow[];

export function canTransitionPreventivoWorkflow(
  from: PreventivoStatoWorkflow,
  to: PreventivoStatoWorkflow,
): boolean {
  return WORKFLOW_TARGETS[from]?.includes(to) ?? false;
}

export function preventivoWorkflowTransitionTargets(
  from: PreventivoStatoWorkflow,
): readonly PreventivoStatoWorkflow[] {
  return WORKFLOW_TARGETS[from] ?? [];
}

/** Staff dropdown: solo transizioni workflow (no acquisito manuale). */
export function preventivoStaffWorkflowTransitionTargets(
  from: PreventivoStatoWorkflow,
): readonly PreventivoStatoWorkflow[] {
  return preventivoWorkflowTransitionTargets(from).filter((s) => s !== "acquisito");
}
