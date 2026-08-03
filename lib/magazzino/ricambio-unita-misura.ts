/** Ordine UI: Pezzi → Metri → Litri (valori persistiti in meta). */
export const RICAMBIO_UNITA_MISURA_VALUES = ["pz", "metri", "lt"] as const;

export type RicambioUnitaMisura = (typeof RICAMBIO_UNITA_MISURA_VALUES)[number];

export const RICAMBIO_UNITA_MISURA_DEFAULT: RicambioUnitaMisura = "pz";

const UNITA_MISURA_LABELS: Record<RicambioUnitaMisura, string> = {
  pz: "Pezzi",
  metri: "Metri",
  lt: "Litri",
};

const UNITA_MISURA_SHORT: Record<RicambioUnitaMisura, string> = {
  pz: "pz",
  metri: "m",
  lt: "lt",
};

export function isRicambioUnitaMisura(value: unknown): value is RicambioUnitaMisura {
  return typeof value === "string" && (RICAMBIO_UNITA_MISURA_VALUES as readonly string[]).includes(value);
}

export function parseRicambioUnitaMisura(value: unknown): RicambioUnitaMisura {
  return isRicambioUnitaMisura(value) ? value : RICAMBIO_UNITA_MISURA_DEFAULT;
}

export function formatRicambioUnitaMisuraLabel(value: RicambioUnitaMisura): string {
  return UNITA_MISURA_LABELS[value];
}

export function formatRicambioUnitaMisuraShort(value: RicambioUnitaMisura): string {
  return UNITA_MISURA_SHORT[value];
}
