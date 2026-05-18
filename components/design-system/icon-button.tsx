"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { dsBtnIcon, dsDisabled, dsFocus, dsPageToolbarBtn } from "@/lib/ui/design-system";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Toolbar header (log, tema, account companion). */
  toolbar?: boolean;
  label: string;
};

export function IconButton({ children, toolbar, className = "", label, title, ...rest }: IconButtonProps) {
  const base = toolbar ? `${dsPageToolbarBtn} h-11 min-w-[2.75rem] px-2.5` : dsBtnIcon;
  return (
    <button
      type="button"
      className={`${base} ${dsFocus} ${dsDisabled} ${className}`.trim()}
      title={title ?? label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
}
