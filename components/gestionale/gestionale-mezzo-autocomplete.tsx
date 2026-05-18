"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { mezzoMatchesSmartQuery } from "@/lib/mezzi/identificazione-mezzo";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsLabel } from "@/lib/ui/design-system";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { debugSelectOptions } from "@/src/shared/selectors";

function mezzoUiLabel(m: MezzoGestito): string {
  const marcaModello = `${m.marca} ${m.modello}`.trim();
  const extra = [m.targa?.trim(), m.matricola?.trim()].filter(Boolean).join(" · ");
  return extra ? `${marcaModello} · ${extra}` : marcaModello;
}

export type GestionaleMezzoAutocompleteProps = {
  value: string;
  onChange: (mezzoId: string) => void;
  disabled?: boolean;
  enabled?: boolean;
  required?: boolean;
  /** Mostra link alla pagina Mezzi per creare un nuovo record. */
  showCreateLink?: boolean;
  className?: string;
};

/**
 * Autocomplete mezzi da archivio Supabase (lista globale, non select statico).
 */
export function GestionaleMezzoAutocomplete({
  value,
  onChange,
  disabled,
  enabled = true,
  required,
  showCreateLink = true,
  className = "",
}: GestionaleMezzoAutocompleteProps) {
  const mezziQ = useMezziListQuery(undefined, { enabled, staleTime: 30_000 });
  const [q, setQ] = useState("");

  const mezziUi = useMemo(() => {
    const rows = mezziQ.data ?? [];
    debugSelectOptions("GestionaleMezzoAutocomplete", {
      source: "mezziService.getAll",
      count: rows.length,
      isLoading: mezziQ.isLoading,
    });
    return rows.map(toMezzoUI).sort((a, b) => mezzoUiLabel(a).localeCompare(mezzoUiLabel(b), "it"));
  }, [mezziQ.data, mezziQ.isLoading]);

  const selected = useMemo(() => mezziUi.find((m) => m.id === value) ?? null, [mezziUi, value]);

  const filtered = useMemo(() => {
    if (!q.trim()) return mezziUi.slice(0, 24);
    return mezziUi.filter((m) => mezzoMatchesSmartQuery(m, q)).slice(0, 24);
  }, [mezziUi, q]);

  const showList = q.trim().length > 0 && !disabled && !mezziQ.isLoading;

  return (
    <div className={`block min-w-0 ${className}`.trim()}>
      <span className={dsLabel}>
        Mezzo
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {mezziQ.isError ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{mezziQ.error?.message ?? "Errore caricamento mezzi."}</p>
      ) : null}
      {selected && !q.trim() ? (
        <p className="mt-1 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-2.5 py-1.5 text-xs text-[color:var(--cab-text)]">
          Selezionato: <span className="font-medium">{mezzoUiLabel(selected)}</span>
          <button
            type="button"
            className="ml-2 text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
            onClick={() => {
              onChange("");
              setQ("");
            }}
            disabled={disabled}
          >
            Cambia
          </button>
        </p>
      ) : (
        <>
          <GestionaleSearchField
            wrapperClassName="mt-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per targa, matricola, cliente, marca…"
            disabled={disabled || mezziQ.isLoading}
            aria-label="Cerca mezzo in archivio"
          />
          {mezziQ.isLoading ? (
            <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Caricamento mezzi…</p>
          ) : null}
          {showList ? (
            <ul className="gestionale-scrollbar mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] p-1.5">
              {filtered.length === 0 ? (
                <li className="px-2 py-2 text-xs text-[color:var(--cab-text-muted)]">Nessun mezzo corrispondente.</li>
              ) : (
                filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)]"
                      onClick={() => {
                        onChange(m.id);
                        setQ("");
                      }}
                    >
                      <span className="font-medium text-[color:var(--cab-text)]">{mezzoUiLabel(m)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      )}
      {showCreateLink ? (
        <p className="mt-2 text-[11px] text-[color:var(--cab-text-muted)]">
          Mezzo non in elenco?{" "}
          <Link href="/mezzi" className="font-semibold text-[color:var(--cab-primary)] hover:underline">
            Apri archivio mezzi
          </Link>{" "}
          per registrarne uno nuovo.
        </p>
      ) : null}
      {required && !value.trim() ? (
        <input type="text" required className="sr-only" tabIndex={-1} value="" readOnly aria-hidden />
      ) : null}
    </div>
  );
}
