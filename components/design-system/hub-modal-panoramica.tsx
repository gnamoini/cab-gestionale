"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { reportMetricCardCompactClass } from "@/components/report/report-ui-tokens";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
import { resolveGestionaleModalRoot } from "@/lib/ui/gestionale-modal-save-prep";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsFocus,
  dsHubModalFieldLabel,
  dsHubModalFieldValue,
  dsHubModalFieldValueEmpty,
  dsHubModalNestedCard,
  dsHubModalPanoramicaFieldGrid,
  dsHubModalPanoramicaFieldTile,
  dsHubModalPanoramicaFieldTiles,
  dsHubModalPanoramicaReadonlyPill,
  dsHubModalPanoramicaReadonlyPillInner,
  dsHubModalPanoramicaSubsection,
  dsHubModalPanoramicaSubsectionTitle,
  dsHubModalSection,
  dsHubModalSectionTitle,
  dsInput,
  dsTypoCaption,
} from "@/lib/ui/design-system";

export function hubPanoramicaDisplayValue(value: string | undefined | null): string {
  const t = value?.trim();
  return t || "—";
}

export function HubModalPanoramicaPanel({
  children,
  className = "",
  gapClass = "gap-5",
}: {
  children: ReactNode;
  className?: string;
  /** Classe gap verticale tra figli diretti (default hub modal). */
  gapClass?: string;
}) {
  return (
    <div className={`flex flex-col text-sm ${gapClass}${className ? ` ${className}` : ""}`}>{children}</div>
  );
}

export function HubModalPanoramicaKpiGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${dsHubModalPanoramicaFieldTiles}${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Riepilogo"
    >
      {children}
    </div>
  );
}

export function HubModalPanoramicaFieldTileShell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${dsHubModalPanoramicaFieldTile}${className ? ` ${className}` : ""}`}>
      <p className={dsHubModalFieldLabel}>{label}</p>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  );
}

export function HubModalPanoramicaKpiCell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <HubModalPanoramicaFieldTileShell label={label} className={className}>
      {children}
    </HubModalPanoramicaFieldTileShell>
  );
}

export function HubModalPanoramicaFieldTiles({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={`${dsHubModalPanoramicaFieldTiles}${className ? ` ${className}` : ""}`}>{children}</dl>;
}

export function HubModalPanoramicaFieldTile({
  label,
  value,
  mono,
  largeValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  largeValue?: boolean;
}) {
  const empty = value === "—" || !value.trim();
  return (
    <div className={dsHubModalPanoramicaFieldTile}>
      <dt className={dsHubModalFieldLabel}>{label}</dt>
      <dd
        className={`${empty ? dsHubModalFieldValueEmpty : dsHubModalFieldValue}${largeValue ? " text-base" : ""}${mono ? " font-mono tabular-nums" : ""}`}
      >
        {empty ? "—" : value}
      </dd>
    </div>
  );
}

export function HubModalPanoramicaStatusPill({
  value,
  pillStyle,
}: {
  value: string;
  pillStyle?: CSSProperties;
}) {
  const empty = value === "—" || !value.trim();
  if (pillStyle && !empty) {
    return (
      <span className={dsHubModalPanoramicaReadonlyPill} style={pillStyle}>
        <span className={dsHubModalPanoramicaReadonlyPillInner}>{value}</span>
      </span>
    );
  }
  return <span className={empty ? dsHubModalFieldValueEmpty : dsHubModalFieldValue}>{empty ? "—" : value}</span>;
}

function panoramicaSummaryTileClass(interactive: boolean): string {
  const base = `${reportMetricCardCompactClass} min-h-[6.5rem]`;
  if (!interactive) return base;
  return `${base} cursor-pointer text-left transition-[box-shadow,border-color,transform] duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98] motion-reduce:active:scale-100 ${dsFocus}`;
}

export function HubModalPanoramicaSummary({
  children,
  ariaLabel = "Riepilogo",
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function HubModalPanoramicaSummaryItem({
  label,
  value,
  pillStyle,
  className = "",
  onClick,
  footer,
}: {
  label: string;
  value: string;
  /** Omit for valori vuoti o testuali senza pill colorata. */
  pillStyle?: CSSProperties;
  className?: string;
  onClick?: () => void;
  footer?: ReactNode;
}) {
  const empty = value === "—" || !value.trim();
  const content = (
    <>
      <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {label}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {pillStyle && !empty ? (
          <HubModalPanoramicaStatusPill value={value} pillStyle={pillStyle} />
        ) : (
          <p
            className={`text-xl font-semibold leading-none tracking-tight tabular-nums ${
              empty ? "text-[color:var(--cab-text-muted)]" : "text-[color:var(--cab-text)]"
            }`}
          >
            {empty ? "—" : value}
          </p>
        )}
        {footer ? <div className="min-w-0 shrink">{footer}</div> : null}
      </div>
      <div className="mt-auto pt-2" aria-hidden />
    </>
  );
  const tileClass = `${panoramicaSummaryTileClass(Boolean(onClick))}${className ? ` ${className}` : ""}`;

  if (onClick) {
    return (
      <button type="button" className={tileClass} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={tileClass}>{content}</article>;
}

export function HubModalPanoramicaFieldGroup({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GestionaleInfoCard title={title} className={className}>
      {children}
    </GestionaleInfoCard>
  );
}

export function HubModalPanoramicaInlineCell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0${className ? ` ${className}` : ""}`}>
      <p className={dsHubModalFieldLabel}>{label}</p>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  );
}

export function HubModalPanoramicaInlineGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3${className ? ` ${className}` : ""}`}>{children}</div>
  );
}

export function HubModalPanoramicaSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${dsHubModalSection}${className ? ` ${className}` : ""}`}>
      <h3 className={dsHubModalSectionTitle}>{title}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

export function HubModalPanoramicaSubsection({
  title,
  children,
  actions,
  nested = false,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Sottosezione annidata (es. singola attrezzatura dentro blocco Attrezzatura). */
  nested?: boolean;
}) {
  const shellClass = nested
    ? "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3"
    : dsHubModalPanoramicaSubsection;

  return (
    <div className={shellClass}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <h4 className={`${dsHubModalPanoramicaSubsectionTitle}${nested ? " mb-0" : ""}`}>{title}</h4>
        {actions ? <div className="flex shrink-0 items-start">{actions}</div> : null}
      </div>
      <div className={nested ? "mt-2 space-y-2" : "mt-1.5 space-y-2"}>{children}</div>
    </div>
  );
}

export function HubModalPanoramicaFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function HubModalPanoramicaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const empty = value === "—" || !value.trim();
  return (
    <div className={dsHubModalPanoramicaFieldTile}>
      <p className={dsHubModalFieldLabel}>{label}</p>
      <p
        className={`mt-0.5 min-w-0 ${empty ? dsHubModalFieldValueEmpty : dsHubModalFieldValue}${mono ? " font-mono tabular-nums" : ""}`}
      >
        {empty ? "—" : value}
      </p>
    </div>
  );
}

export function HubModalPanoramicaNoteEditor({
  value,
  canEdit,
  saving,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  saving: boolean;
  onSave: (note: string) => void | Promise<void>;
}) {
  const [text, setText] = useState(value);
  const [dirty, setDirty] = useState(false);
  const submitLock = useSubmitLock();

  useEffect(() => {
    setText(value);
    setDirty(false);
  }, [value]);

  if (!canEdit) {
    const empty = !value.trim();
    return (
      <p
        className={`text-xs leading-snug whitespace-pre-wrap ${
          empty
            ? "italic text-[color:var(--cab-text-muted)]"
            : "text-[color:var(--cab-text)]"
        }`}
      >
        {empty ? "Nessuna nota." : value}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <GestionaleTextarea
        className="min-h-[4.5rem] text-xs leading-snug"
        size="sm"
        value={text}
        onChange={(v) => {
          setText(v);
          setDirty(true);
        }}
        rows={3}
        aria-label="Note"
        disabled={saving}
        placeholder="Note visibili in elenco lavorazioni…"
      />
      {dirty ? (
        <div className="flex flex-nowrap justify-end gap-2 sm:flex-wrap">
          <button
            type="button"
            className={dsBtnNeutral}
            disabled={saving}
            onClick={() => {
              setText(value);
              setDirty(false);
            }}
          >
            Annulla
          </button>
          <button
            type="button"
            className={dsBtnPrimary}
            disabled={saving}
            onClick={(e) => {
              void runButtonSubmit(
                resolveGestionaleModalRoot(e.currentTarget),
                submitLock,
                () => ({ text }),
                (snap) => onSave(snap.text),
              );
            }}
          >
            {saving ? "Salvataggio…" : "Salva note"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
