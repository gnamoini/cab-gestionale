"use client";

import type { ReactNode } from "react";
import {
  dsHubModalTabBar,
  dsHubModalTabBtnBase,
  dsHubModalTabBtnOff,
  dsHubModalTabBtnOn,
} from "@/lib/ui/design-system";

export type HubModalTabBarProps = {
  children: ReactNode;
  /** Accessible name for the tab list. */
  "aria-label": string;
  className?: string;
};

export function HubModalTabBar({ children, "aria-label": ariaLabel, className = "" }: HubModalTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`hub-modal-tab-bar ${dsHubModalTabBar}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}

export type HubModalTabProps = {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
  /** Optional panel id for aria-controls. */
  panelId?: string;
  className?: string;
};

export function HubModalTab({ id, label, active, onSelect, panelId, className = "" }: HubModalTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      className={`${dsHubModalTabBtnBase} ${active ? dsHubModalTabBtnOn : dsHubModalTabBtnOff}${className ? ` ${className}` : ""}`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
