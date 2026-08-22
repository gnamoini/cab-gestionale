"use client";

import type { OperationalTimelineFilter } from "@/lib/report/operational-context/types";

const FILTERS: { id: OperationalTimelineFilter; label: string }[] = [
  { id: "all", label: "Tutto" },
  { id: "operational", label: "Operativo" },
  { id: "economic", label: "Economico" },
  { id: "warehouse", label: "Magazzino" },
  { id: "commercial", label: "Commerciale" },
  { id: "notes", label: "Note" },
  { id: "insight", label: "Insight" },
];

export function ReportTimelineFilters({
  value,
  onChange,
}: {
  value: OperationalTimelineFilter;
  onChange: (v: OperationalTimelineFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtri timeline">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={value === f.id}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            value === f.id
              ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)] text-[color:var(--cab-primary)]"
              : "border-[color:var(--cab-border)] text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-primary)]"
          }`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
