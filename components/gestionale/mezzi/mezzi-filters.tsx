"use client";

import type { ReactNode } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { dsInput, dsStickyToolbar, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";

function MezziFieldWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-[color:var(--cab-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

const filterTextInputClass = `${dsInput} min-h-10 py-2 text-sm font-semibold`;

export type MezziSearchBarProps = {
  search: string;
  onSearch: (v: string) => void;
  /** Es. `min-w-0 flex-1` per allineamento toolbar */
  wrapperClassName?: string;
};

export function MezziSearchBar({ search, onSearch, wrapperClassName = "" }: MezziSearchBarProps) {
  return (
    <GestionaleSearchField
      wrapperClassName={wrapperClassName}
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
      aria-label="Cerca mezzi"
    />
  );
}

export type MezziFilterFieldsProps = {
  filtroCliente: string;
  onFiltroCliente: (v: string) => void;
  filtroMarca: string;
  onFiltroMarca: (v: string) => void;
  filtroModello: string;
  onFiltroModello: (v: string) => void;
  filtroTarga: string;
  onFiltroTarga: (v: string) => void;
  filtroNumeroScuderia: string;
  onFiltroNumeroScuderia: (v: string) => void;
  /** Se true, niente bordo superiore (il contenitore padre fornisce separazione). */
  embedded?: boolean;
};

export function MezziFilterFields({
  filtroCliente,
  onFiltroCliente,
  filtroMarca,
  onFiltroMarca,
  filtroModello,
  onFiltroModello,
  filtroTarga,
  onFiltroTarga,
  filtroNumeroScuderia,
  onFiltroNumeroScuderia,
  embedded = false,
}: MezziFilterFieldsProps) {
  return (
    <div className={embedded ? "" : "border-t border-[color:var(--cab-border)] pt-3"}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Campi filtro</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MezziFieldWrap label="Cliente">
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => onFiltroCliente(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
            aria-label="Filtra cliente"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Marca">
          <input
            type="text"
            value={filtroMarca}
            onChange={(e) => onFiltroMarca(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
            aria-label="Filtra marca"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Modello">
          <input
            type="text"
            value={filtroModello}
            onChange={(e) => onFiltroModello(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
            aria-label="Filtra modello"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Targa">
          <input
            type="text"
            value={filtroTarga}
            onChange={(e) => onFiltroTarga(e.target.value)}
            className={`${filterTextInputClass} font-mono`}
            placeholder="Contiene…"
            aria-label="Filtra targa"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. scuderia">
          <input
            type="text"
            value={filtroNumeroScuderia}
            onChange={(e) => onFiltroNumeroScuderia(e.target.value)}
            className={`${filterTextInputClass} font-mono`}
            placeholder="Contiene…"
            aria-label="Filtra numero scuderia"
          />
        </MezziFieldWrap>
      </div>
    </div>
  );
}

export type MezziFiltersProps = MezziSearchBarProps &
  MezziFilterFieldsProps;

/** Toolbar ricerca + campi filtro (stile allineato a Documenti / Preventivi). */
export function MezziFilters(props: MezziFiltersProps) {
  const {
    search,
    onSearch,
    filtroCliente,
    onFiltroCliente,
    filtroMarca,
    onFiltroMarca,
    filtroModello,
    onFiltroModello,
    filtroTarga,
    onFiltroTarga,
    filtroNumeroScuderia,
    onFiltroNumeroScuderia,
  } = props;
  return (
    <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
      <div className="flex flex-col gap-3">
        <MezziSearchBar search={search} onSearch={onSearch} />
        <MezziFilterFields
          embedded={false}
          filtroCliente={filtroCliente}
          onFiltroCliente={onFiltroCliente}
          filtroMarca={filtroMarca}
          onFiltroMarca={onFiltroMarca}
          filtroModello={filtroModello}
          onFiltroModello={onFiltroModello}
          filtroTarga={filtroTarga}
          onFiltroTarga={onFiltroTarga}
          filtroNumeroScuderia={filtroNumeroScuderia}
          onFiltroNumeroScuderia={onFiltroNumeroScuderia}
        />
      </div>
    </div>
  );
}
