"use client";

import { useCallback, useState, type RefObject } from "react";
import { Drawer } from "@/components/design-system";
import {
  gestionaleLogDrawerPanelStackClass,
  gestionaleLogPanelAsideClass,
} from "@/components/gestionale/gestionale-log-ui";
import { GestionaleConfirmDialogLazy } from "@/components/gestionale/gestionale-confirm-dialog-lazy";
import { ProfileSheetContent } from "@/components/profile/profile-sheet-content";
import { useProfileSheet } from "@/components/profile/profile-sheet-context";
import { useAuth } from "@/context/auth-context";
import { useShowGlobalLoading } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

const PROFILE_SHEET_TITLE_ID = "cab-profile-sheet-title";

export function ProfileSheet({ restoreFocusRef }: { restoreFocusRef?: RefObject<HTMLElement | null> }) {
  const { open, closeProfileSheet } = useProfileSheet();
  const { user, logout, status } = useAuth();
  const showGlobalLoading = useShowGlobalLoading();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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

  return (
    <>
      <Drawer
        open={open}
        onClose={closeProfileSheet}
        title="Profilo"
        titleId={PROFILE_SHEET_TITLE_ID}
        ariaLabel="Profilo utente"
        asideClassName={gestionaleLogPanelAsideClass}
        restoreFocusRef={restoreFocusRef}
      >
        <div
          data-testid="profile-sheet"
          className={`${gestionaleLogDrawerPanelStackClass} min-h-0 min-w-0`}
        >
          <ProfileSheetContent user={user} onLogout={requestLogout} />
        </div>
      </Drawer>

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
