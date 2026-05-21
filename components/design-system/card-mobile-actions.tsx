"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { dsCardMobileActionsGroup, dsCardMobileShell } from "@/lib/ui/design-system";

export { dsCardMobileShell };

/** Card stack mobile (liste che diventano card sotto `md`). */
export function CardMobile({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`${dsCardMobileShell} ${className}`.trim()}>
      {children}
    </div>
  );
}

/**
 * Footer azioni card mobile: sempre in fondo, allineato a destra, wrap se necessario.
 * Usare solo in layout `md:hidden` / card stack; su desktop mantenere colonna azioni tabella.
 */
export function CardMobileActions({
  children,
  className = "",
  spacing = "default",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  /** `default` = mt-4 (card); `tight` = mt-2 (liste compatte). */
  spacing?: "default" | "tight";
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  /** Padding (non margin): `mt-auto` altrimenti azzera il gap quando la card non è alta. */
  const padTop = spacing === "tight" ? "pt-2" : "pt-5";
  return (
    <div
      className={`${padTop} mt-auto flex w-full min-w-0 shrink-0 justify-end ${className}`.trim()}
      role="group"
      aria-label="Azioni"
      onClick={onClick}
    >
      <div className={dsCardMobileActionsGroup}>{children}</div>
    </div>
  );
}
