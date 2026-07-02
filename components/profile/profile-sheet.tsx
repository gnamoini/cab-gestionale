"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { Drawer } from "@/components/design-system";
import { gestionaleLogPanelAsideClass } from "@/components/gestionale/gestionale-log-ui";
import { GestionaleMobileBottomSheet } from "@/components/gestionale/gestionale-mobile-bottom-sheet";
import { GestionaleConfirmDialogLazy } from "@/components/gestionale/gestionale-confirm-dialog-lazy";
import { ProfileSheetContent } from "@/components/profile/profile-sheet-content";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { useAuth } from "@/context/auth-context";
import { useShowGlobalLoading } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import {
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";

const PROFILE_SHEET_TITLE_ID = "cab-profile-sheet-title";

export function ProfileSheet({ restoreFocusRef }: { restoreFocusRef?: RefObject<HTMLElement | null> }) {
  const { open, closeProfileSheet } = useProfileSheet();
  const { user, logout, status } = useAuth();
  const maxMdDown = useMaxMdDown();
  const showGlobalLoading = useShowGlobalLoading();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const panelRef = useGestionaleOverlayBehavior({
    open: maxMdDown && open,
    onRequestClose: closeProfileSheet,
    source: "ProfileSheet",
  });
  const sheetScrollRef = useRef<HTMLDivElement>(null);

  const requestLogout = useCallback(() => {
    closeProfileSheet();
    setLogoutConfirmOpen(true);
  }, [closeProfileSheet]);

  async function confirmLogout() {
    setLogoutConfirmOpen(false);
    showGlobalLoading(GLOBAL_LOADING_MESSAGES.logout);
    await logout();
    window.location.assign("/login");
  }

  if (!user || status === "loading") return null;

  const content = <ProfileSheetContent user={user} onLogout={requestLogout} />;

  return (
    <>
      {maxMdDown ? (
        <GestionaleMobileBottomSheet
          open={open}
          onRequestClose={closeProfileSheet}
          title="Profilo"
          titleId={PROFILE_SHEET_TITLE_ID}
          panelRef={panelRef}
          restoreFocusRef={restoreFocusRef}
          className="md:hidden"
        >
          <div
            ref={sheetScrollRef}
            data-testid="profile-sheet"
            {...{ [CAB_MODAL_SCROLL_ATTR]: "" }}
            className={`min-w-0 flex-1 overflow-y-auto ${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad}`}
          >
            {content}
          </div>
        </GestionaleMobileBottomSheet>
      ) : (
        <Drawer
          open={open}
          onClose={closeProfileSheet}
          title="Profilo"
          titleId={PROFILE_SHEET_TITLE_ID}
          ariaLabel="Profilo utente"
          asideClassName={gestionaleLogPanelAsideClass}
          restoreFocusRef={restoreFocusRef}
        >
          <div data-testid="profile-sheet">{content}</div>
        </Drawer>
      )}

      {logoutConfirmOpen ? (
        <GestionaleConfirmDialogLazy
          open={logoutConfirmOpen}
          title="Uscire dall'account?"
          message="Verrai disconnesso da questa sessione. Dovrai accedere di nuovo per continuare."
          confirmLabel="Esci"
          cancelLabel="Annulla"
          destructive
          confirmTestId="smoke-logout-confirm"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => void confirmLogout()}
        />
      ) : null}
    </>
  );
}
