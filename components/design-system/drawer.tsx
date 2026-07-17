"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type RefObject,
} from "react";
import {
  dsModalCloseBtn,
  dsModalHeader,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalTitle,
  dsModalTitleBlock,
  dsZDrawer,
} from "@/lib/ui/design-system";
import {
  dispatchGestionaleOverlayClosed,
  dispatchGestionaleOverlayOpened,
  restoreGestionaleDrawerFocus,
} from "@/lib/ui/use-sidebar-collapsed";
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
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { CloseButton } from "@/components/design-system/close-button";
import { gestionaleLogPanelAsideClass } from "@/components/gestionale/gestionale-log-ui";

const LOG_DRAWER_MS = 220;

function logDrawerAnimMs(): number {
  if (typeof window === "undefined") return LOG_DRAWER_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : LOG_DRAWER_MS;
}

function shouldSkipDrawerEscape(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return true;
  return false;
}

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Larghezza aside (default log panel). */
  asideClassName?: string;
  ariaLabel?: string;
  /** Id titolo per aria-labelledby (default generato). */
  titleId?: string;
  /** Default true. Impostare false se la pagina gestisce già il body scroll lock (overlay multipli). */
  lockScroll?: boolean;
  /** Default true — chiusura con Escape (salta campi editabili). */
  closeOnEscape?: boolean;
  /** Ripristina focus su questo elemento alla chiusura. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
  /** Elemento inline accanto al titolo (es. badge stato). */
  titleAddon?: ReactNode;
  /** Z-index layer (default drawer). Profilo sopra nav tablet: z-[110]. */
  layerClassName?: string;
  /** Body a tutta altezza: scroll solo nel contenuto, footer ancorato in basso (anche su mobile). */
  contentFill?: boolean;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  asideClassName = gestionaleLogPanelAsideClass,
  ariaLabel,
  titleId: titleIdProp,
  lockScroll = true,
  closeOnEscape = true,
  restoreFocusRef,
  titleAddon,
  layerClassName = dsZDrawer,
  contentFill = false,
}: DrawerProps) {
  const asideRef = useRef<HTMLElement>(null);
  const autoTitleId = useRef(`cab-drawer-title-${Math.random().toString(36).slice(2, 9)}`);
  const titleId = titleIdProp ?? autoTitleId.current;
  const maxMdDown = useMaxMdDown();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRegisteredRef = useRef(false);
  const didInitialFocusRef = useRef(false);
  const panelState = closing ? "closing" : "open";
  const isActive = mounted && open && !closing;
  const { restoreFocus } = useDropdownFocusRestore(isActive);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      if (!overlayRegisteredRef.current) {
        overlayRegisteredRef.current = true;
        dispatchGestionaleOverlayOpened();
      }
      return;
    }

    if (overlayRegisteredRef.current) {
      overlayRegisteredRef.current = false;
      dispatchGestionaleOverlayClosed();
    }
  }, [open]);

  useEffect(() => {
    if (!mounted || open) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      restoreGestionaleDrawerFocus({
        trigger: restoreFocusRef?.current ?? null,
        restoreCapturedFocus: restoreFocus,
      });
    }, logDrawerAnimMs());
    return () => window.clearTimeout(id);
  }, [mounted, open, restoreFocus, restoreFocusRef]);

  useBodyScrollLock(lockScroll && mounted && !closing, "design-system-Drawer");
  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useOverlayBackHandler(isActive, requestClose, "design-system-Drawer");
  useMobileModalKeyboard(asideRef);

  useEffect(() => {
    if (!isActive || !closeOnEscape) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (shouldSkipDrawerEscape(e.target)) return;
      requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isActive, closeOnEscape, requestClose]);

  useEffect(() => {
    if (!isActive) {
      didInitialFocusRef.current = false;
      return;
    }
    if (didInitialFocusRef.current) return;
    didInitialFocusRef.current = true;
    const id = window.requestAnimationFrame(() => {
      const btn = asideRef.current?.querySelector('button[aria-label="Chiudi"]');
      if (btn instanceof HTMLButtonElement) btn.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isActive]);

  if (!mounted) return null;

  const headerNode = (
    <header className={dsModalHeader}>
      <div className={dsModalHeaderInner}>
        <div className={dsModalHeaderLead}>
          <div className={`${dsModalTitleBlock} flex min-w-0 items-center gap-2`}>
            <h2 id={titleId} className={`${dsModalTitle} min-w-0 truncate`}>
              {title}
            </h2>
            {titleAddon ? <div className="flex shrink-0 items-center">{titleAddon}</div> : null}
          </div>
        </div>
        <CloseButton onClick={requestClose} className={dsModalCloseBtn} />
      </div>
    </header>
  );

  return (
    <div
      className={`cab-log-drawer-backdrop fixed inset-0 ${layerClassName} flex items-stretch justify-end ${cabIosOverlaySurface} bg-[var(--cab-overlay)] backdrop-blur-[1px]`}
      data-state={panelState}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          requestClose();
        }
      }}
    >
      <aside
        ref={asideRef}
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        className={asideClassName}
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          {...(maxMdDown && !contentFill ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            maxMdDown && !contentFill
              ? `${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} overflow-y-auto`
              : "overflow-hidden"
          }`.trim()}
        >
          {headerNode}
          <div
            className={
              contentFill
                ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                : "flex min-h-0 min-w-0 flex-col max-md:flex-none max-md:overflow-visible md:flex-1 md:overflow-hidden"
            }
          >
            {closing ? null : children}
          </div>
        </div>
      </aside>
    </div>
  );
}
