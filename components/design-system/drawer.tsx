"use client";

import type { ReactNode } from "react";
import { dsZDrawer } from "@/lib/ui/design-system";
import { cabIosOverlaySurface } from "@/lib/ui/ios-mobile-tokens";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { CloseButton } from "@/components/design-system/close-button";
import {
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
} from "@/components/gestionale/gestionale-log-ui";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Larghezza aside (default log panel). */
  asideClassName?: string;
  ariaLabel?: string;
  /** Default true. Impostare false se la pagina gestisce già il body scroll lock (overlay multipli). */
  lockScroll?: boolean;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  asideClassName = gestionaleLogPanelAsideClass,
  ariaLabel,
  lockScroll = true,
}: DrawerProps) {
  useBodyScrollLock(lockScroll && open, "design-system-Drawer");

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${dsZDrawer} flex items-stretch justify-end ${cabIosOverlaySurface} bg-[var(--cab-overlay)] backdrop-blur-[1px]`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <aside
        className={asideClassName}
        aria-label={ariaLabel ?? title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={gestionaleLogPanelHeaderClass}>
          <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</h2>
          <CloseButton onClick={onClose} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
