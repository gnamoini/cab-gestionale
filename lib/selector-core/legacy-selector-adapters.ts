"use client";

/**
 * Phase 1 strangler — adapter SSOT per autocomplete legacy.
 * Zero UI change: delega rendering al componente originale.
 * @see plan Selector UX Compliance v2 — migration_strategy strangler_pattern
 */

export {
  GestionaleMezzoAutocomplete,
  type GestionaleMezzoAutocompleteProps,
} from "@/components/gestionale/gestionale-mezzo-autocomplete";

export {
  SchedaIngressoIdentAutocompleteField,
} from "@/components/lavorazioni/schede/scheda-ingresso-ident-autocomplete-field";

export {
  SchedaIngressoIdentTextField,
} from "@/components/lavorazioni/schede/scheda-ingresso-ident-text-field";

export {
  RicambiMagSearchPortal,
  RicambioRowAutocompletePortal,
} from "@/components/lavorazioni/schede/schede-ricambi-portal-fields";

/** Marker per usage scan — adapter attivo, migrazione phase_1. */
export const LEGACY_SELECTOR_ADAPTER_PHASE = 1 as const;
