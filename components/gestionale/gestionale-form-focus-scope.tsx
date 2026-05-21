"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { gestionaleAdvanceFocusOnEnter } from "@/lib/ui/gestionale-focus-navigation";

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
} {
  return {
    "data-gestionale-focus-scope": true,
    onKeyDown: onScopeKeyDown,
  };
}
