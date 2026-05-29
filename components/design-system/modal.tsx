"use client";

import type { ReactNode } from "react";
import { dsModalBackdrop, dsModalPanel, dsZModal } from "@/lib/ui/design-system";
import { resolveModalMaxWidthClass } from "@/lib/ui/modal-max-width-class";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { CloseButton } from "@/components/design-system/close-button";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Larghezza pannello desktop (default max-w-lg). */
  panelClassName?: string;
};

export function Modal({ open, onClose, title, children, footer, panelClassName = "" }: ModalProps) {
  useBodyScrollLock(open, "design-system-Modal");

  if (!open) return null;

  const panelWidth = resolveModalMaxWidthClass(panelClassName.trim() || "max-w-lg");

  return (
    <div
      className={`${dsModalBackdrop} ${dsZModal}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`${dsModalPanel} flex flex-col overflow-hidden p-0 ${panelWidth}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--cab-border)] px-4 py-3">
          <h2 id="ds-modal-title" className="text-sm font-semibold text-[color:var(--cab-text)]">
            {title}
          </h2>
          <CloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 gestionale-scrollbar">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[color:var(--cab-border)] px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
