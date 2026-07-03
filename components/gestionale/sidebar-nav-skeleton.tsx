"use client";

import { GESTIONALE_NAV } from "@/components/gestionale/gestionale-nav-config";
import { sidebarNavRowClass } from "@/lib/ui/sidebar-layout";

const SKELETON_COUNT = GESTIONALE_NAV.length;

/** Placeholder nav — stessa densità del menu reale, nessuna voce esposta. */
export function SidebarNavSkeleton() {
  return (
    <nav className="flex min-h-0 min-w-0 flex-1 flex-col gap-1" aria-busy="true" aria-label="Caricamento menu">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div
          key={i}
          className={`${sidebarNavRowClass} pointer-events-none min-h-[var(--cab-sidebar-row-height)] animate-pulse rounded-lg`}
          aria-hidden
        >
          <span
            className="cab-sidebar-nav-row__icon-track flex shrink-0 items-center justify-center"
            style={{ marginInlineStart: "var(--cab-sidebar-icon-anchor)" }}
          >
            <span className="h-[var(--cab-sidebar-icon-size)] w-[var(--cab-sidebar-icon-size)] rounded-md bg-[color:var(--cab-border)]" />
          </span>
          <span className="cab-sidebar-nav-row__label h-3.5 min-w-0 flex-1 rounded bg-[color:var(--cab-border)]" />
        </div>
      ))}
    </nav>
  );
}
