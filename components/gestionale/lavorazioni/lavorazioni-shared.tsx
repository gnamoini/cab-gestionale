"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  GestionaleSortTh,
  type GestionaleSortPhase,
} from "@/components/gestionale/global-table";
import {
  dsFocus,
  dsBtnNeutral,
  dsBtnPrimary,
  dsBtnCtaHero,
  dsBtnSoftOrange,
  dsBtnIcon,
  dsBtnSubtle,
  dsTableActionGlyph,
  gestionaleSelectFilterClass,
  gestionaleSelectNativePlainClass,
  lavorazioniModalSelectClass,
  selectLavorazioniInline,
  selectPillInner,
  selectPillInnerTable,
} from "@/lib/ui/design-system";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import type { SortKeyLavorazione, SortKeyStorico, SortPhaseLav } from "@/lib/lavorazioni/types";

/** @deprecated Importare da `@/lib/ui/design-system` — mantenuti per compatibilità. */
export const erpFocus = dsFocus;
export const erpBtnNeutral = dsBtnNeutral;
export const erpBtnAccent = dsBtnPrimary;
export const erpBtnNuovaLavorazione = dsBtnCtaHero;
export const erpBtnSoftOrange = dsBtnSoftOrange;
export const erpBtnIcon = dsBtnIcon;
export const erpBtnSubtleNew = dsBtnSubtle;
export {
  gestionaleSelectFilterClass,
  gestionaleSelectNativePlainClass,
  lavorazioniModalSelectClass,
  selectLavorazioniInline,
  selectPillInner,
  selectPillInnerTable,
};
/** @deprecated Usa `gestionaleSelectFilterClass` */
export const selectLavorazioniFilter = gestionaleSelectFilterClass;

/** @deprecated Usare `GlobalTableSortTh` da `@/components/gestionale/global-table`. */
export function SortThMain(props: {
  label: string;
  columnKey: SortKeyLavorazione;
  sortColumn: SortKeyLavorazione | null;
  sortPhase: SortPhaseLav;
  onSort: (k: SortKeyLavorazione) => void;
}) {
  return (
    <GestionaleSortTh
      label={props.label}
      columnKey={props.columnKey}
      sortColumn={props.sortColumn}
      sortPhase={props.sortPhase as GestionaleSortPhase}
      onSort={props.onSort}
    />
  );
}

/** @deprecated Usare `GlobalTableSortTh` da `@/components/gestionale/global-table`. */
export function SortThStorico(props: {
  label: string;
  columnKey: SortKeyStorico;
  sortColumn: SortKeyStorico | null;
  sortPhase: SortPhaseLav;
  onSort: (k: SortKeyStorico) => void;
}) {
  return (
    <GestionaleSortTh
      label={props.label}
      columnKey={props.columnKey}
      sortColumn={props.sortColumn}
      sortPhase={props.sortPhase as GestionaleSortPhase}
      onSort={props.onSort}
    />
  );
}

export function FilterSelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full min-w-[11rem] max-w-full">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[color:var(--cab-primary)]"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      {children}
    </div>
  );
}

import { prioritaLabel, statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";

export { prioritaLabel, statoPillShellClass };

/** Pill stato a larghezza dinamica (fit-content, senza troncamento). */
export function statoPillShellClassDynamic(): string {
  return "relative inline-flex w-fit max-w-full min-w-0 items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/15 transition-[filter,box-shadow] duration-200 ease-out hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-white/10";
}

export function statoPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

export function prioritaPillShellClass(): string {
  return "relative inline-flex w-full min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/12 transition-[filter,box-shadow] duration-200 ease-out hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-white/10";
}

/** Pill priorità a larghezza dinamica (Kanban, tabella fit-content). */
export function prioritaPillShellClassDynamic(): string {
  return "relative inline-flex w-fit max-w-full min-w-0 items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/12 transition-[filter,box-shadow] duration-200 ease-out hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-white/10";
}

export function prioritaPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

export function addettoPillShellClass(): string {
  return "relative inline-flex w-full min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/15 transition-[filter,box-shadow] duration-200 ease-out hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-white/10";
}

/** Pill addetto tabella: larghezza al contenuto (come stato). */
export function addettoPillShellClassDynamic(): string {
  return statoPillShellClassDynamic();
}

export function addettoPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

/** Stile pill addetto coerente in tabella (editabile e sola lettura). */
export function addettoPillShellStyleForName(
  nome: string,
  addettoColors: Record<string, string | undefined>,
): CSSProperties {
  return addettoPillShellStyle(
    addettoDisplayColor(nome, addettoColors as Record<string, string>),
  );
}

/** Badge compatto (storico / filtri). */
export function prioritaBadgeStyle(hex: string | undefined): CSSProperties {
  return { ...pillStyleFromHex(hex), fontWeight: 600 };
}

export function addettoBadgeStyle(hex: string | undefined): CSSProperties {
  return { ...pillStyleFromHex(hex), fontWeight: 600 };
}

/** Ripristina da archivio — vassoio + freccia verso l'alto (unarchive). */
export function IconRipristinaDaArchivio({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10v9h12v-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7l3-3 3 3" />
    </svg>
  );
}
