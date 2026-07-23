"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { OptionalTooltip } from "@/components/ui";
import { ShellNavIconBack } from "@/components/design-system/shell-nav-icons";
import { dsShellNavIconBtn } from "@/lib/ui/design-system";
import { blurShellNavAfterPointer } from "@/lib/ui/shell-nav-button-focus";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";
import { resolveTooltipContent } from "@/lib/ui/tooltip-value-score";
type ShellNavBackBase = {
  label?: string;
  className?: string;
  showOnFocus?: boolean;
};

export function ShellNavBackButton({
  label = "Indietro",
  className = "",
  showOnFocus = false,
  type = "button",
  onPointerUp,
  ...props
}: ShellNavBackBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = resolveTooltipContent("", label, { iconOnly: true, ariaLabel: label });
  return (
    <OptionalTooltip content={tip} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <button
        type={type}
        aria-label={label}
        className={`${dsShellNavIconBtn} shrink-0 disabled:pointer-events-none disabled:opacity-55 ${className}`.trim()}
        onPointerUp={(e) => {
          blurShellNavAfterPointer(e);
          onPointerUp?.(e);
        }}
        {...props}
      >
        <ShellNavIconBack />
      </button>
    </OptionalTooltip>
  );
}

export function ShellNavBackLink({
  href,
  label = "Indietro",
  className = "",
  showOnFocus = false,
  ...props
}: ShellNavBackBase & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  const tip = resolveTooltipContent("", label, { iconOnly: true, ariaLabel: label });
  return (
    <OptionalTooltip content={tip} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <Link
        href={href}
        aria-label={label}
        className={`${dsShellNavIconBtn} shrink-0 no-underline ${className}`.trim()}
        {...props}
      >
        <ShellNavIconBack />
      </Link>
    </OptionalTooltip>
  );
}
