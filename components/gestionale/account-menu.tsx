"use client";

import { useRef, type MouseEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { SidebarNavRow, SidebarSessionExpandChevron } from "@/components/gestionale/sidebar-nav-row";

export function AccountMenu({
  variant = "sidebar",
  sidebarCollapsed = false,
  onExpandIntent,
  onOpenProfile,
}: {
  variant?: "sidebar" | "drawer";
  sidebarCollapsed?: boolean;
  onExpandIntent?: () => void;
  /** Chiude il drawer nav mobile quando si apre il profilo. */
  onOpenProfile?: () => void;
}) {
  const { user, status } = useAuth();
  const { open, openProfileSheet, closeProfileSheet, restoreFocusRef } = useProfileSheet();
  const openRef = useRef(open);
  openRef.current = open;

  const displayName = user?.nome?.trim() || "Account";
  const collapsed = variant === "sidebar" && sidebarCollapsed;

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
      }
    : {};

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (openRef.current) {
      closeProfileSheet();
      return;
    }
    restoreFocusRef.current = event.currentTarget;
    onOpenProfile?.();
    openProfileSheet();
  };

  const row = (
    <SidebarNavRow
      as="button"
      data-testid="smoke-account-menu"
      active={false}
      collapsed={collapsed}
      open={open}
      railTooltip={displayName}
      iconShellClass="!rounded-full !bg-transparent shadow-none dark:!bg-transparent"
      icon={
        <UserProfileAvatar
          nome={user?.nome ?? (status === "loading" ? "·" : undefined)}
          email={user?.email}
          variant="rail"
        />
      }
      label={displayName}
      trailing={!collapsed ? <SidebarSessionExpandChevron active={open} /> : undefined}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="cab-profile-sheet-title"
      aria-label={displayName === "Account" ? "Profilo account" : `Profilo account: ${displayName}`}
      onClick={toggle}
      {...navPointerIntentProps}
    />
  );

  return <div className="relative w-full min-w-0">{row}</div>;
}
