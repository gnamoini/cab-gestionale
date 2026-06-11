"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  dsFocus,
  dsGestionaleInfoCard,
  dsGestionaleInfoCardCompact,
  dsGestionaleInfoCardMetricRow,
  dsGestionaleInfoCardRow,
  dsGestionaleInfoCardRowStacked,
  dsGestionaleInfoCardRowLabel,
  dsGestionaleInfoCardRowValue,
  dsGestionaleInfoCardRowValueStrong,
  dsGestionaleInfoCardSubgroup,
  dsGestionaleInfoCardSubgroupTitle,
  dsGestionaleInfoCardTitle,
} from "@/lib/ui/design-system";

function GestionaleInfoCardChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <svg
        className="h-3.5 w-3.5 text-[color:var(--cab-text-muted)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

/** Card info stile magazzino (scheda ricambio): titolo + righe label/valore con separatori. */
export function GestionaleInfoCard({
  title,
  children,
  className = "",
  compact = false,
  subtitle,
  actions,
  hideTitle = false,
  collapsible = false,
  defaultCollapsed = true,
  forceExpanded = false,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
  /** Variante hub schede/preventivi/documenti: padding ridotto, azioni in header. */
  compact?: boolean;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Titolo esterno sulla sezione (es. collapsible): niente h3 duplicato. */
  hideTitle?: boolean;
  /** Header cliccabile per mostrare/nascondere il contenuto (solo card senza subtitle/actions). */
  collapsible?: boolean;
  /** Solo se `collapsible`: partenza compressa. */
  defaultCollapsed?: boolean;
  /** Solo se `collapsible`: mantiene la sezione espansa (es. validazione). */
  forceExpanded?: boolean;
}) {
  const panelId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const shell = compact ? dsGestionaleInfoCardCompact : dsGestionaleInfoCard;
  const hasHeaderRow = Boolean(subtitle || actions);
  const expanded = forceExpanded || !collapsed;

  useEffect(() => {
    if (forceExpanded) setCollapsed(false);
  }, [forceExpanded]);

  if (collapsible && !hasHeaderRow && !hideTitle) {
    return (
      <section className={`${shell}${className ? ` ${className}` : ""}`}>
        <button
          type="button"
          id={`${panelId}-trigger`}
          aria-expanded={expanded}
          aria-controls={`${panelId}-body`}
          className={`${dsFocus} group flex w-full min-w-0 items-center justify-between gap-2 rounded-[var(--ds-radius-md)] py-0.5 text-left touch-manipulation`}
          onClick={() => {
            if (forceExpanded) return;
            setCollapsed((c) => !c);
          }}
        >
          <h3 className={`${dsGestionaleInfoCardTitle} mb-0 min-w-0 flex-1`}>{title}</h3>
          <GestionaleInfoCardChevron expanded={expanded} />
        </button>
        <div
          id={`${panelId}-body`}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          aria-hidden={!expanded}
          className={`grid ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            {children ? <div className="min-w-0 pt-3">{children}</div> : null}
          </div>
        </div>
      </section>
    );
  }

  if (hideTitle && !hasHeaderRow) {
    return (
      <section className={`${shell}${className ? ` ${className}` : ""}`} aria-label={title}>
        {children}
      </section>
    );
  }

  if (hasHeaderRow) {
    return (
      <section className={`${shell}${className ? ` ${className}` : ""}`}>
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <h3 className={dsGestionaleInfoCardTitle}>{title}</h3>
            {subtitle ? (
              <div className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{subtitle}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{actions}</div>
          ) : null}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </section>
    );
  }

  return (
    <section className={`${shell}${className ? ` ${className}` : ""}`}>
      <h3 className={dsGestionaleInfoCardTitle}>{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function GestionaleInfoSubgroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={dsGestionaleInfoCardSubgroup}>
      <p className={dsGestionaleInfoCardSubgroupTitle}>{title}</p>
      {children}
    </div>
  );
}

export type GestionaleInfoRowLayout = "grid" | "stacked";

export function GestionaleInfoRow({
  label,
  value,
  mono,
  strong,
  layout = "grid",
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Valore in grassetto (campi principali). */
  strong?: boolean;
  /** `stacked`: label sopra valore (portale clienti / modali info). */
  layout?: GestionaleInfoRowLayout;
}) {
  const valueClass = strong ? dsGestionaleInfoCardRowValueStrong : dsGestionaleInfoCardRowValue;
  const rowClass = layout === "stacked" ? dsGestionaleInfoCardRowStacked : dsGestionaleInfoCardRow;
  return (
    <div className={rowClass}>
      <div className={dsGestionaleInfoCardRowLabel}>{label}</div>
      <div className={`${valueClass}${mono ? " font-mono tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}

/** Riga importi: etichetta a sinistra, valore tabular allineato a destra (prezzi, costi). */
export function GestionaleInfoMetricRow({
  label,
  detail,
  value,
  total,
}: {
  label: string;
  detail?: string;
  value: ReactNode;
  /** Totale in evidenza (es. riga finale costo). */
  total?: boolean;
}) {
  return (
    <div className={dsGestionaleInfoCardMetricRow}>
      <div className="min-w-0">
        <div className={dsGestionaleInfoCardRowLabel}>{label}</div>
        {detail ? <div className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{detail}</div> : null}
      </div>
      <div
        className={`shrink-0 text-right tabular-nums text-[color:var(--cab-text)] ${
          total ? "text-base font-bold" : "font-medium"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
