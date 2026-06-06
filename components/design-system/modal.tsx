"use client";

import { useRef, type ReactNode } from "react";
import {
  cabModalLayerGestionale,
  cabModalScrollKeyboardPad,
} from "@/lib/ui/ios-mobile-tokens";
import {
  dsGestionaleModalBodyStage,
  dsGestionaleModalFrame,
  dsLavorazioniModalDialog,
  dsModalCloseBtn,
  dsModalHeader,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalTitle,
  dsModalTitleBlock,
  dsZModal,
} from "@/lib/ui/design-system";
import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { layoutModalBodySafe } from "@/lib/ui/responsive-layout-core";
import { resolveGestionaleModalWidth, type GestionaleModalWidth } from "@/lib/ui/modal-max-width-class";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";
import { CloseButton } from "@/components/design-system/close-button";
import { useDevModalLayoutLint } from "@/lib/ui-visual-linter/use-visual-layout-linter";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Tier larghezza desktop (default standard). */
  size?: GestionaleModalWidth;
};

export function Modal({ open, onClose, title, children, footer, size = "standard" }: ModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const maxMdDown = useMaxMdDown();
  useBodyScrollLock(open, "design-system-Modal");
  useOverlayBackHandler(open, onClose, "design-system-Modal");
  useMobileModalKeyboard(frameRef);
  useDevModalLayoutLint(open, "ds-modal");

  if (!open) return null;

  const panelWidth = resolveGestionaleModalWidth(size);

  const headerNode = (
    <header className={dsModalHeader}>
      <div className={dsModalHeaderInner}>
        <div className={dsModalHeaderLead}>
          <div className={dsModalTitleBlock}>
            <h2 id="ds-modal-title" className={dsModalTitle}>
              {title}
            </h2>
          </div>
        </div>
        <CloseButton onClick={onClose} className={dsModalCloseBtn} />
      </div>
    </header>
  );

  return (
    <div
      className={`fixed inset-0 ${dsZModal} min-w-0 overflow-x-hidden ${cabModalLayerGestionale}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={frameRef}
        {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
        className={dsGestionaleModalFrame}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-modal-title"
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
          <div
            className={`${dsGestionaleModalBodyStage} max-md:flex-none max-md:overflow-visible md:flex-1`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                onClose();
              }
            }}
          >
            <div
              className={`${dsLavorazioniModalDialog} flex flex-col overflow-hidden p-0 ${panelWidth}`.trim()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                {...(!maxMdDown ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
                className={`${layoutModalBodySafe} ${maxMdDown ? "" : cabModalScrollKeyboardPad} p-4`.trim()}
              >
                {children}
              </div>
              {footer ? (
                <footer className="flex shrink-0 flex-nowrap items-center justify-end gap-2 border-t border-[color:var(--cab-border)] px-4 py-3 sm:flex-wrap">
                  {footer}
                </footer>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
