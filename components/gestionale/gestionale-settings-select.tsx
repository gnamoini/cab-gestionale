"use client";

import type { ReactNode } from "react";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import type { GlobalSettingsListKey } from "@/src/lib/global-list/global-settings-list-keys";

export type GestionaleSettingsSelectProps = {
  value: string;
  onChange: (value: string) => void;
  /** @deprecated Passare `listKey` e usare `GlobalSettingsListSelect` direttamente. */
  options?: readonly string[] | readonly { value: string; label: string }[];
  /** Chiave elenco in app_settings (obbligatoria per sync globale). */
  listKey?: GlobalSettingsListKey;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  ariaLabel: string;
  id?: string;
  className?: string;
  children?: ReactNode;
  /** Solo scelta da elenco configurato (niente digitazione). */
  selectOnly?: boolean;
};

/**
 * @deprecated Nessun import attivo. Usare `GlobalSettingsListSelect` con `listKey`.
 */
export function GestionaleSettingsSelect({
  value,
  onChange,
  listKey,
  placeholder = "— Seleziona —",
  disabled,
  required,
  isLoading,
  ariaLabel,
  id,
  className = "",
  selectOnly = false,
}: GestionaleSettingsSelectProps) {
  if (!listKey) {
    return (
      <p className="text-xs text-amber-800 dark:text-amber-300" role="status">
        Configurare listKey su GestionaleSettingsSelect.
      </p>
    );
  }

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <GlobalSettingsListSelect
        id={id}
        listKey={listKey}
        value={value}
        onChange={onChange}
        disabled={disabled || isLoading}
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        allowAdd={!selectOnly && listKey !== "lavorazioni:stati" && listKey !== "lavorazioni:priorita"}
        selectOnly={selectOnly}
      />
    </div>
  );
}
