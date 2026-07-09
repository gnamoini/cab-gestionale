"use client";

import type { ReactNode } from "react";

/** Incapsula moduli embedded (es. timesheet) senza primitive dati proprie. */
export function ReportEmbeddedModule({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="min-w-0" aria-label={label}>
      {children}
    </section>
  );
}
