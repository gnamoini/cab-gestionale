"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { IconActionButton } from "@/components/design-system";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { useMobileNavShell } from "@/context/mobile-nav-shell-context";
import { dsPageHeaderBackBtn, dsPageHeaderNavOpenBtn, dsTableActionGlyph } from "@/lib/ui/design-system";

function IconMenu({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBack({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MobileNavOpenButton({ onOpen }: { onOpen: () => void }) {
  const { closeProfileSheet } = useProfileSheet();
  const mobileNav = useMobileNavShell();
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const btn = wrapRef.current?.querySelector<HTMLElement>('[data-testid="smoke-nav-drawer-open"]');
    mobileNav?.registerMobileNavTrigger(btn ?? null);
    return () => mobileNav?.registerMobileNavTrigger(null);
  }, [mobileNav]);

  return (
    <span ref={wrapRef} className="contents">
    <IconActionButton
      label="Apri menu"
      className={`${dsPageHeaderNavOpenBtn} cab-mobile-nav-open shrink-0`}
      data-testid="smoke-nav-drawer-open"
      onClick={() => {
        closeProfileSheet();
        onOpen();
      }}
    >
      <IconMenu className="h-5 w-5 shrink-0 opacity-90" />
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
    <IconActionButton
      as="link"
      href={href}
      label={label}
      className={`${dsPageHeaderBackBtn} cab-mobile-nav-back`}
      data-testid="smoke-nav-mobile-back"
      onClick={onClick}
    >
      <IconBack />
    </IconActionButton>
  );
}
