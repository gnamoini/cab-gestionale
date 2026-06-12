import { dsLabel } from "@/lib/ui/design-system";

/** Titolo campo: visibile ma non estende la hitbox al controllo (no focus al click sul titolo). */
export const gestionaleFieldLabelClass = `${dsLabel} cursor-default pointer-events-none select-none`;

/** Titolo filtro toolbar / griglia filtri. */
export const gestionaleFilterFieldLabelClass =
  "text-xs font-medium text-[color:var(--cab-text-muted)] cursor-default pointer-events-none select-none";
