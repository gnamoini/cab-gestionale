"use client";

import type { FocusEvent, FormEvent, KeyboardEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import { IOS_SUBMIT_GUARD_TARGET_ATTR } from "@/lib/forms/form-engine/ios-submit-guard";
import { gestionaleAdvanceFocusOnEnter } from "@/lib/ui/gestionale-focus-navigation";

/** Props SSOT per textarea multiriga: Enter inserisce newline, non avanza il focus. */
export const gestionaleMultilineEnterProps = { "data-gestionale-enter": "ignore" } as const;

export type GestionaleFormFocusScopeProps = {
  children: ReactNode;
  className?: string;
  /** Attributo scope per delimitare l'ordine tab (default: div). */
  as?: "div" | "form" | "section";
};

/**
 * Abilita ENTER → focus sul campo successivo per input/textarea nativi nel subtree.
 * I combobox globali (`GlobalSelect`, ricerca con suggerimenti) gestiscono ENTER autonomamente.
 */
function onScopeKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented) return;
  gestionaleAdvanceFocusOnEnter(e);
}

/** Capture: drain batch React; combobox flush centralizzato in prepareFormSubmitAsync post-guard. */
function onScopeSubmitCapture() {
  flushSync(() => {});
}

/** Traccia ultimo input testuale nel form per iosSubmitGuard quando Salva sposta il focus (iOS). */
function onScopeFocusCapture(e: FocusEvent<HTMLElement>) {
  const target = e.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  const scope = e.currentTarget;
  scope.querySelectorAll(`[${IOS_SUBMIT_GUARD_TARGET_ATTR}]`).forEach((el) => {
    el.removeAttribute(IOS_SUBMIT_GUARD_TARGET_ATTR);
  });
  target.setAttribute(IOS_SUBMIT_GUARD_TARGET_ATTR, "true");
}

export function GestionaleFormFocusScope({
  children,
  className = "",
  as: Tag = "div",
}: GestionaleFormFocusScopeProps) {
  return (
    <Tag className={className} data-gestionale-focus-scope onKeyDown={onScopeKeyDown}>
      {children}
    </Tag>
  );
}

/** Props da spalmare su `<form>` esistenti (modali, wizard). */
export function gestionaleFormFocusScopeProps(): {
  "data-gestionale-focus-scope": true;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onFocusCapture: (e: FocusEvent<HTMLElement>) => void;
  onSubmitCapture: (e: FormEvent<HTMLFormElement>) => void;
} {
  return {
    "data-gestionale-focus-scope": true,
    onKeyDown: onScopeKeyDown,
    onFocusCapture: onScopeFocusCapture,
    onSubmitCapture: onScopeSubmitCapture,
  };
}
