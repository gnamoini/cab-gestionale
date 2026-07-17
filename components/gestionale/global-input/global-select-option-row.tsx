"use client";

import { memo, type ReactNode } from "react";

export type GlobalSelectOptionRowProps = {
  id: string;
  active: boolean;
  className: string;
  disabled?: boolean;
  label: ReactNode;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
};

/** Riga opzione listbox — memo per liste dense. */
export const GlobalSelectOptionRow = memo(function GlobalSelectOptionRow({
  id,
  active,
  className,
  disabled,
  label,
  onMouseDown,
  onMouseEnter,
}: GlobalSelectOptionRowProps) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      className={className}
      disabled={disabled}
      aria-disabled={disabled}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    >
      {label}
    </button>
  );
});
