"use client";

import { useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import { ProfileSheet } from "@/components/profile/profile-sheet";
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
  const { open, openProfileSheet, closeProfileSheet } = useProfileSheet();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const displayName = user?.nome?.trim() || "Account";
  const collapsed = variant === "sidebar" && sidebarCollapsed;

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
      }
    : {};

  const toggle = () => {
    if (openRef.current) {
      closeProfileSheet();
      return;
    }
    onOpenProfile?.();
    openProfileSheet();
  };

  const row = (
    <SidebarNavRow
      as="button"
      ref={triggerRef}
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

  return (
    <div className="relative w-full min-w-0">
      {row}
      <ProfileSheet restoreFocusRef={triggerRef} />
    </div>
  );
}
