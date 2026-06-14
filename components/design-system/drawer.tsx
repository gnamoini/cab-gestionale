"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { dsModalCloseBtn, dsModalHeader, dsModalHeaderInner, dsModalHeaderLead, dsModalTitle, dsModalTitleBlock, dsZDrawer } from "@/lib/ui/design-system";
import { cabIosOverlaySurface, cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";
import { CloseButton } from "@/components/design-system/close-button";
import { gestionaleLogPanelAsideClass } from "@/components/gestionale/gestionale-log-ui";

const LOG_DRAWER_MS = 220;

function logDrawerAnimMs(): number {
  if (typeof window === "undefined") return LOG_DRAWER_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : LOG_DRAWER_MS;
}

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
  const maxMdDown = useMaxMdDown();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelState = closing ? "closing" : "open";

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted || open) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, logDrawerAnimMs());
    return () => window.clearTimeout(id);
  }, [mounted, open]);

  useBodyScrollLock(lockScroll && mounted && !closing, "design-system-Drawer");
  useOverlayBackHandler(mounted && open && !closing, onClose, "design-system-Drawer");
  useMobileModalKeyboard(asideRef);

  if (!mounted) return null;

  const headerNode = (
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
  );

  return (
    <div
      className={`cab-log-drawer-backdrop fixed inset-0 ${dsZDrawer} flex items-stretch justify-end ${cabIosOverlaySurface} bg-[var(--cab-overlay)] backdrop-blur-[1px]`}
      data-state={panelState}
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
        data-state={panelState}
        aria-label={ariaLabel ?? title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          {...(maxMdDown ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            maxMdDown
              ? `${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} overflow-y-auto`
              : "overflow-hidden"
          }`.trim()}
        >
          {headerNode}
          <div className="flex min-h-0 min-w-0 flex-col max-md:flex-none max-md:overflow-visible md:flex-1 md:overflow-hidden">
            {children}
          </div>
        </div>
      </aside>
    </div>
  );
}
