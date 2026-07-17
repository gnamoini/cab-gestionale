"use client";

import { Children, isValidElement, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Tooltip } from "@/components/ui";
import {
  GlobalFixedListPillSelect,
  type FixedListPillOption,
  type FixedListPillSelectSize,
} from "@/components/gestionale/global-input/global-fixed-list-pill";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
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
import {
  isLavorazioneEmptyDisplay,
  LAVORAZIONE_EMPTY_DISPLAY,
} from "@/lib/lavorazioni/lavorazione-display-helpers";
import { formatLavorazioneIngressoDisplay } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import { statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { dsFocus, dsTableActionsRowHeight } from "@/lib/ui/design-system";
import { resolvePillTooltip } from "@/lib/ui/meaningful-tooltip";
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
  actionRow = false,
  actionRowFixedWidth = false,
  actionRowUniformWidthCh,
}: {
  label: string;
  shellClass: string;
  shellStyle?: CSSProperties;
  /** Larghezza piena nella cella/card; disabilita per badge fit-content (es. stato in header). */
  fullWidth?: boolean;
  /** Stessa altezza dei pulsanti azione tabella (righe impostazioni). */
  actionRow?: boolean;
  /** Larghezza uniforme in riga impostazioni (es. anteprima addetti). */
  actionRowFixedWidth?: boolean;
  /** Larghezza condivisa tra righe (ch), es. allineata alla pill più larga dello stato. */
  actionRowUniformWidthCh?: number;
}) {
  const widthClass = actionRow
    ? actionRowUniformWidthCh
      ? "w-full min-w-0 max-w-full"
      : actionRowFixedWidth
        ? "w-[6rem] min-w-[6rem] max-w-[6rem] sm:w-[5.75rem] sm:min-w-[5.75rem] sm:max-w-[5.75rem]"
        : "w-fit min-w-0 max-w-full"
    : fullWidth
      ? "w-full min-w-0 max-w-full"
      : "w-fit min-w-0 max-w-full";
  const contentClass = actionRow
    ? `${dsTableActionsRowHeight} items-center px-2.5 ${lavTablePillTextClass} whitespace-nowrap`
    : fullWidth
      ? ""
      : `px-2 py-1 ${lavTablePillTextClass} whitespace-nowrap`;
  const uniformWidthStyle: CSSProperties | undefined =
    actionRow && actionRowUniformWidthCh
      ? {
          width: `${actionRowUniformWidthCh}ch`,
          minWidth: `${actionRowUniformWidthCh}ch`,
          maxWidth: `${actionRowUniformWidthCh}ch`,
        }
      : undefined;
  return (
    <span
      className={`${shellClass} ${widthClass} inline-flex select-none touch-manipulation cursor-default justify-center overflow-hidden ${contentClass}`}
      style={uniformWidthStyle ? { ...shellStyle, ...uniformWidthStyle } : shellStyle}
    >
      {fullWidth && !actionRow ? (
        <span
          className={`flex ${lavTablePillMinH} w-full items-center justify-center px-2 py-0.5 ${lavTablePillTextClass} whitespace-nowrap`}
        >
          {label}
        </span>
      ) : actionRowFixedWidth ? (
        <span className="min-w-0 max-w-full truncate">{label}</span>
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
  actionRow = false,
  actionRowFixedWidth = false,
}: {
  priorita: string;
  prioritaColors: Record<string, string | undefined>;
  fullWidth?: boolean;
  actionRow?: boolean;
  actionRowFixedWidth?: boolean;
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
      actionRow={actionRow}
      actionRowFixedWidth={actionRowFixedWidth}
    />
  );
}

/** Addetto in pill colorata, sola lettura (archivio / portale). */
export function LavorazioneAddettoReadOnlyPill({
  addetto,
  addettoColors,
  colorKey,
  fullWidth = true,
  actionRow = false,
  actionRowFixedWidth = false,
}: {
  addetto: string;
  addettoColors: Record<string, string | undefined>;
  /** Chiave nome per colori pill (default: `addetto`). */
  colorKey?: string;
  fullWidth?: boolean;
  actionRow?: boolean;
  actionRowFixedWidth?: boolean;
}) {
  const label = addetto.trim();
  if (isLavorazioneEmptyDisplay(label)) {
    return (
      <span className="block w-full text-center text-sm text-zinc-400 dark:text-zinc-500">
        {LAVORAZIONE_EMPTY_DISPLAY}
      </span>
    );
  }
  const key = (colorKey ?? label).trim();
  return (
    <LavorazioneReadOnlyPill
      label={label}
      shellClass={addettoPillShellClass()}
      shellStyle={addettoPillShellStyleForName(key, addettoColors)}
      fullWidth={fullWidth}
      actionRow={actionRow}
      actionRowFixedWidth={actionRowFixedWidth}
    />
  );
}

/** Data completamento in pill verde (stesso stile stato «Completata»). */
export function LavorazioneCompletamentoDatePill({
  iso,
  align = "center",
  fullWidth = true,
  onClick,
  disabled = false,
}: {
  iso: string;
  align?: "left" | "center";
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { date } = formatLavorazioneIngressoDisplay(iso);
  const interactive = Boolean(onClick) && !disabled;
  const widthClass = fullWidth ? "w-full min-w-0 max-w-full" : "w-fit min-w-0 max-w-full";
  const contentClass = fullWidth
    ? `flex ${lavTablePillMinH} w-full items-center justify-center px-2 py-0.5 ${lavTablePillTextClass} whitespace-nowrap`
    : `px-2 py-1 ${lavTablePillTextClass} whitespace-nowrap`;

  const pill =
    interactive ? (
      <Tooltip content={"Modifica data completamento"}><button type="button" disabled={disabled} onClick={onClick} className={`${statoPillShellClass()} ${widthClass} inline-flex touch-manipulation justify-center overflow-hidden ${contentClass} ${dsFocus} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`} style={completamentoDatePillStyle}>
        {date}
      </button></Tooltip>
    ) : (
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

function reactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  if (isValidElement(node)) return reactNodeText((node.props as { children?: ReactNode }).children);
  return "";
}

/** Pill colorata sola lettura (storico / kanban). */
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
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const visibleText = reactNodeText(children);
  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visibleText, measure]);

  const tooltip = resolvePillTooltip(visibleText, title ?? visibleText, truncated);
  const widthClass = fitContent ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const textClass = fitContent
    ? `min-w-0 flex-1 whitespace-nowrap ${lavTablePillTextClass} text-inherit`
    : `min-w-0 flex-1 truncate ${lavTablePillTextClass} text-inherit`;

  const pill = (
    <div className={`${shellClass} overflow-hidden ${widthClass}`} style={shellStyle}>
      <div className={`relative flex ${lavTablePillMinH} w-full items-center overflow-hidden rounded-[inherit] px-2 py-0.5`}>
        <span ref={textRef} className={textClass}>
          {children}
        </span>
      </div>
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{pill}</Tooltip> : pill;
}

const ADDETTI_RECENTS_KEY = "selector:addetti";

/**
 * Selezione addetto — pill: stesso SSOT di stato/priorità (`GlobalFixedListPillSelect`).
 * Default: combobox searchable per form full-width.
 */
export function AddettoSelectField({
  variant = "pill",
  shellClass,
  shellStyle,
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  title,
  tablePillWidth,
  className = "",
  inputClassName,
  size = "compact",
}: {
  variant?: "pill" | "default";
  shellClass?: string;
  shellStyle?: CSSProperties;
  value: string;
  onChange: (next: string) => void;
  options: readonly TablePillOption[];
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
  tablePillWidth?: string;
  className?: string;
  /** Stili sul campo input — non usare `className` per il bordo del controllo. */
  inputClassName?: string;
  /** `form` = altezza allineata ai campi modale (`GlobalFixedListPillSelect`). */
  size?: FixedListPillSelectSize;
}) {
  const pillOptions = useMemo(
    () =>
      options.map((o) => ({
        value: o.value,
        label: o.label,
        pillStyle: o.pillStyle,
      })),
    [options],
  );

  if (variant === "default") {
    return (
      <GlobalSelect
        value={value}
        onChange={onChange}
        items={pillOptions}
        coloredOptions
        selectorDomain="addetti"
        mobileSheetMode="selectOnly"
        dynamicList
        recentsKey={ADDETTI_RECENTS_KEY}
        aria-label={ariaLabel}
        disabled={disabled}
        strictFromList
        className={className}
        inputClassName={inputClassName}
      />
    );
  }

  const widthClass = tablePillWidth ?? "w-full min-w-0";
  return (
    <div className={`group overflow-visible ${widthClass} ${disabled ? "opacity-60" : ""}`}>
      <GlobalFixedListPillSelect value={value} onChange={onChange} options={pillOptions} ariaLabel={ariaLabel} disabled={disabled} title={title} sheetTitle={ariaLabel} shellClass={shellClass} fallbackPillStyle={shellStyle} size={size}/>
    </div>
  );
}

/**
 * Select compatto tabella con chevron e altezza fissa (stato / priorità / addetto).
 * Preferire `tablePill` (delega a GlobalFixedListPillSelect). Il path native `<select>`
 * senza `tablePill` è deprecato — usare GlobalFixedListPillSelect per nuovi casi.
 */
export function InlineSelectField({
  shellClass,
  shellStyle,
  title,
  value,
  onChange,
  ariaLabel,
  disabled,
  wide = false,
  /** Pill tabella: menu custom con voci centrate (SSOT produzione). */
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
      <div className={`group ${shellOverflow} ${widthClass} ${disabled ? "opacity-60" : ""}`}>
        <GlobalFixedListPillSelect value={value} onChange={onChange} options={parsedOptions} ariaLabel={ariaLabel} disabled={disabled} title={title} shellClass={shellClass} fallbackPillStyle={shellStyle}/>
      </div>
    );
  }

  /** @deprecated Usare `tablePill` + GlobalFixedListPillSelect o GlobalFixedListPillSelect diretto. */
  return (
    <div className={`${shellClass} group overflow-hidden ${widthClass} ${disabled ? "opacity-60" : ""}`} style={shellStyle}>
      <div className={`relative flex ${lavTablePillMinH} w-full items-stretch overflow-hidden rounded-[inherit]`}>
          <select className={fullWidth || wide
        ? `${selectPillInner} w-full whitespace-nowrap pr-8`
        : selectPillInner} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} disabled={disabled}>
            {children}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 z-[1] -translate-y-1/2 text-current opacity-100" aria-hidden>
            {pillChevron}
          </span>
      </div>
    </div>
  );
}
