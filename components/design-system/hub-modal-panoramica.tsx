"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { gestionaleMultilineEnterProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { prepareGestionaleModalSaveFrom } from "@/lib/ui/gestionale-modal-save-prep";
import {
  dsBtnNeutral,
  dsBtnPrimary,
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
  dsHubModalPanoramicaSummary,
  dsHubModalPanoramicaSummaryItem,
  dsHubModalSection,
  dsHubModalSectionTitle,
  dsInput,
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

export function HubModalPanoramicaSummary({ children }: { children: ReactNode }) {
  return (
    <div className={dsHubModalPanoramicaSummary} role="group" aria-label="Riepilogo lavorazione">
      {children}
    </div>
  );
}

export function HubModalPanoramicaSummaryItem({
  label,
  value,
  pillStyle,
  className = "",
}: {
  label: string;
  value: string;
  /** Omit for valori vuoti o testuali senza pill colorata. */
  pillStyle?: CSSProperties;
  className?: string;
}) {
  const empty = value === "—" || !value.trim();
  return (
    <div className={`${dsHubModalPanoramicaSummaryItem}${className ? ` ${className}` : ""}`}>
      <span className={dsHubModalFieldLabel}>{label}</span>
      {pillStyle && !empty ? (
        <span className={dsHubModalPanoramicaReadonlyPill} style={pillStyle}>
          <span className={dsHubModalPanoramicaReadonlyPillInner}>{value}</span>
        </span>
      ) : (
        <span className={empty ? dsHubModalFieldValueEmpty : dsHubModalFieldValue}>{value}</span>
      )}
    </div>
  );
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
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={dsHubModalPanoramicaSubsection}>
      <h4 className={dsHubModalPanoramicaSubsectionTitle}>{title}</h4>
      <dl className={dsHubModalPanoramicaFieldGrid}>{children}</dl>
    </div>
  );
}

export function HubModalPanoramicaFieldGrid({ children }: { children: ReactNode }) {
  return <dl className={dsHubModalPanoramicaFieldGrid}>{children}</dl>;
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
    <div className="min-w-0">
      <dt className={dsHubModalFieldLabel}>{label}</dt>
      <dd
        className={`${empty ? dsHubModalFieldValueEmpty : dsHubModalFieldValue}${mono ? " font-mono tabular-nums" : ""}`}
      >
        {empty ? "—" : value}
      </dd>
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
        {empty ? "Nessuna nota operativa." : value}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        {...gestionaleMultilineEnterProps}
        className={`${dsInput} min-h-[4.5rem] w-full resize-none overflow-y-auto text-xs leading-snug`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        rows={3}
        aria-label="Note operative"
        disabled={saving}
        placeholder="Note intervento visibili in elenco lavorazioni…"
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
              prepareGestionaleModalSaveFrom(e.currentTarget);
              void onSave(text);
            }}
          >
            {saving ? "Salvataggio…" : "Salva note"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
