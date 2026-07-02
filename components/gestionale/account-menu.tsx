"use client";

import { useRef } from "react";
import { Tooltip } from "@/components/design-system";
import { useAuth } from "@/context/auth-context";
import { erpFocus } from "@/lib/ui/erp-tokens";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import { ProfileSheet } from "@/components/profile/profile-sheet";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import {
  SidebarSessionExpandChevron,
  sidebarNavLinkBase,
  sidebarNavLinkInactive,
} from "@/components/gestionale/sidebar-nav-icon-wrap";

export function AccountMenu({
  variant = "sidebar",
  sidebarCollapsed = false,
  onExpandIntent,
}: {
  variant?: "sidebar" | "drawer";
  sidebarCollapsed?: boolean;
  onExpandIntent?: () => void;
}) {
  const { user, status } = useAuth();
  const { open, openProfileSheet, closeProfileSheet } = useProfileSheet();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayName = user?.nome?.trim() || "Account";
  const collapsed = variant === "sidebar" && sidebarCollapsed;

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
        onFocus: () => onExpandIntent?.(),
      }
    : {};

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      data-testid="smoke-account-menu"
      onClick={() => {
        if (open) closeProfileSheet();
        else openProfileSheet();
      }}
      className={`cab-sidebar-session-user ${sidebarNavLinkBase} ${sidebarNavLinkInactive} ${
        open ? "cab-sidebar-session-item--open" : ""
      } ${erpFocus}`.trim()}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="cab-profile-sheet-title"
      aria-label={displayName === "Account" ? "Profilo account" : `Profilo account: ${displayName}`}
      {...navPointerIntentProps}
    >
      <span className="cab-sidebar-nav-icon-slot flex h-7 w-7 shrink-0 items-center justify-center">
        <UserProfileAvatar
          nome={user?.nome ?? (status === "loading" ? "·" : undefined)}
          email={user?.email}
          variant="rail"
        />
      </span>
      <span className="cab-sidebar-nav-label min-w-0 truncate text-left leading-tight">{displayName}</span>
      <span className="cab-sidebar-account-chevron shrink-0" aria-hidden>
        <SidebarSessionExpandChevron active={open} />
      </span>
    </button>
  );

  return (
    <div className="relative w-full min-w-0">
      {collapsed ? (
        <Tooltip content={displayName} side="right">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <ProfileSheet restoreFocusRef={triggerRef} />
    </div>
  );
}
