"use client";

const SECTIONS = [
  { id: "bi-executive", label: "Overview" },
  { id: "bi-trend", label: "Trend" },
  { id: "bi-insight", label: "Insight" },
  { id: "bi-context", label: "Contesto" },
  { id: "bi-advanced", label: "Analisi" },
  { id: "bi-decisions", label: "Decisioni" },
  { id: "bi-historical", label: "Storico" },
  { id: "bi-timeline", label: "Timeline" },
  { id: "bi-business-report", label: "Report AI" },
  { id: "bi-ask", label: "Chiedi" },
] as const;

export function ReportSectionNav() {
  return (
    <nav
      className="sticky top-0 z-10 -mx-1 mb-4 hidden border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-bg)_92%,transparent)] backdrop-blur-sm md:block"
      aria-label="Navigazione sezioni report"
    >
      <ul className="flex flex-wrap gap-1 py-2">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="rounded-full px-3 py-1 text-xs font-medium text-[color:var(--cab-text-muted)] hover:bg-[color:var(--cab-surface-muted)] hover:text-[color:var(--cab-text)]"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReportSectionNavMobile() {
  return (
    <label className="mb-3 block md:hidden">
      <span className="sr-only">Vai a sezione</span>
      <select
        className="w-full rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-2 text-sm"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <option value="" disabled>
          Vai a sezione…
        </option>
        {SECTIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
