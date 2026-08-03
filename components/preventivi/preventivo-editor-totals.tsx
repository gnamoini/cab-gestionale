"use client";

import type { ReactNode } from "react";
import { dsLabel } from "@/lib/ui/design-system";
import {
  preventivoEditorMoneyValue,
  preventivoEditorMoneyValueSm,
  preventivoEditorSubsectionTitle,
} from "@/components/preventivi/preventivo-editor-ui";

export {
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
  preventivoEditorSubsectionTitleClass,
} from "@/components/preventivi/preventivo-editor-ui";

const totalBarNeutralClass =
  "border border-[color:var(--cab-border)] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

const totalBarLayoutClass = "flex items-center justify-between gap-3 px-3 py-2.5";

export function fmtPreventivoEuro(n: number): string {
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Barra totale sezione / totale con IVA — stesso shell in tutto il modale. */
export function PreventivoEditorTotalBar({
  label,
  value,
  emphasis = "section",
  className = "",
}: {
  label: string;
  value: string;
  /** `section` = totale sezione; `grand` = totale documento (stesso stile, valore più grande). */
  emphasis?: "section" | "grand";
  className?: string;
}) {
  const valueClass =
    emphasis === "grand"
      ? `shrink-0 text-lg font-semibold tabular-nums text-[color:var(--cab-text)]`
      : `shrink-0 ${preventivoEditorMoneyValue}`;

  return (
    <div
      className={`${totalBarLayoutClass} rounded-[var(--ds-radius-lg)] ${totalBarNeutralClass} ${className}`.trim()}
    >
      <span className={preventivoEditorSubsectionTitle}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

const riepilogoRowBaseClass = "flex items-center justify-between gap-3 px-3 py-2.5";

const riepilogoVoceLabelClass = `min-w-0 ${dsLabel}`;

const riepilogoVoceValueClass = `shrink-0 ${preventivoEditorMoneyValueSm}`;

/** Riga voce nel pannello riepilogo (non totale finale). */
export function PreventivoEditorRiepilogoRow({
  label,
  value,
  tone = "item",
}: {
  label: string;
  value: string;
  tone?: "item" | "subtotal";
}) {
  return (
    <div
      className={
        tone === "subtotal"
          ? `${riepilogoRowBaseClass} border-t border-[color:var(--cab-border)]`
          : riepilogoRowBaseClass
      }
    >
      <span className={riepilogoVoceLabelClass}>{label}</span>
      <span className={riepilogoVoceValueClass}>{value}</span>
    </div>
  );
}

/** Chip importo nella barra sticky (ricambi, manodopera, IVA). */
export function PreventivoEditorTotalChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className={preventivoEditorSubsectionTitle}>{label}</span>
      <span className={`font-semibold tabular-nums text-[color:var(--cab-text)]`}>{value}</span>
    </span>
  );
}

/** Barra sticky riepilogo rapido in cima al modale. */
export function PreventivoEditorStickyTotalsBar({
  chips,
  grandLabel,
  grandValue,
}: {
  chips: ReactNode;
  grandLabel: string;
  grandValue: string;
}) {
  return (
    <div
      className={`${totalBarLayoutClass} flex-wrap rounded-[var(--ds-radius-lg)] ${totalBarNeutralClass} gap-y-2`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">{chips}</div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className={preventivoEditorSubsectionTitle}>{grandLabel}</span>
        <span className={preventivoEditorMoneyValue}>{grandValue}</span>
      </div>
    </div>
  );
}
