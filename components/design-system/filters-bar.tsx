"use client";

import type { ReactNode } from "react";

export type FiltersBarProps = {
  expanded: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

/** Pannello filtri espandibile (stesso pattern di PageToolbar). */
export function FiltersBar({ expanded, children, className = "", ariaLabel = "Filtri" }: FiltersBarProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      } ${className}`.trim()}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label={ariaLabel}>
          {children}
        </div>
      </div>
    </div>
  );
}
