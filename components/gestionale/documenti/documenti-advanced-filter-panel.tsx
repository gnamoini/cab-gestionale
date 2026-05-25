"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import {
  FILTER_ALL,
  type DocumentiAdvancedFilters,
} from "@/lib/documenti/documenti-advanced-filters";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { DocumentiSortKey, DocumentiSortPhase } from "@/components/gestionale/documenti/documenti-helpers";

const filterInputClass = `${globalInputFieldFilter} h-10 py-0 text-sm`;

export function DocumentiAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
  sortSelectValue,
  onSortSelect,
}: {
  filters: DocumentiAdvancedFilters;
  onChange: (patch: Partial<DocumentiAdvancedFilters>) => void;
  catalog: CatalogMarca[];
  sortSelectValue: string;
  onSortSelect: (v: string) => void;
}) {
  const modelliFilterOptions = useMemo(() => {
    if (filters.marca === FILTER_ALL) return [];
    const mar = catalog.find((m) => m.id === filters.marca);
    return (mar?.macchine ?? []).map((mac) => ({ id: mac.id, label: mac.nome }));
  }, [catalog, filters.marca]);

  return (
    <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri documenti">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Marca
          </label>
          <GlobalSelect
            variant="filter"
            inputClassName={filterInputClass}
            items={[
              { value: FILTER_ALL, label: "Tutte le marche" },
              ...catalog.map((m) => ({ value: m.id, label: m.nome })),
            ]}
            value={filters.marca}
            onChange={(v) => {
              const marca = v.trim() ? v : FILTER_ALL;
              onChange({ marca, modello: FILTER_ALL });
            }}
            strictFromList
            placeholder="Cerca e seleziona…"
            filterNeutralValues={[FILTER_ALL]}
            aria-label="Filtra per marca"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Modello
          </label>
          <GlobalSelect
            variant="filter"
            inputClassName={filterInputClass}
            items={[
              { value: FILTER_ALL, label: "Tutti i modelli" },
              ...modelliFilterOptions.map((o) => ({ value: o.id, label: o.label })),
            ]}
            value={filters.modello}
            onChange={(v) => onChange({ modello: v.trim() ? v : FILTER_ALL })}
            strictFromList
            disabled={filters.marca === FILTER_ALL}
            placeholder={filters.marca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca e seleziona…"}
            filterNeutralValues={[FILTER_ALL]}
            aria-label="Filtra per modello"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ordinamento
          </label>
          <GlobalSelect
            variant="filter"
            selectOnly
            inputClassName={filterInputClass}
            items={[
              { value: "natural", label: "Archivio (marca → modello)" },
              { value: "nome:asc", label: "Nome A → Z" },
              { value: "nome:desc", label: "Nome Z → A" },
              { value: "caricatoIl:desc", label: "Data più recente" },
              { value: "caricatoIl:asc", label: "Data meno recente" },
              { value: "categoria:asc", label: "Categoria A → Z" },
              { value: "marca:asc", label: "Marca A → Z" },
              { value: "macchina:asc", label: "Modello A → Z" },
            ]}
            value={sortSelectValue}
            onChange={onSortSelect}
            strictFromList
            aria-label="Ordinamento"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Categoria
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                [FILTER_ALL, "Tutte"],
                ["listini", "Listini"],
                ["cataloghi", "Cataloghi"],
                ["manuali", "Manuali"],
                ["altro", "Altro"],
              ] as const
            ).map(([value, label]) => {
              const on = filters.categoria === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ categoria: value as DocumentiAdvancedFilters["categoria"] })}
                  className={`rounded-[var(--ds-radius-lg)] border px-3 py-2 text-xs font-semibold transition-colors ${
                    on
                      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]"
                      : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)]"
                  } ${erpFocus}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function documentiSortSelectValue(
  sortColumn: DocumentiSortKey | null,
  sortPhase: DocumentiSortPhase,
): string {
  if (sortColumn === null || sortPhase === "natural") return "natural";
  return `${sortColumn}:${sortPhase}`;
}

export function applyDocumentiSortSelect(
  v: string,
  setSortColumn: (k: DocumentiSortKey | null) => void,
  setSortPhase: (p: DocumentiSortPhase) => void,
): void {
  if (!v.trim() || v === "natural") {
    setSortColumn(null);
    setSortPhase("natural");
    return;
  }
  const [col, ph] = v.split(":") as [DocumentiSortKey, DocumentiSortPhase];
  setSortColumn(col);
  setSortPhase(ph === "desc" ? "desc" : "asc");
}
