"use client";

import type { ButtonHTMLAttributes } from "react";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { Tooltip } from "@/components/design-system/tooltip";
import { dsShellNavIconBtn } from "@/lib/ui/design-system";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";

export type CloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  /** Default false — `aria-label` basta; evita overhead tooltip al focus su mobile. */
  showOnFocus?: boolean;
};

export function CloseButton({
  label = "Chiudi",
  showOnFocus = false,
  className = "",
  type = "button",
  ...props
}: CloseButtonProps) {
  return (
    <Tooltip content={label} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <button
        type={type}
        aria-label={label}
        className={`${dsShellNavIconBtn} disabled:pointer-events-none disabled:opacity-55 ${className}`.trim()}
        {...props}
      >
        <ShellNavIconClose />
      </button>
    </Tooltip>
  );
}
