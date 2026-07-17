"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShellNavIconBack, ShellNavIconRefresh } from "@/components/design-system";
import {
  pageActionMenuHeaderClass,
  pageActionMenuQuickActionIconBtn,
  pageActionMenuQuickActionsBarClass,
} from "@/lib/ui/page-action-menu-tokens";
import { dsBtnGhost, dsPageHeaderIconGlyphDense, dsPageHeaderToolbarActionBtn } from "@/lib/ui/design-system";
import type { PageActionMenuBackConfig } from "@/components/ui/page-action-menu/page-action-menu-types";

const pageActionMenuBackBtnClass = `${dsPageHeaderToolbarActionBtn} shrink-0 gap-1 sm:gap-1.5`;
const pageActionMenuSubmenuBackBtnClass = `${dsBtnGhost} h-11 shrink-0 gap-1.5 px-2`;

export function PageActionMenuRefreshButton({
  busy = false,
  label = "Aggiorna",
  onClick,
}: {
  busy?: boolean;
  label?: string;
  onClick: () => void;
}) {
  const ariaLabel = busy ? "Aggiornamento…" : label;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={ariaLabel}
      className={`${pageActionMenuQuickActionIconBtn}${busy ? " !cursor-wait" : ""}`}
    >
      <ShellNavIconRefresh
        className={`${dsPageHeaderIconGlyphDense} motion-reduce:animate-none${busy ? " animate-spin" : ""}`}
      />
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}

export function PageActionMenuHeader({
  back,
  onBack,
  onRefresh,
  refreshBusy = false,
  refreshLabel = "Aggiorna",
  onSubmenuBack,
  submenuTitle,
  headerActions,
}: {
  back?: PageActionMenuBackConfig | null;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  refreshLabel?: string;
  onSubmenuBack?: () => void;
  submenuTitle?: string;
  headerActions?: ReactNode;
}) {
  if (onSubmenuBack) {
    return (
      <div className={pageActionMenuHeaderClass}>
        <button type="button" className={pageActionMenuSubmenuBackBtnClass} onClick={onSubmenuBack}>
          <ShellNavIconBack className={dsPageHeaderIconGlyphDense} />
          <span>Indietro</span>
        </button>
        {submenuTitle ? (
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-[color:var(--cab-text)]">
            {submenuTitle}
          </span>
        ) : (
          <span className="flex-1" aria-hidden />
        )}
        <span className="w-[4.5rem] shrink-0" aria-hidden />
      </div>
    );
  }

  const showBack = Boolean(back?.href);
  const showRefresh = Boolean(onRefresh);
  const showHeaderActions = Boolean(headerActions);
  const showQuickActionsBar = showRefresh || showHeaderActions;

  if (!showBack && !showQuickActionsBar) return null;

  return (
    <div className={pageActionMenuHeaderClass}>
      {showBack && back ? (
        onBack ? (
          <button type="button" className={pageActionMenuBackBtnClass} onClick={onBack}>
            <ShellNavIconBack className={dsPageHeaderIconGlyphDense} />
            <span className="sr-only sm:not-sr-only sm:inline">Indietro</span>
          </button>
        ) : (
          <Link href={back.href} className={pageActionMenuBackBtnClass}>
            <ShellNavIconBack className={dsPageHeaderIconGlyphDense} />
            <span className="sr-only sm:not-sr-only sm:inline">Indietro</span>
          </Link>
        )
      ) : null}
      {showQuickActionsBar ? (
        <div className={pageActionMenuQuickActionsBarClass}>
          {headerActions}
          {showRefresh ? (
            <PageActionMenuRefreshButton busy={refreshBusy} label={refreshLabel} onClick={onRefresh!} />
          ) : null}
        </div>
      ) : (
        <span className="flex-1" aria-hidden />
      )}
    </div>
  );
}
