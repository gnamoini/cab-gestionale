"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
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
    <Tooltip content={title ?? label}>
      <button
        type="button"
        className={`${base} ${dsFocus} ${dsDisabled} ${className}`.trim()}
        aria-label={label}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}
