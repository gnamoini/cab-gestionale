"use client";

import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import type { ReactNode } from "react";

export type MezziHubTabId =
  | "panoramica"
  | "lavorazioni"
  | "tagliandi"
  | "timeline"
  | "preventivi"
  | "documenti";

export const MEZZI_HUB_TAB_ORDER: readonly MezziHubTabId[] = [
  "panoramica",
  "lavorazioni",
  "tagliandi",
  "preventivi",
  "documenti",
  "timeline",
];

/** Deep link legacy: hubTab=log → timeline. */
export function normalizeMezziHubTabId(raw: string | null | undefined): MezziHubTabId {
  const v = raw?.trim();
  if (v === "log") return "timeline";
  if (v === "attrezzature" || v === "foto") return "panoramica";
  if (
    v === "panoramica" ||
    v === "lavorazioni" ||
    v === "tagliandi" ||
    v === "timeline" ||
    v === "preventivi" ||
    v === "documenti"
  ) {
    return v;
  }
  return "panoramica";
}

export function fmtMezziHubDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MezziHubTabEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[color:var(--cab-text)]">{message}</p>
    </div>
  );
}

export function MezziHubErrorBanner({ message }: { message: string }) {
  return (
    <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
      {message}
    </div>
  );
}

export function MezziHubSyntheticBanner() {
  return (
    <p className="rounded-[var(--ds-radius-lg)] border border-amber-300/75 bg-amber-50/80 px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-100">
      Riga sintetica: crea il mezzo in anagrafica con gli stessi identificativi (targa / matricola) per unificare il parco e
      abilitare la modifica.
    </p>
  );
}

const hubListClass = "min-w-0 ${LIST_DIVIDER_UL}";
const hubListRowClass = "flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0";

export function MezziHubList({ children }: { children: ReactNode }) {
  return <ul className={hubListClass}>{children}</ul>;
}

export function MezziHubListItem({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className={hubListRowClass}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:flex-wrap">{actions}</div> : null}
    </li>
  );
}

export function MezziHubListMeta({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{children}</p>;
}

export function MezziHubListTitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-sm font-medium leading-snug text-[color:var(--cab-text)]">{children}</p>;
}

export function MezziHubListSubtitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">{children}</p>;
}

export function MezziHubTimelineKindBadge({
  kind,
}: {
  kind: "lavorazione" | "log" | "movimento" | "lifecycle" | "tagliando" | "preset_assigned" | "preset_changed" | "compliance_reviewed" | "forecast_recomputed";
}) {
  const label =
    kind === "lavorazione"
      ? "Lavorazione"
      : kind === "tagliando"
        ? "Tagliando"
      : kind === "movimento"
        ? "Magazzino"
        : kind === "lifecycle"
          ? "Asset"
          : kind === "preset_assigned" || kind === "preset_changed"
            ? "Preset"
            : kind === "compliance_reviewed"
              ? "Compliance"
              : kind === "forecast_recomputed"
                ? "Forecast"
          : "Anagrafica";
  const tone =
    kind === "lavorazione"
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-primary)_90%,var(--cab-text))]"
      : kind === "movimento"
        ? "border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] text-[color:var(--cab-text-muted)]"
        : "border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
