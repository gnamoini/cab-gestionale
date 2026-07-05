"use client";

import { ProfileAccountSection } from "@/components/profile/profile-account-section";
import { ProfileActionsSection } from "@/components/profile/profile-actions-section";
import { ProfileContextSection } from "@/components/profile/profile-context-section";
import { ProfileSheetHeader } from "@/components/profile/profile-sheet-header";
import type { PublicAuthUser } from "@/src/types/auth-user";

/** Scroll profilo: auto (no gutter fisso, no frecce track vuoto). */
const profileSheetScrollClass =
  "cab-profile-sheet-scroll gestionale-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain flex flex-col gap-4 px-3 pb-4 pt-2";

export function ProfileSheetContent({
  user,
  onLogout,
}: {
  user: PublicAuthUser;
  onLogout: () => void;
}) {
  return (
    <div className={profileSheetScrollClass}>
      <ProfileSheetHeader user={user} />
      <ProfileAccountSection user={user} />
      <ProfileContextSection user={user} />
      <ProfileActionsSection user={user} onLogout={onLogout} />
    </div>
  );
}
