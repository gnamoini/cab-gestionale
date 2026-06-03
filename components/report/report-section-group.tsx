"use client";

import type { ReactNode } from "react";
import { reportSectionGroupDescClass, reportSectionGroupTitleClass } from "@/components/report/report-ui-tokens";

export function ReportSectionGroup({
  id,
  title,
  description,
  children,
  className = "",
}: {
  id?: string;
  /** Se omesso, solo wrapper ancoraggio (nessun h2). */
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || description);

  return (
    <section
      id={id}
      className={`min-w-0 scroll-mt-28 space-y-4 ${className}`.trim()}
      aria-labelledby={hasHeader && id ? `${id}-title` : undefined}
    >
      {hasHeader ? (
        <header className="min-w-0 border-b border-[color:var(--cab-border)] pb-2">
          {title ? (
            <h2 id={id ? `${id}-title` : undefined} className={reportSectionGroupTitleClass}>
              {title}
            </h2>
          ) : null}
          {description ? <p className={reportSectionGroupDescClass}>{description}</p> : null}
        </header>
      ) : null}
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}
