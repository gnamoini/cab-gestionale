"use client";

import { memo, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageHeaderMobileNav } from "@/components/gestionale/page-header-mobile-nav";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import {
  useGestionaleShellContentWidth,
  useGestionaleShellTier,
} from "@/context/gestionale-shell-layout-context";
import { dsPageHeaderTopRow, dsPageTitle, dsPageTitleToolbarAlign } from "@/lib/ui/design-system";
import {
  resolveMobilePageHeaderBack,
  type MobilePageHeaderBack,
} from "@/lib/ui/mobile-page-header-nav";

export type PageHeaderMobileBackConfig = MobilePageHeaderBack & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function PageHeaderTopRowInner({
  title,
  titleMobile,
  leading,
  mobileBack,
  titleAddon,
  actions,
  topRowClassName,
}: {
  title: string;
  /** Titolo su shell compatta (mobile/tablet); default: `title`. */
  titleMobile?: string;
  leading?: ReactNode;
  /** Override esplicito del back mobile (altrimenti risolto dal pathname). */
  mobileBack?: PageHeaderMobileBackConfig;
  titleAddon?: ReactNode;
  actions?: ReactNode;
  topRowClassName?: string;
}) {
  const pathname = usePathname();
  const { isCompactShell } = useGestionaleShellTier();
  const contentWidth = useGestionaleShellContentWidth();
  const resolvedBack = mobileBack ?? resolveMobilePageHeaderBack(pathname);
  const showMobileBack = isCompactShell && contentWidth > 0 && resolvedBack != null;
  const showLeading = leading && !showMobileBack;
  const displayTitle =
    isCompactShell && contentWidth > 0 && titleMobile?.trim() ? titleMobile.trim() : title;

  return (
    <div className={`${dsPageHeaderTopRow} cab-page-header-top-row${topRowClassName ? ` ${topRowClassName}` : ""}`}>
      <PageHeaderMobileNav back={showMobileBack ? resolvedBack : null} />
      <div className="cab-page-header-title-cluster flex min-w-0 max-w-full flex-1 items-center gap-2 ps-1 cab-shell-desktop:ps-0">
        {showLeading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
        <h1 className={`${dsPageTitle} ${dsPageTitleToolbarAlign} min-w-0 break-words`}>{displayTitle}</h1>
        {titleAddon ? <div className="flex shrink-0 items-center">{titleAddon}</div> : null}
      </div>
      {actions ? (
        <div className={`${gestionalePageToolbarActionsClass} ms-auto min-w-0 max-w-full`}>{actions}</div>
      ) : null}
    </div>
  );
}

export const PageHeaderTopRow = memo(PageHeaderTopRowInner);
