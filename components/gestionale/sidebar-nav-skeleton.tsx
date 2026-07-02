"use client";

import { GESTIONALE_NAV } from "@/components/gestionale/gestionale-nav-config";
import { sidebarNavLinkBase } from "@/components/gestionale/sidebar-nav-icon-wrap";

const SKELETON_COUNT = GESTIONALE_NAV.length;

/** Placeholder nav — stessa densità del menu reale, nessuna voce esposta. */
export function SidebarNavSkeleton() {
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 py-2" aria-busy="true" aria-label="Caricamento menu">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div
          key={i}
          className={`${sidebarNavLinkBase} pointer-events-none animate-pulse`}
          aria-hidden
        >
          <span className="h-7 w-7 shrink-0 rounded-md bg-[color:var(--cab-border)]" />
          <span className="h-3.5 min-w-0 flex-1 rounded bg-[color:var(--cab-border)]" />
        </div>
      ))}
    </nav>
  );
}
