"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { HubIconClose, HubIconSave, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { LoadingButton, type LoadingButtonProps } from "@/components/design-system/loading/loading-button";
import { dsBtnDanger, dsBtnPrimary, dsSchedaHubBtn } from "@/lib/ui/design-system";

const FOOTER_ICON_CLASS = "h-4 w-4 shrink-0";

function joinClasses(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

/** Wrapper footer modale — Elimina / Annulla / Salva allineati a destra. */
export const gestionaleModalFooterActionsWrapClass =
  "flex w-full min-w-0 flex-wrap items-center justify-end gap-2";

/** Wrapper footer con stack mobile (full-width → row desktop). */
export const gestionaleModalFooterActionsStackMobileWrapClass =
  "flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end";

export const gestionaleModalFooterDeleteBtnClass = `${dsBtnDanger} min-h-11`;
export const gestionaleModalFooterCancelBtnClass = `${dsSchedaHubBtn} min-h-11`;
export const gestionaleModalFooterSaveBtnClass = `${dsBtnPrimary} min-h-11`;

export function GestionaleModalFooterActions({
  children,
  className = gestionaleModalFooterActionsWrapClass,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function GestionaleModalFooterDeleteButton({
  children = "Elimina",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={joinClasses(gestionaleModalFooterDeleteBtnClass, className)}
      {...rest}
    >
      <HubIconTrash className={FOOTER_ICON_CLASS} />
      {children}
    </button>
  );
}

export function GestionaleModalFooterCancelButton({
  children = "Annulla",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={joinClasses(gestionaleModalFooterCancelBtnClass, className)}
      {...rest}
    >
      <HubIconClose className={FOOTER_ICON_CLASS} />
      {children}
    </button>
  );
}

export function GestionaleModalFooterSaveButton({
  children = "Salva",
  className,
  preset = "salva",
  loading,
  ...rest
}: Omit<LoadingButtonProps, "children"> & { children?: ReactNode }) {
  return (
    <LoadingButton
      preset={preset}
      loading={loading}
      className={joinClasses(gestionaleModalFooterSaveBtnClass, className)}
      {...rest}
    >
      {!loading ? <HubIconSave className={FOOTER_ICON_CLASS} /> : null}
      {children}
    </LoadingButton>
  );
}
