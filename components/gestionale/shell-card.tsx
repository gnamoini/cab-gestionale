import type { ReactNode } from "react";
import { dsCardTitle, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

export function ShellCard({
  title,
  subtitle,
  children,
  className = "",
  id,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`${dsSurfaceCard} ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-[color:var(--cab-border)] px-4 py-3 sm:px-5">
          {title ? <h2 className={dsCardTitle}>{title}</h2> : null}
          {subtitle ? <p className={`mt-0.5 ${dsTypoSmall}`}>{subtitle}</p> : null}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
