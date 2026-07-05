"use client";

import type { PointerEvent } from "react";
import { AccountMenu } from "@/components/gestionale/account-menu";
import { NotificationCenterMount } from "@/components/gestionale/notification-center-mount";

type SidebarSessionPanelProps = {
  variant: "sidebar" | "drawer";
  /** In cima sotto il logo (sidebar/drawer) o in fondo al nav (legacy drawer). */
  placement?: "brand" | "footer";
  sidebarCollapsed?: boolean;
  /** Espansione sidebar su hover intent (voci sessione). */
  onSidebarExpandIntent?: () => void;
  /** Chiude il drawer nav mobile quando si apre l'inbox notifiche. */
  onOpenInbox?: () => void;
};

/** Blocco unificato sessione: profilo utente + notifiche (sidebar e drawer mobile). */
export function SidebarSessionPanel({
  variant,
  placement = "brand",
  sidebarCollapsed = false,
  onSidebarExpandIntent,
  onOpenInbox,
}: SidebarSessionPanelProps) {
  const sectionClass =
    placement === "brand"
      ? "cab-sidebar-session cab-sidebar-session--brand shrink-0"
      : "cab-sidebar-session shrink-0 border-t border-[color:var(--cab-border)] pt-2 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]";

  const pointerIntentProps =
    variant === "sidebar" && sidebarCollapsed && onSidebarExpandIntent
      ? {
          onPointerEnter: (event: PointerEvent<HTMLElement>) => {
            if (event.target instanceof Element && event.target.closest(".cab-sidebar-nav-row")) {
              onSidebarExpandIntent();
            }
          },
        }
      : {};

  return (
    <section className={sectionClass} aria-label="Sessione utente" {...pointerIntentProps}>
      <div className="flex flex-col gap-1">
        <AccountMenu
          variant={variant}
          sidebarCollapsed={sidebarCollapsed}
          onExpandIntent={onSidebarExpandIntent}
          onOpenProfile={variant === "drawer" ? undefined : onOpenInbox}
        />
        <NotificationCenterMount
          embedded
          layerAboveNav={variant === "drawer"}
          sidebarCollapsed={sidebarCollapsed}
          onExpandIntent={onSidebarExpandIntent}
          onOpenInbox={variant === "drawer" ? undefined : onOpenInbox}
        />
      </div>
    </section>
  );
}
