"use client";

import { GestionaleListSelect } from "@/components/gestionale/gestionale-list-select";

/** Autocomplete impostazioni globali: ricerca libera, suggerimenti live, scelta obbligatoria da elenco. */
export function SettingsAutocompleteInput({
  value,
  onChange,
  options,
  disabled,
  required,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <GestionaleListSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={className}
      strictFromList
    />
  );
}
