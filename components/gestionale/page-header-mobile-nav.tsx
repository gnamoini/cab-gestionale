"use client";

import {
  MobileNavBackButton,
  MobileNavOpenButton,
} from "@/components/gestionale/mobile-nav-open-button";
import { useGestionaleShellLayout } from "@/context/gestionale-shell-layout-context";
import { useMobileNavShell } from "@/context/mobile-nav-shell-context";
import type { PageHeaderMobileBackConfig } from "@/components/gestionale/page-header-top-row";

/** Hamburger o back nel PageHeader — scorre con la pagina (non fixed). */
export function PageHeaderMobileNav({ back }: { back: PageHeaderMobileBackConfig | null }) {
  const { isCompactShell, contentWidth } = useGestionaleShellLayout();
  const mobileNav = useMobileNavShell();
  if (!isCompactShell || contentWidth <= 0) return null;

  if (back) {
    return (
      <MobileNavBackButton href={back.href} label={back.label} onClick={back.onClick} />
    );
  }

  if (!mobileNav) return null;
  return <MobileNavOpenButton onOpen={mobileNav.openMobileNav} />;
}
