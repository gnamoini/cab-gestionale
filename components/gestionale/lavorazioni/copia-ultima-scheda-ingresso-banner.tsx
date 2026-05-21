"use client";

import { formatLastSchedaIngressoHint } from "@/lib/schede/scheda-ingresso-reuse";
import { dsBtnSoftOrange } from "@/lib/ui/design-system";

function IconCopiaIngressoPrecedente({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 6h10a2 2 0 0 1 2 2v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 12v5M9.5 14.5H14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function CopiaUltimaSchedaIngressoBanner({
  visible,
  highlight,
  updatedAt,
  disabled,
  disabledTitle,
  onCopy,
}: {
  visible: boolean;
  /** Evidenzia al primo match (pulse/glow). */
  highlight: boolean;
  updatedAt?: string;
  disabled?: boolean;
  disabledTitle?: string;
  onCopy: () => void;
}) {
  if (!visible) return null;

  return (
    <div
      className={[
        "rounded-xl border px-3 py-3 transition-[box-shadow,border-color] duration-300",
        highlight
          ? "animate-pulse border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--cab-primary)_28%,transparent)] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))]"
          : "border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))]",
      ].join(" ")}
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-primary)]">
        Mezzo già registrato
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {updatedAt
          ? `Ultima scheda ingresso: ${formatLastSchedaIngressoHint(updatedAt)}. Puoi copiare i dati nell’anagrafica corrente.`
          : "È disponibile una scheda ingresso precedente per questo mezzo."}
      </p>
      <button
        type="button"
        className={`${dsBtnSoftOrange} mt-3 w-full sm:w-auto ${highlight ? "shadow-[0_0_14px_color-mix(in_srgb,var(--cab-primary)_40%,transparent)]" : ""}`}
        disabled={disabled}
        title={disabled ? disabledTitle : "Copia campi dall’ultima scheda ingresso dello stesso mezzo"}
        onClick={onCopy}
      >
        <IconCopiaIngressoPrecedente />
        Copia ultima scheda ingresso
      </button>
    </div>
  );
}
