"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/design-system/close-button";
import { ShellNavBackButton } from "@/components/design-system/shell-nav-icon-button";
import { useGestionaleModalDialogFocus } from "@/components/gestionale/gestionale-modal-focus";
import { useDevModalLayoutLint } from "@/lib/ui-visual-linter/use-visual-layout-linter";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import {
  dsLavorazioniModalLayer,
  dsLavorazioniModalWindowHeader,
  dsModalCloseBtn,
  dsModalFormFooter,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalSubtitle,
  dsModalSubtitleHub,
  dsModalTitle,
  dsModalTitleBlock,
} from "@/lib/ui/design-system";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import {
  resolveShellModalLayout,
  type GestionaleModalWidth,
  type ModalHeight,
  type ModalSize,
} from "@/lib/ui/modal-max-width-class";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { flexShrinkSafe } from "@/lib/ui/global-flex-system";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";
import {
  OverlayLayerPriority,
  type BeforeBackHandler,
  type OverlayCloseContext,
} from "@/lib/ui/overlay-back-stack";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import {
  createModalBackdropDismissState,
  onModalBackdropPointerDown,
  onModalBackdropPointerUp,
  onModalDialogPointerDown,
  resetModalBackdropDismissState,
} from "@/lib/ui/modal-backdrop-dismiss";

const GESTIONALE_MODAL_TITLE_ID = "gestionale-modal-title";

