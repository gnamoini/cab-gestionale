"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { OptionalTooltip } from "@/components/ui";
import { dsBtnIcon, dsDisabled, dsFocus, dsPageToolbarIconBtn } from "@/lib/ui/design-system";
import { resolveTooltipContent } from "@/lib/ui/tooltip-value-score";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Toolbar header (log, tema, account companion). */
  toolbar?: boolean;
  label: string;
};

export function IconButton({ children, toolbar, className = "", label, title, ...rest }: IconButtonProps) {
  const base = toolbar ? dsPageToolbarIconBtn : dsBtnIcon;
  const content = resolveTooltipContent("", title ?? label, { iconOnly: true, ariaLabel: label });
  const btn = (
    <button
      type="button"
      className={`${base} ${dsFocus} ${dsDisabled} ${className}`.trim()}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
  return <OptionalTooltip content={content}>{btn}</OptionalTooltip>;
}
