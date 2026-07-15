"use client";

import Link from "next/link";
import { GestionaleRefreshToolbarButton } from "@/components/gestionale/page-header-toolbar";
import { pageActionMenuHeaderClass } from "@/lib/ui/page-action-menu-tokens";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";
import type { PageActionMenuBackConfig } from "@/components/ui/page-action-menu/page-action-menu-types";

function IconBack({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
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
}: {
  back?: PageActionMenuBackConfig | null;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  refreshLabel?: string;
  onSubmenuBack?: () => void;
  submenuTitle?: string;
}) {
  if (onSubmenuBack) {
    return (
      <div className={pageActionMenuHeaderClass}>
        <button type="button" className={`${dsPageToolbarBtn} gap-1.5`} onClick={onSubmenuBack}>
          <IconBack />
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

  if (!showBack && !showRefresh) return null;

  return (
    <div className={pageActionMenuHeaderClass}>
      {showBack && back ? (
        onBack ? (
          <button type="button" className={`${dsPageToolbarBtn} gap-1.5`} onClick={onBack}>
            <IconBack />
            <span className="sr-only sm:not-sr-only sm:inline">Indietro</span>
          </button>
        ) : (
          <Link href={back.href} className={`${dsPageToolbarBtn} gap-1.5`}>
            <IconBack />
            <span className="sr-only sm:not-sr-only sm:inline">Indietro</span>
          </Link>
        )
      ) : (
        <span className="w-[4.5rem] shrink-0" aria-hidden />
      )}
      <span className="flex-1" aria-hidden />
      {showRefresh ? (
        <GestionaleRefreshToolbarButton busy={refreshBusy} onClick={onRefresh!} label={refreshLabel} />
      ) : (
        <span className="w-[4.5rem] shrink-0" aria-hidden />
      )}
    </div>
  );
}
