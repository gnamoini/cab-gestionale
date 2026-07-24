import type { RicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import { RICAMBIO_UNITA_MISURA_DEFAULT } from "@/lib/magazzino/ricambio-unita-misura";

export type NumericEmptyOnBlur = "revert" | "default" | "zero" | "allowEmpty";
export type NumericInvalidDraftOnBlur = "revert" | "zero";

export type NumericInputPreset = {
  inputMode: "decimal" | "numeric";
  precision?: number;
  min?: number;
  max?: number;
  emptyOnBlur: NumericEmptyOnBlur;
  defaultOnEmpty?: number;
  invalidDraftOnBlur: NumericInvalidDraftOnBlur;
};

export const NUMERIC_PRESETS = {
  oreLavorazione: {
    inputMode: "decimal",
    precision: 3,
    min: 0,
    emptyOnBlur: "zero",
    defaultOnEmpty: 0,
    invalidDraftOnBlur: "revert",
  },
  quantitaRicambio: {
    inputMode: "decimal",
    precision: 3,
    min: 0,
    emptyOnBlur: "default",
    defaultOnEmpty: 1,
    invalidDraftOnBlur: "revert",
  },
  prezzo: {
    inputMode: "decimal",
    precision: 2,
    min: 0,
    emptyOnBlur: "zero",
    defaultOnEmpty: 0,
    invalidDraftOnBlur: "revert",
  },
  percentuale: {
    inputMode: "decimal",
    precision: 2,
    min: 0,
    max: 100,
    emptyOnBlur: "zero",
    defaultOnEmpty: 0,
    invalidDraftOnBlur: "revert",
  },
  scorta: {
    inputMode: "numeric",
    precision: 0,
    min: 0,
    emptyOnBlur: "revert",
    invalidDraftOnBlur: "revert",
  },
  labelQty: {
    inputMode: "numeric",
    precision: 0,
    min: 0,
    max: 99,
    emptyOnBlur: "zero",
    defaultOnEmpty: 0,
    invalidDraftOnBlur: "revert",
  },
  anagraficaMeter: {
    inputMode: "decimal",
    emptyOnBlur: "allowEmpty",
    invalidDraftOnBlur: "revert",
  },
} as const satisfies Record<string, NumericInputPreset>;

export function resolveQuantityPreset(um: RicambioUnitaMisura = RICAMBIO_UNITA_MISURA_DEFAULT): NumericInputPreset {
  const base = NUMERIC_PRESETS.quantitaRicambio;
  switch (um) {
    case "pz":
      return { ...base, precision: 0, inputMode: "numeric", min: 1 };
    case "metri":
      return { ...base, precision: 2, inputMode: "decimal", min: 0.01 };
    case "lt":
      return { ...base, precision: 3, inputMode: "decimal", min: 0.01 };
    default:
      return base;
  }
}

/** Ore addetto in preventivo — min 0.01, default riga nuova 1. */
export const ORE_PREVENTIVO_ADDETTO_PRESET: NumericInputPreset = {
  inputMode: "decimal",
  precision: 2,
  min: 0.01,
  emptyOnBlur: "default",
  defaultOnEmpty: 1,
  invalidDraftOnBlur: "revert",
};
