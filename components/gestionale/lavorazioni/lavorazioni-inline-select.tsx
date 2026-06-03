"use client";

import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import {
  GlobalFixedListPillSelect,
  type FixedListPillOption,
} from "@/components/gestionale/global-input/global-fixed-list-pill";
import {
  addettoPillShellClass,
  addettoPillShellStyleForName,
  prioritaLabel,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  selectPillInner,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { formatLavorazioneIngressoDisplay } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import { statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { dsFocus } from "@/lib/ui/design-system";
import {
  lavTablePillMinH,
  lavTablePillTextClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";

type OptionChildProps = { value?: string | number; children?: ReactNode };
export type TablePillOption = FixedListPillOption;

function optionLabelFromProps(props: OptionChildProps, value: string): string {
  if (typeof props.children === "string") return props.children;
  if (Array.isArray(props.children)) return props.children.join("");
  return value;
}

/** Estrae `<option>` anche da fragment annidati (non da sotto-componenti React). */
function parseSelectOptions(children: ReactNode): TablePillOption[] {
  const items: TablePillOption[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (child == null || typeof child === "boolean") return;
      if (!isValidElement(child)) return;
      if (child.type === "option") {
        const props = child.props as OptionChildProps;
        const v = String(props.value ?? "");
        items.push({ value: v, label: optionLabelFromProps(props, v) });
        return;
      }
      const nested = (child.props as { children?: ReactNode }).children;
      if (nested != null) walk(nested);
    });
  };
  walk(children);
  return items;
}

const pillChevron = (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/** Pill solo lettura (card mobile / portale): niente tooltip, testo non selezionabile. */
export function LavorazioneReadOnlyPill({
  label,
  shellClass,
  shellStyle,
  fullWidth = true,
}: {
  label: string;
  shellClass: string;
  shellStyle?: CSSProperties;
  /** Larghezza piena nella cella/card; disabilita per badge fit-content (es. stato in header). */
  fullWidth?: boolean;
}) {
  const widthClass = fullWidth
    ? "w-full min-w-0 max-w-full"
    : "w-fit min-w-0 max-w-full";
  return (
    <span
      className={`${shellClass} ${widthClass} inline-flex select-none touch-manipulation cursor-default justify-center overflow-hidden ${
        fullWidth ? "" : `px-2 py-1 ${lavTablePillTextClass} whitespace-nowrap`
      }`}
      style={shellStyle}
    >
      {fullWidth ? (
        <span
          className={`flex ${lavTablePillMinH} w-full items-center justify-center px-2 py-0.5 ${lavTablePillTextClass} whitespace-nowrap`}
        >
          {label}
        </span>
      ) : (
        label
      )}
    </span>
  );
}

const completamentoDatePillStyle = statoPillShellStyle(
  statoThemeColor(LAVORAZIONE_STATO_COMPLETATA_ID),
);

/** Priorità in pill colorata, sola lettura (archivio mobile). */
export function LavorazionePrioritaReadOnlyPill({
  priorita,
  prioritaColors,
  fullWidth = true,
}: {
  priorita: string;
  prioritaColors: Record<string, string | undefined>;
  fullWidth?: boolean;
}) {
  const p = priorita as PrioritaLavorazione;
  const label = prioritaLabel(p);
  const hex = p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p as PrioritaLav, prioritaColors);
  return (
    <LavorazioneReadOnlyPill
      label={label}
      shellClass={prioritaPillShellClass()}
      shellStyle={prioritaPillShellStyle(hex)}
      fullWidth={fullWidth}
    />
  );
}

/** Addetto in pill colorata, sola lettura (archivio / portale). */
export function LavorazioneAddettoReadOnlyPill({
  addetto,
  addettoColors,
  fullWidth = true,
}: {
  addetto: string;
  addettoColors: Record<string, string | undefined>;
  fullWidth?: boolean;
}) {
  const label = addetto.trim() || "—";
  return (
    <LavorazioneReadOnlyPill
      label={label}
      shellClass={addettoPillShellClass()}
      shellStyle={addettoPillShellStyleForName(label, addettoColors)}
      fullWidth={fullWidth}
    />
  );
}

/** Data completamento in pill verde (stesso stile stato «Completata»). */
export function LavorazioneCompletamentoDatePill({
  iso,
  align = "center",
  fullWidth = true,
}: {
  iso: string;
  align?: "left" | "center";
  fullWidth?: boolean;
}) {
  const { date } = formatLavorazioneIngressoDisplay(iso);
  const pill = (
    <LavorazioneReadOnlyPill
      label={date}
      shellClass={statoPillShellClass()}
      shellStyle={completamentoDatePillStyle}
      fullWidth={fullWidth}
    />
  );
  if (fullWidth) return pill;
  return (
    <div className={`flex min-w-0 ${align === "center" ? "justify-center" : "justify-start"}`}>
      {pill}
    </div>
  );
}

/** Pill colorata solo lettura (storico): stessa silhouette delle celle tabella principale. */
export function TablePillReadonly({
  shellClass,
  shellStyle,
  title,
  children,
  fitContent = false,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  children: ReactNode;
  fitContent?: boolean;
}) {
  const widthClass = fitContent ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const textClass = fitContent
    ? `min-w-0 flex-1 whitespace-nowrap ${lavTablePillTextClass} text-inherit`
    : `min-w-0 flex-1 truncate ${lavTablePillTextClass} text-inherit`;
  return (
    <div className={`${shellClass} overflow-hidden ${widthClass}`} style={shellStyle} title={title}>
      <div className={`relative flex ${lavTablePillMinH} w-full items-center overflow-hidden rounded-[inherit] px-2 py-0.5`}>
        <span className={textClass}>{children}</span>
      </div>
    </div>
  );
}

/** Select compatto tabella con chevron e altezza fissa (stato / priorità / addetto). */
export function InlineSelectField({
  shellClass,
  shellStyle,
  title,
  value,
  onChange,
  ariaLabel,
  disabled,
  wide = false,
  /** Pill tabella: menu custom con voci centrate. */
  tablePill = false,
  tablePillWidth,
  /** Voci menu pill tabella (es. addetto da componente wrapper). */
  tablePillOptions,
  fullWidth = false,
  children,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  wide?: boolean;
  tablePill?: boolean;
  tablePillWidth?: string;
  tablePillOptions?: TablePillOption[];
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const widthClass = fullWidth
    ? "w-full max-w-none"
    : tablePill
      ? (tablePillWidth ?? "w-[9.5rem] max-w-full")
      : wide
        ? "w-fit max-w-full shrink-0"
        : "w-full min-w-0 max-w-full";

  const shellOverflow = tablePill ? "overflow-visible" : "overflow-hidden";
  const parsedOptions = tablePill
    ? (tablePillOptions?.length ? tablePillOptions : parseSelectOptions(children))
    : [];

  if (tablePill) {
    return (
      <div
        className={`group ${shellOverflow} ${widthClass} ${disabled ? "opacity-60" : ""}`}
        title={title}
      >
        <GlobalFixedListPillSelect
          value={value}
          onChange={onChange}
          options={parsedOptions}
          ariaLabel={ariaLabel}
          disabled={disabled}
          title={title}
          shellClass={shellClass}
          fallbackPillStyle={shellStyle}
        />
      </div>
    );
  }

  return (
    <div
      className={`${shellClass} group overflow-hidden ${widthClass} ${disabled ? "opacity-60" : ""}`}
      style={shellStyle}
      title={title}
    >
      <div className={`relative flex ${lavTablePillMinH} w-full items-stretch overflow-hidden rounded-[inherit]`}>
          <select
            className={
              fullWidth || wide
                ? `${selectPillInner} w-full whitespace-nowrap pr-8`
                : selectPillInner
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            disabled={disabled}
          >
            {children}
          </select>
          <span
            className="pointer-events-none absolute right-2 top-1/2 z-[1] -translate-y-1/2 text-current opacity-70 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            {pillChevron}
          </span>
      </div>
    </div>
  );
}
