"use client";

import type { ReactNode } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { dsInput, dsPageToolbar, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import type { UltimaLavorazioneFilter } from "@/lib/mezzi/mezzi-helpers";

function MezziFieldWrap({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  if (htmlFor) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label
          htmlFor={htmlFor}
          className="cursor-default text-[11px] font-medium text-[color:var(--cab-text-muted)]"
        >
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-[color:var(--cab-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

const filterTextInputClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

export type MezziSearchBarProps = {
  search: string;
  onSearch: (v: string) => void;
  /** Es. `min-w-0 flex-1` per allineamento toolbar */
  wrapperClassName?: string;
};

export function MezziSearchBar({ search, onSearch, wrapperClassName = "" }: MezziSearchBarProps) {
  return (
    <GestionaleSearchField
      id="mezzi-search"
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
  filtroUltimaLav: import("@/lib/mezzi/mezzi-helpers").UltimaLavorazioneFilter;
  onFiltroUltimaLav: (v: import("@/lib/mezzi/mezzi-helpers").UltimaLavorazioneFilter) => void;
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
  filtroUltimaLav,
  onFiltroUltimaLav,
  embedded = false,
}: MezziFilterFieldsProps) {
  return (
    <div className={embedded ? "" : "border-t border-[color:var(--cab-border)] pt-3"}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Campi filtro</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MezziFieldWrap label="Cliente" htmlFor="mezzi-filter-cliente">
          <input
            id="mezzi-filter-cliente"
            type="text"
            value={filtroCliente}
            onChange={(e) => onFiltroCliente(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Marca" htmlFor="mezzi-filter-marca">
          <input
            id="mezzi-filter-marca"
            type="text"
            value={filtroMarca}
            onChange={(e) => onFiltroMarca(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Modello" htmlFor="mezzi-filter-modello">
          <input
            id="mezzi-filter-modello"
            type="text"
            value={filtroModello}
            onChange={(e) => onFiltroModello(e.target.value)}
            className={filterTextInputClass}
            placeholder="Contiene…"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Targa" htmlFor="mezzi-filter-targa">
          <input
            id="mezzi-filter-targa"
            type="text"
            value={filtroTarga}
            onChange={(e) => onFiltroTarga(e.target.value)}
            className={`${filterTextInputClass} font-mono`}
            placeholder="Contiene…"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. scuderia" htmlFor="mezzi-filter-numero-scuderia">
          <input
            id="mezzi-filter-numero-scuderia"
            type="text"
            value={filtroNumeroScuderia}
            onChange={(e) => onFiltroNumeroScuderia(e.target.value)}
            className={`${filterTextInputClass} font-mono`}
            placeholder="Contiene…"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Ultima lavorazione" htmlFor="mezzi-filter-ultima-lav">
          <GlobalSelect
            id="mezzi-filter-ultima-lav"
            variant="filter"
            inputClassName={filterTextInputClass}
            items={[
              { value: "", label: "Tutti" },
              { value: "con", label: "Con lavorazione" },
              { value: "senza", label: "Senza lavorazione" },
              { value: "recenti12m", label: "Ultimi 12 mesi" },
              { value: "oltre12m", label: "Oltre 12 mesi" },
            ]}
            value={filtroUltimaLav}
            onChange={(v) => onFiltroUltimaLav(v as UltimaLavorazioneFilter)}
            strictFromList
            selectOnly
            aria-label="Filtra per ultima lavorazione"
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
    filtroUltimaLav,
    onFiltroUltimaLav,
  } = props;
  return (
    <div className={`${dsPageToolbar} -mx-1 sm:mx-0`}>
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
          filtroUltimaLav={filtroUltimaLav}
          onFiltroUltimaLav={onFiltroUltimaLav}
        />
      </div>
    </div>
  );
}
