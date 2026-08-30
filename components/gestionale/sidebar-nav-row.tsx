"use client";

import Link from "next/link";
import { Tooltip } from "@/components/ui";
import { memo, forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";

import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { erpFocus } from "@/lib/ui/erp-tokens";
import {
  sidebarActiveIndicatorClass,
  sidebarNavIconShellClass,
  sidebarNavIconShellInactiveClass,
  sidebarNavRowClass,
  sidebarNavRowDisabledClass,
  sidebarNavRowIconTrackClass,
  sidebarNavRowInactiveClass,
  sidebarNavRowLabelClass,
  sidebarNavRowTrailingClass,
} from "@/lib/ui/sidebar-layout";

export function SidebarSessionExpandChevron({ active = false }: { active?: boolean }) {
  return (
    <svg
      className={`cab-sidebar-session-expand-chevron h-3.5 w-3.5 shrink-0 transition-[opacity,color] duration-200 ease-out ${
        active
          ? "text-[color:var(--cab-primary)] opacity-100"
          : "text-[color:var(--cab-text-muted)] group-hover:text-[color:var(--cab-text)]"
      }`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
    </svg>
  );
}

function SidebarActiveIndicator({ active, collapsed }: { active: boolean; collapsed: boolean }) {
  if (!active) return null;
  return (
    <span
      className={`${sidebarActiveIndicatorClass} ${
        collapsed ? "cab-sidebar-active-indicator--rail" : "cab-sidebar-active-indicator--row"
      }`}
      aria-hidden
    />
  );
}

export function SidebarNavIconWrap({
  shellClass,
  children,
  dimmed,
  className = "",
}: {
  shellClass: string;
  children: ReactNode;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${sidebarNavIconShellClass} ${shellClass} ${dimmed ? "opacity-60" : ""} ${className}`.trim()}
      aria-hidden
    >
      {children}
    </span>
  );
}

type SidebarNavRowCommonProps = {
  icon: ReactNode;
  label: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** Rail stretta (label/trailing nascosti via CSS sull'aside). */
  collapsed?: boolean;
  open?: boolean;
  className?: string;
  rowClassName?: string;
  /** Tooltip su rail collassata — avvolge il nodo nativo (link/button), non il wrapper forwardRef. */
  railTooltip?: string;
  railTooltipSide?: TooltipSide;
  /** Override shell icona (es. avatar profilo senza sfondo zinc). */
  iconShellClass?: string;
};

type SidebarNavRowAsLink = SidebarNavRowCommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
    as?: "link";
  };

type SidebarNavRowAsButton = SidebarNavRowCommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children"> & {
    as: "button";
  };

type SidebarNavRowAsDiv = SidebarNavRowCommonProps &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    as: "div";
  };

export type SidebarNavRowProps = SidebarNavRowAsLink | SidebarNavRowAsButton | SidebarNavRowAsDiv;

function rowClassNames(props: SidebarNavRowCommonProps): string {
  const { active, disabled, open, className = "", rowClassName = "" } = props;
  return [
    sidebarNavRowClass,
    rowClassName,
    disabled ? sidebarNavRowDisabledClass : sidebarNavRowInactiveClass,
    active ? "cab-sidebar-nav-row--active" : "",
    open ? "cab-sidebar-session-item--open" : "",
    erpFocus,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function RowContent({
  icon,
  label,
  trailing,
  active = false,
  collapsed = false,
  disabled = false,
  iconShellClass,
}: SidebarNavRowCommonProps) {
  const shellClass = iconShellClass ?? sidebarNavIconShellInactiveClass;

  return (
    <>
      <SidebarActiveIndicator active={active && !disabled} collapsed={collapsed} />
      <span className={sidebarNavRowIconTrackClass}>
        <SidebarNavIconWrap shellClass={shellClass} dimmed={disabled}>
          {icon}
        </SidebarNavIconWrap>
      </span>
      <span className={sidebarNavRowLabelClass}>{label}</span>
      {trailing ? <span className={sidebarNavRowTrailingClass}>{trailing}</span> : null}
    </>
  );
}

function wrapRailTooltip(
  node: ReactElement,
  tooltip: string | undefined,
  collapsed: boolean,
  side: TooltipSide = "right",
): ReactElement {
  if (!tooltip || !collapsed) return node;
  return <Tooltip content={tooltip} side={side}>{node}</Tooltip>;
}

function excludeNavRowDomProps<T extends Record<string, unknown>>(rest: T): Omit<T, "className" | "rowClassName" | "as"> {
  const out = { ...rest };
  delete out.className;
  delete out.rowClassName;
  delete out.as;
  return out as Omit<T, "className" | "rowClassName" | "as">;
}

export const SidebarNavRow = memo(forwardRef<HTMLButtonElement | HTMLAnchorElement | HTMLDivElement, SidebarNavRowProps>(
  function SidebarNavRow(props, ref) {
  const {
    as = "link",
    icon,
    label,
    trailing,
    active,
    disabled,
    collapsed = false,
    open,
    railTooltip,
    railTooltipSide = "right",
    iconShellClass,
    ...rest
  } = props;

  const contentProps = { icon, label, trailing, active, disabled, collapsed, open, iconShellClass };

  if (as === "button") {
    const buttonRest = excludeNavRowDomProps(rest as SidebarNavRowAsButton);
    return wrapRailTooltip(
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled}
        className={rowClassNames(props)}
        {...buttonRest}
      >
        <RowContent {...contentProps} />
      </button>,
      railTooltip,
      collapsed,
      railTooltipSide,
    );
  }

  if (as === "div") {
    const divRest = excludeNavRowDomProps(rest as SidebarNavRowAsDiv);
    return wrapRailTooltip(
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        role="link"
        aria-disabled={disabled ? "true" : undefined}
        className={rowClassNames(props)}
        {...divRest}
      >
        <RowContent {...contentProps} />
      </div>,
      railTooltip,
      collapsed,
      railTooltipSide,
    );
  }

  const { href = "#", ...linkRestRaw } = rest as SidebarNavRowAsLink;
  const linkRest = excludeNavRowDomProps(linkRestRaw);
  if (disabled) {
    return wrapRailTooltip(
      <div ref={ref as React.Ref<HTMLDivElement>} role="link" aria-disabled="true" className={rowClassNames(props)}>
        <RowContent {...contentProps} />
      </div>,
      railTooltip,
      collapsed,
      railTooltipSide,
    );
  }

  return wrapRailTooltip(
    <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={rowClassNames(props)} {...linkRest}>
      <RowContent {...contentProps} />
    </Link>,
    railTooltip,
    collapsed,
    railTooltipSide,
  );
},
));
