"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import { ShellNavIconBack } from "@/components/design-system/shell-nav-icons";
import { dsShellNavIconBtn } from "@/lib/ui/design-system";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";

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
  ...props
}: ShellNavBackBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip content={label} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <button
        type={type}
        aria-label={label}
        className={`${dsShellNavIconBtn} shrink-0 disabled:pointer-events-none disabled:opacity-55 ${className}`.trim()}
        {...props}
      >
        <ShellNavIconBack />
      </button>
    </Tooltip>
  );
}

export function ShellNavBackLink({
  href,
  label = "Indietro",
  className = "",
  showOnFocus = false,
  ...props
}: ShellNavBackBase & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  return (
    <Tooltip content={label} showOnFocus={showOnFocus} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <Link
        href={href}
        aria-label={label}
        className={`${dsShellNavIconBtn} shrink-0 no-underline ${className}`.trim()}
        {...props}
      >
        <ShellNavIconBack />
      </Link>
    </Tooltip>
  );
}
