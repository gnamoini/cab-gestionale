"use client";

import { Tooltip } from "@/components/ui";
import {
  formatRicambioAnagraficaMissingTooltip,
  isRicambioAnagraficaIncompleta,
  ricambioAnagraficaMissingFieldsFromUi,
} from "@/lib/magazzino/ricambio-anagrafica-status";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a1 1 0 0 1 .894.553l8.5 16A1 1 0 0 1 20.5 20h-17a1 1 0 0 1-.894-1.447l8.5-16A1 1 0 0 1 12 2Zm0 5a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm0 10a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
      />
    </svg>
  );
}

export function MagazzinoAnagraficaIncompletaBadge({
  ricambio,
  variant = "table",
}: {
  ricambio: RicambioMagazzino;
  variant?: "table" | "mobile" | "inline";
}) {
  if (!isRicambioAnagraficaIncompleta(ricambio)) return null;

  const missing = ricambioAnagraficaMissingFieldsFromUi(ricambio);
  const tooltip = formatRicambioAnagraficaMissingTooltip(missing);
  const shellClass =
    variant === "mobile"
      ? "h-6 rounded-full px-2"
      : variant === "inline"
        ? "h-5 rounded-full px-1.5"
        : "h-5 rounded-full px-1.5";

  return (
    <Tooltip content={tooltip} side="top">
      <span
        className={`${shellClass} inline-flex shrink-0 items-center gap-0.5 bg-[color:color-mix(in_srgb,var(--cab-warning)_16%,var(--cab-surface))] text-[10px] font-medium text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))]`}
        aria-label={tooltip}
      >
        <WarningIcon className={variant === "mobile" ? "size-3" : "size-3"} />
        <span className="max-sm:hidden">Incompleto</span>
      </span>
    </Tooltip>
  );
}

export function RicambioAnagraficaIncompletaBanner({ ricambio }: { ricambio: RicambioMagazzino }) {
  if (!isRicambioAnagraficaIncompleta(ricambio)) return null;
  const missing = ricambioAnagraficaMissingFieldsFromUi(ricambio);
  const tooltip = formatRicambioAnagraficaMissingTooltip(missing);
  return (
    <p
      className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:var(--cab-text)]"
      role="status"
    >
      {tooltip}
    </p>
  );
}
