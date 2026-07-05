"use client";

import type { MouseEvent } from "react";
import { IconActionButton } from "@/components/design-system";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { dsTableActionGlyph } from "@/lib/ui/design-system";

function IconMenu({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBack({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileNavOpenButton({ onOpen }: { onOpen: () => void }) {
  const { closeProfileSheet } = useProfileSheet();
  return (
    <IconActionButton
      toolbar
      label="Apri menu"
      className="cab-mobile-nav-open shrink-0"
      data-testid="smoke-nav-drawer-open"
      onClick={() => {
        closeProfileSheet();
        onOpen();
      }}
    >
      <IconMenu />
    </IconActionButton>
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
      toolbar
      label={label}
      className="cab-mobile-nav-back shrink-0"
      data-testid="smoke-nav-mobile-back"
      onClick={onClick}
    >
      <IconBack />
    </IconActionButton>
  );
}
