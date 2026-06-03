"use client";

import { useEffect, useState } from "react";
import { reportZoneNavStickyClass } from "@/components/report/report-ui-tokens";

const ZONE_ITEMS = [
  { id: "report-executive", label: "Sintesi" },
  { id: "report-operations", label: "Operazioni" },
  { id: "report-fleet", label: "Flotta" },
  { id: "report-economic", label: "Economia" },
  { id: "report-maintenance", label: "Dettaglio" },
  { id: "report-compliance", label: "Compliance" },
  { id: "report-team", label: "Team" },
] as const;

const zoneNavLinkClass =
  "inline-flex items-center rounded-[var(--ds-radius-lg)] border px-3 py-1.5 text-xs font-semibold shadow-[var(--cab-shadow-sm)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)]";

const zoneNavLinkIdleClass =
  "border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_25%,var(--cab-border))] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]";

const zoneNavLinkActiveClass =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))] text-[color:var(--cab-text)]";

export function ReportZoneNav() {
  const [activeId, setActiveId] = useState<string>(ZONE_ITEMS[0].id);

  useEffect(() => {
    const elements = ZONE_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el != null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      { rootMargin: "-18% 0px -52% 0px", threshold: [0, 0.12, 0.3] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`min-w-0 ${reportZoneNavStickyClass}`} aria-label="Zone report control tower">
      <ul className="gestionale-scrollbar flex min-w-0 gap-1.5 overflow-x-auto pb-0.5">
        {ZONE_ITEMS.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                className={`${zoneNavLinkClass} ${active ? zoneNavLinkActiveClass : zoneNavLinkIdleClass}`}
                aria-current={active ? "location" : undefined}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
