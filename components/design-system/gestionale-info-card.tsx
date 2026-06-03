"use client";

import type { ReactNode } from "react";
import {
  dsGestionaleInfoCard,
  dsGestionaleInfoCardCompact,
  dsGestionaleInfoCardMetricRow,
  dsGestionaleInfoCardRow,
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
}: {
  title: string;
  children?: ReactNode;
  className?: string;
  /** Variante hub schede/preventivi/documenti: padding ridotto, azioni in header. */
  compact?: boolean;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const shell = compact ? dsGestionaleInfoCardCompact : dsGestionaleInfoCard;
  const hasHeaderRow = Boolean(subtitle || actions);

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

export function GestionaleInfoRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Valore in grassetto (campi principali). */
  strong?: boolean;
}) {
  const valueClass = strong ? dsGestionaleInfoCardRowValueStrong : dsGestionaleInfoCardRowValue;
  return (
    <div className={dsGestionaleInfoCardRow}>
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
