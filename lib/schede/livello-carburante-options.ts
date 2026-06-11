/** Livelli carburante scheda ingresso — SSOT valori persistiti. */
export const LIVELLO_CARBURANTE_OPTIONS = ["Vuoto", "1/4", "1/2", "3/4", "Pieno"] as const;

export type LivelloCarburanteOption = (typeof LIVELLO_CARBURANTE_OPTIONS)[number];
