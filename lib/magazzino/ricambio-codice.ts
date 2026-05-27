import type { ChangeEvent } from "react";

/** Normalizza codice ricambio (OE o alternativo) in maiuscolo — unica regola UI + persistenza. */
export function normalizeRicambioCodice(value: string): string {
  if (!value) return value;
  return value.toLocaleUpperCase("it-IT");
}

/** Input controllato: uppercase in tempo reale, cursore invariato se possibile. */
export function applyRicambioCodiceInputChange(
  event: ChangeEvent<HTMLInputElement>,
  onValue: (next: string) => void,
): void {
  const input = event.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const next = normalizeRicambioCodice(input.value);
  onValue(next);
  if (start === null || end === null) return;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(start, end);
    } catch {
      /* ignore */
    }
  });
}
