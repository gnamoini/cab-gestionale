import type { PreventivoStato } from "@/lib/preventivi/types";

export const PREVENTIVO_STATI = [
  "bozza",
  "inviato",
  "confermato",
  "annullato",
] as const satisfies readonly PreventivoStato[];

/** ponytail: nessun grafo transizioni — ogni stato è raggiungibile (eccetto noop). */
export function canTransitionPreventivoStato(from: PreventivoStato, to: PreventivoStato): boolean {
  return from !== to;
}

export function preventivoStatoTransitionTargets(from: PreventivoStato): readonly PreventivoStato[] {
  return PREVENTIVO_STATI.filter((stato) => stato !== from);
}
