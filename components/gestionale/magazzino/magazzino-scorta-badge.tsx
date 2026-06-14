"use client";

import { useLayoutEffect, useRef, useState } from "react";

type BumpDir = "up" | "down";

export function MagazzinoScortaBadge({
  value,
  low = false,
  variant = "mobile",
  kind = "giacenza",
}: {
  value: number;
  low?: boolean;
  /** mobile: box quadrato card; table: box compatto in tabella. */
  variant?: "mobile" | "table";
  /** `minima`: stesso quadrato senza alert/animazione bump. */
  kind?: "giacenza" | "minima";
}) {
  const isGiacenza = kind === "giacenza";
  const prevRef = useRef(value);
  const [bump, setBump] = useState<{ dir: BumpDir; key: number } | null>(null);

  useLayoutEffect(() => {
    if (!isGiacenza) return;
    if (prevRef.current === value) return;
    const dir: BumpDir = value > prevRef.current ? "up" : "down";
    prevRef.current = value;
    setBump({ dir, key: Date.now() });
  }, [value, isGiacenza]);

  useLayoutEffect(() => {
    if (!bump) return;
    const t = window.setTimeout(() => setBump(null), 480);
    return () => clearTimeout(t);
  }, [bump]);

  const lowClass = "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";

  const giacenzaToneClass = "bg-[var(--cab-surface-2)] text-[color:var(--cab-text)]";
  const minimaToneClass =
    "border border-dashed border-[color:color-mix(in_srgb,var(--cab-border)_95%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,var(--cab-text))]";

  const shellClass = (() => {
    if (isGiacenza) {
      return variant === "mobile"
        ? "magazzino-scorta-badge magazzino-scorta-badge--mobile mt-0.5 size-11 rounded-[var(--ds-radius-lg)] text-lg font-bold ring-2 ring-[var(--cab-card)]"
        : "magazzino-scorta-badge magazzino-scorta-badge--table size-9 rounded-[var(--ds-radius-lg)] text-sm font-bold ring-2 ring-[var(--cab-card)]";
    }
    return variant === "mobile"
      ? "magazzino-scorta-badge magazzino-scorta-badge--minima mt-0.5 size-9 rounded-[var(--ds-radius-lg)] text-sm font-semibold"
      : "magazzino-scorta-badge magazzino-scorta-badge--minima magazzino-scorta-badge--table size-8 rounded-[var(--ds-radius-lg)] text-xs font-semibold";
  })();

  const bumpClass =
    isGiacenza && bump?.dir === "up"
      ? "magazzino-scorta-badge--bump-up"
      : isGiacenza && bump?.dir === "down"
        ? "magazzino-scorta-badge--bump-down"
        : "";

  const valueEnterClass =
    isGiacenza && bump?.dir === "up"
      ? "magazzino-scorta-badge__value--enter-up"
      : isGiacenza && bump?.dir === "down"
        ? "magazzino-scorta-badge__value--enter-down"
        : "";

  const ariaLabel = isGiacenza ? `Giacenza ${value}` : `Scorta minima ${value}`;

  return (
    <span
      className={`${shellClass} inline-flex min-w-0 shrink-0 items-center justify-center overflow-hidden font-mono tabular-nums ${
        isGiacenza ? (low ? lowClass : giacenzaToneClass) : minimaToneClass
      } ${bumpClass}`}
      aria-label={ariaLabel}
    >
      <span key={bump?.key ?? value} className={`magazzino-scorta-badge__value ${valueEnterClass}`}>
        {value}
      </span>
    </span>
  );
}