export function GestionaleModalHeader({
  title,
  subtitle,
  onRequestClose,
  onBack,
  titleId = GESTIONALE_MODAL_TITLE_ID,
  actions,
  belowTitle,
}: {
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  onBack?: () => void;
  titleId?: string;
  actions?: ReactNode;
  belowTitle?: ReactNode;
}) {
  const stacked = Boolean(belowTitle);
  const hubToolbar = Boolean(actions && subtitle && !stacked);

  if (hubToolbar) {
    return (
      <header className={dsLavorazioniModalWindowHeader}>
        <div className="flex w-full min-w-0 items-start justify-between gap-x-3 gap-y-2 flex-nowrap sm:flex-wrap">
          <div className={`${dsModalHeaderLead} min-w-0 basis-[min(100%,12rem)]`}>
            {onBack ? <ShellNavBackButton onClick={onBack} showOnFocus={false} /> : null}
            <div className={dsModalTitleBlock}>
              <h2 id={titleId} className={dsModalTitle}>
                {title}
              </h2>
              <p className={dsModalSubtitleHub}>{subtitle}</p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
            {actions}
            <CloseButton onClick={onRequestClose} className={dsModalCloseBtn} showOnFocus={false} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={dsLavorazioniModalWindowHeader}>
      <div className={`${dsModalHeaderInner}${stacked ? " items-start sm:items-center" : ""}`}>
        <div className={`${dsModalHeaderInner}${stacked ? " flex-col items-stretch sm:flex-row sm:items-center" : ""}`}>
          {onBack ? <ShellNavBackButton onClick={onBack} showOnFocus={false} /> : null}
          <div className={dsModalTitleBlock}>
            <h2 id={titleId} className={dsModalTitle}>
              {title}
            </h2>
            {subtitle ? <p className={dsModalSubtitle}>{subtitle}</p> : null}
            {belowTitle}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex-wrap">{actions}</div> : null}
        <CloseButton onClick={onRequestClose} className={dsModalCloseBtn} showOnFocus={false} />
      </div>
    </header>
  );
}

/** @deprecated Preferire `GestionaleModalShell` con `title` / `header`. */
export function GestionaleModalTitleBar({
  title,
  titleId,
  onRequestClose,
  children,
}: {
  title?: string;
  titleId?: string;
  onRequestClose: () => void;
  children?: ReactNode;
}) {
  if (!title) return null;
  return (
    <GestionaleModalHeader
      title={title}
      titleId={titleId}
      onRequestClose={onRequestClose}
      belowTitle={children}
    />
  );
}

export type GestionaleModalDialogSize = "hub" | "compact";

/** Chiusura: backdrop (pointerdown→pointerup), ESC, X in header; scroll lock condiviso. */
export function GestionaleModalShell({
  children,
  modalSize,
  modalHeight,
  dialogSize = "hub",
  alignTop,
  layerClassName,
  onRequestClose,
  title,
  subtitle,
  onBack,
  beforeBack,
  header,
  actions,
  titleId,
  footer,
  modalRootRef,
}: {
  children: ReactNode;
  modalSize?: ModalSize;
  modalHeight?: ModalHeight;
  size?: GestionaleModalWidth;
  dialogSize?: GestionaleModalDialogSize;
  alignTop?: boolean;
  layerClassName?: string;
  onRequestClose: (ctx?: OverlayCloseContext) => void;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  beforeBack?: BeforeBackHandler;
  header?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  footer?: ReactNode;
  modalRootRef?: React.RefObject<HTMLDivElement | null>;
}) {
  useBodyScrollLock(true, "GestionaleModalShell");
  useOverlayBackHandler(
    true,
    (ctx) => {
      if (onBack) onBack();
      else onRequestClose(ctx);
    },
    "GestionaleModalShell",
    {
      layer: "modal",
      priority: OverlayLayerPriority.modal,
      beforeBack,
    },
  );
  useDevModalLayoutLint(true, "gestionale-modal-shell");
  const dialogFocus = useGestionaleModalDialogFocus();
  useMobileModalKeyboard(dialogFocus.ref);
  const maxMdDown = useMaxMdDown();
  // eslint-disable-next-line react-hooks/purity -- lint phase2: preserve existing hook contract
  const modalOpenStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const backdropDismissRef = useRef(createModalBackdropDismissState());

  useEffect(() => {
    function onWindowPointerUp() {
      resetModalBackdropDismissState(backdropDismissRef.current);
    }
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, []);

  useLayoutEffect(() => {
    const durationMs = Math.round(performance.now() - modalOpenStartRef.current);
    recordHealthMetric("modalOpenMs", durationMs);
  }, []);

  const labelledBy = title ? (titleId ?? GESTIONALE_MODAL_TITLE_ID) : titleId;
  const { widthClass: dialogMaxWidth, surfaceClass: dialogSurfaceClass } = resolveShellModalLayout({
    modalSize,
    modalHeight,
    legacyDialogSize: modalSize == null && modalHeight == null ? dialogSize : undefined,
  });
  const headerNode =
    header ??
    (title ? (
      <GestionaleModalHeader
        title={title}
        subtitle={subtitle}
        onRequestClose={onRequestClose}
        onBack={onBack}
        titleId={labelledBy}
        actions={actions}
      />
    ) : null);

  useEffect(() => {
    function hasVisibleOpenDropdown(): boolean {
      if (document.querySelector('input[role="combobox"][aria-expanded="true"]')) return true;
      for (const el of document.querySelectorAll('[role="listbox"]')) {
        if (el instanceof HTMLElement && el.offsetParent !== null) return true;
      }
      return false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (hasVisibleOpenDropdown()) return;
      onRequestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  return typeof document === "undefined"
    ? null
    : createPortal(
        <div
          className={`${dsLavorazioniModalLayer} ${layerClassName ?? ""}`}
          role="presentation"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              onModalBackdropPointerDown(backdropDismissRef.current, e.target, e.currentTarget);
            }
          }}
          onPointerUp={(e) => {
            if (
              onModalBackdropPointerUp(backdropDismissRef.current, e.target, e.currentTarget)
            ) {
              e.preventDefault();
              onRequestClose();
            }
          }}
          onPointerCancel={(e) => {
            if (e.target === e.currentTarget) {
              resetModalBackdropDismissState(backdropDismissRef.current);
            }
          }}
        >
          <div
  // eslint-disable-next-line react-hooks/immutability -- lint phase2: preserve existing hook contract
            ref={(el) => {
  // eslint-disable-next-line react-hooks/immutability -- lint phase2: preserve existing hook contract
              dialogFocus.ref.current = el;
              if (modalRootRef) modalRootRef.current = el;
            }}
            {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
            className={`${dialogSurfaceClass} ${flexShrinkSafe} flex-safe-col touch-auto cursor-default outline-none focus:outline-none ${dialogMaxWidth} ${alignTop ? "md:mt-3 md:self-start" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onKeyDown={dialogFocus.onKeyDown}
            onPointerDown={(e) => {
              e.stopPropagation();
              onModalDialogPointerDown(backdropDismissRef.current);
            }}
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
            {footer ? (
              <footer
                className={`${dsModalFormFooter} max-md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]`}
              >
                {footer}
              </footer>
            ) : null}
          </div>
        </div>,
        document.body,
      );
}

/** Compat lavorazioni — alias storici. */
export const LavorazioniModalShell = GestionaleModalShell;
export const LavorazioniModalHeader = GestionaleModalHeader;
export const LavorazioniModalTitleBar = GestionaleModalTitleBar;
export type LavorazioniModalDialogSize = GestionaleModalDialogSize;
