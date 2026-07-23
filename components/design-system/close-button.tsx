"use client";

import type { ButtonHTMLAttributes } from "react";
import { OptionalTooltip } from "@/components/ui";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { dsShellNavIconBtn } from "@/lib/ui/design-system";
import { blurShellNavAfterPointer } from "@/lib/ui/shell-nav-button-focus";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";
import { resolveTooltipContent } from "@/lib/ui/tooltip-value-score";

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
  onPointerUp,
  ...props
}: CloseButtonProps) {
  const tip = resolveTooltipContent("", label, { iconOnly: true, ariaLabel: label });
  const btn = (
    <button
      type={type}
      aria-label={label}
      className={`${dsShellNavIconBtn} disabled:pointer-events-none disabled:opacity-55 ${className}`.trim()}
      onPointerUp={(e) => {
        blurShellNavAfterPointer(e);
        onPointerUp?.(e);
      }}
      {...props}
    >
      <ShellNavIconClose />
    </button>
  );
  return (
    <OptionalTooltip content={tip} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      {btn}
    </OptionalTooltip>
  );
}
