"use client";

/** Placeholder nav — blocchi generici, non simula voci singole. */
export function SidebarNavSkeleton() {
  const blockWidths = ["w-[88%]", "w-[72%]", "w-[80%]"] as const;

  return (
    <nav className="flex min-h-0 min-w-0 flex-1 flex-col gap-1" aria-busy="true" aria-label="Caricamento menu">
      {blockWidths.map((width, i) => (
        <div
          key={i}
          className="pointer-events-none flex min-h-[var(--cab-sidebar-row-height)] items-center gap-3 rounded-lg px-2"
          aria-hidden
        >
          <span
            className="flex shrink-0 items-center justify-center motion-safe:animate-pulse motion-reduce:animate-none"
            style={{ marginInlineStart: "var(--cab-sidebar-icon-anchor)" }}
          >
            <span className="h-[var(--cab-sidebar-icon-size)] w-[var(--cab-sidebar-icon-size)] rounded-md bg-[color:var(--cab-border)]" />
          </span>
          <span
            className={`h-3.5 min-w-0 rounded bg-[color:var(--cab-border)] motion-safe:animate-pulse motion-reduce:animate-none ${width}`}
          />
        </div>
      ))}
    </nav>
  );
}
