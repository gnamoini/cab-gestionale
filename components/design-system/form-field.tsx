import type { ReactNode } from "react";
import { dsInput, dsLabel, dsTextarea } from "@/lib/ui/design-system";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block ${className}`.trim()}>
      <span className={`${dsLabel} text-[color:var(--cab-text)]`}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{hint}</p> : null}
    </label>
  );
}

export const formInputClass = dsInput;
export const formTextareaClass = dsTextarea;
