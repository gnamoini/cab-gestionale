"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { dsPageToolbarIconBtn } from "@/lib/ui/design-system";

type IconActionButtonBase = {
  label: string;
  children: ReactNode;
  className?: string;
  /** Toolbar header pagina — footprint quadrato 44×44 (`dsPageToolbarIconBtn`). */
  toolbar?: boolean;
  tooltipSide?: TooltipSide;
  tooltipDisabled?: boolean;
  /** Tooltip alternativo (es. "Sola lettura" quando disabled). Default: label. */
  tooltipContent?: string;
};

type IconActionAsButton = IconActionButtonBase &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: "button";
  };

type IconActionAsLink = IconActionButtonBase &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    as: "link";
    href: string;
  };

export type IconActionButtonProps = IconActionAsButton | IconActionAsLink;

export function IconActionButton(props: IconActionButtonProps) {
  const {
    label,
    children,
    className = "",
    toolbar = false,
    tooltipSide,
    tooltipDisabled,
    tooltipContent,
    as = "button",
    ...rest
  } = props;

  const content = tooltipContent ?? label;
  const resolvedClassName = `${toolbar ? dsPageToolbarIconBtn : ""} ${className}`.trim();
  const multiline = content.includes("\n");

  if (as === "link") {
    const { href, ...linkRest } = rest as IconActionAsLink;
    const link = (
      <Link href={href} aria-label={label} className={resolvedClassName} {...linkRest}>
        {children}
      </Link>
    );
    return (
      <Tooltip content={content} side={tooltipSide} disabled={tooltipDisabled} multiline={multiline}>
        {link}
      </Tooltip>
    );
  }

  const buttonRest = rest as IconActionAsButton;
  const button = (
    <button type="button" aria-label={label} className={resolvedClassName} {...buttonRest}>
      {children}
    </button>
  );

  return (
    <Tooltip content={content} side={tooltipSide} disabled={tooltipDisabled} multiline={multiline}>
      {buttonRest.disabled ? <span className="inline-flex min-w-0">{button}</span> : button}
    </Tooltip>
  );
}
