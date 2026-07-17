"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { IconActionButton, ShellNavBackLink, ShellNavIconMenu } from "@/components/design-system";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { useMobileNavShell } from "@/context/mobile-nav-shell-context";
import { NAV_DRAWER_PANEL_ID } from "@/lib/ui/mobile-nav-drawer-contract";
import { dsPageHeaderIconBtn } from "@/lib/ui/design-system";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";

export function MobileNavOpenButton({ onOpen }: { onOpen: () => void }) {
  const { closeProfileSheet } = useProfileSheet();
  const mobileNav = useMobileNavShell();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const isOpen = mobileNav?.isNavDrawerOpen ?? false;

  useEffect(() => {
    const btn = wrapRef.current?.querySelector<HTMLElement>('[data-testid="smoke-nav-drawer-open"]');
    mobileNav?.registerMobileNavTrigger(btn ?? null);
    return () => mobileNav?.registerMobileNavTrigger(null);
  }, [mobileNav]);

  return (
    <span ref={wrapRef} className="contents">
    <IconActionButton
      label="Apri menu"
      tooltipSideOffset={TOOLTIP_GAP_SHELL_NAV}
      className={`${dsPageHeaderIconBtn} cab-mobile-nav-open shrink-0`}
      data-testid="smoke-nav-drawer-open"
      aria-expanded={isOpen}
      aria-controls={NAV_DRAWER_PANEL_ID}
      aria-haspopup="dialog"
      onClick={() => {
        closeProfileSheet();
        onOpen();
      }}
    >
      <ShellNavIconMenu />
    </IconActionButton>
    </span>
  );
}

export function MobileNavBackButton({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <ShellNavBackLink
      href={href}
      label={label}
      className="cab-mobile-nav-back"
      data-testid="smoke-nav-mobile-back"
      onClick={onClick}
    />
  );
}
