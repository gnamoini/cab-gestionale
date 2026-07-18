"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { GestionaleCollapsiblePanel } from "@/components/design-system/gestionale-collapsible-panel";
import { useCollapsibleAccordionOptional } from "@/lib/ui/collapsible-accordion";
import {
  dsGestionaleInfoCard,
  dsGestionaleInfoCardCollapsibleBodyPad,
  dsGestionaleInfoCardCollapsibleBodyPadCompact,
  dsGestionaleInfoCardCollapsibleBodyBgClass,
  dsGestionaleInfoCardCollapsibleShell,
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
  accordionId,
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
  /** Con `CollapsibleAccordionProvider`: aprire questa card chiude le altre del gruppo. */
  accordionId?: string;
}) {
  const panelId = useId();
  const accordion = useCollapsibleAccordionOptional();
  const inAccordionGroup = Boolean(collapsible && accordionId && accordion && !forceExpanded);
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed);
  const collapsed = inAccordionGroup ? !accordion!.isOpen(accordionId!) : collapsedState;
  const shell = compact ? dsGestionaleInfoCardCompact : dsGestionaleInfoCard;
  const hasHeaderRow = Boolean(subtitle || actions);
  const expanded = forceExpanded || !collapsed;

  useEffect(() => {
    if (forceExpanded) setCollapsedState(false);
  }, [forceExpanded]);

  const toggleCollapsed = () => {
    if (forceExpanded) return;
    if (inAccordionGroup) {
      accordion!.toggle(accordionId!);
      return;
    }
    setCollapsedState((c) => !c);
  };

  if (collapsible && !hasHeaderRow && !hideTitle) {
    const titleId = `${panelId}-title`;
    const toggleLabel = `${expanded ? "Nascondi" : "Mostra"} ${title}`;
    const collapseShell = dsGestionaleInfoCardCollapsibleShell;
    const bodyPad = compact ? dsGestionaleInfoCardCollapsibleBodyPadCompact : dsGestionaleInfoCardCollapsibleBodyPad;

    return (
      <section className={`${collapseShell}${className ? ` ${className}` : ""}`}>
        <GestionaleCollapsiblePanel
          panelId={panelId}
          titleId={titleId}
          expanded={expanded}
          toggleLabel={toggleLabel}
          onToggle={toggleCollapsed}
          compact={compact}
          form
          formFlat
          bodyClassName={dsGestionaleInfoCardCollapsibleBodyBgClass}
          bodyPadClassName={bodyPad}
          titleNode={
            <h3 id={titleId} className={`${dsGestionaleInfoCardTitle} mb-0 min-w-0 text-left leading-snug`}>
              {title}
            </h3>
          }
        >
          {children}
        </GestionaleCollapsiblePanel>
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
  dense = false,
}: {
  title: string;
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      className={
        dense
          ? "mt-2.5 border-t border-[color:var(--cab-border)] pt-2 first:mt-0 first:border-t-0 first:pt-0"
          : dsGestionaleInfoCardSubgroup
      }
    >
      <p
        className={
          dense
            ? "mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]"
            : dsGestionaleInfoCardSubgroupTitle
        }
      >
        {title}
      </p>
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
