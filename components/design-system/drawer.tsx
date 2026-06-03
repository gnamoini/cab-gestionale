"use client";

import { useRef, type ReactNode } from "react";
import { dsModalCloseBtn, dsModalHeader, dsModalHeaderInner, dsModalHeaderLead, dsModalTitle, dsModalTitleBlock, dsZDrawer } from "@/lib/ui/design-system";
import { cabIosOverlaySurface } from "@/lib/ui/ios-mobile-tokens";
import { CAB_MODAL_ROOT_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";
import { CloseButton } from "@/components/design-system/close-button";
import { gestionaleLogPanelAsideClass } from "@/components/gestionale/gestionale-log-ui";

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
  const asideRef = useRef<HTMLElement>(null);
  useBodyScrollLock(lockScroll && open, "design-system-Drawer");
  useMobileModalKeyboard(asideRef);

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
        ref={asideRef}
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        className={asideClassName}
        aria-label={ariaLabel ?? title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={dsModalHeader}>
          <div className={dsModalHeaderInner}>
            <div className={dsModalHeaderLead}>
              <div className={dsModalTitleBlock}>
                <h2 className={dsModalTitle}>{title}</h2>
              </div>
            </div>
            <CloseButton onClick={onClose} className={dsModalCloseBtn} />
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
