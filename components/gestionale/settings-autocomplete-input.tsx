"use client";

import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import type { GlobalSettingsListContext, GlobalSettingsListKey } from "@/src/lib/global-list/global-settings-list-keys";

/** Autocomplete impostazioni globali — fonte unica `app_settings`, ricerca live, aggiunta elenco. */
export function SettingsAutocompleteInput({
  listKey,
  context,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  className = "",
  allowAdd,
  "aria-label": ariaLabel,
}: {
  listKey: GlobalSettingsListKey;
  context?: GlobalSettingsListContext;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  allowAdd?: boolean;
  "aria-label"?: string;
}) {
  return (
    <GlobalSettingsListSelect
      listKey={listKey}
      context={context}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={className}
      allowAdd={allowAdd}
      aria-label={ariaLabel}
    />
  );
}
