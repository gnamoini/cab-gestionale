import type { PreventivoStato } from "@/lib/preventivi/types";

export const PREVENTIVO_TRANSITIONS = {
  bozza: ["inviato", "annullato"],
  inviato: ["confermato", "annullato"],
  confermato: ["annullato"],
  annullato: ["bozza", "inviato"],
} as const satisfies Record<PreventivoStato, readonly PreventivoStato[]>;

export function canTransitionPreventivoStato(from: PreventivoStato, to: PreventivoStato): boolean {
  if (from === to) return false;
  return (PREVENTIVO_TRANSITIONS[from] as readonly PreventivoStato[]).includes(to);
}

export function preventivoStatoTransitionTargets(from: PreventivoStato): readonly PreventivoStato[] {
  return PREVENTIVO_TRANSITIONS[from];
}
