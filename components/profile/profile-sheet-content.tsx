"use client";

import { ProfileAccountSection } from "@/components/profile/profile-account-section";
import { ProfileActionsSection } from "@/components/profile/profile-actions-section";
import { ProfileContextSection } from "@/components/profile/profile-context-section";
import { ProfileSheetHeader } from "@/components/profile/profile-sheet-header";
import { ProfileVersionFooter } from "@/components/profile/profile-version-footer";
import { gestionaleLogScrollEmbeddedClass } from "@/components/gestionale/gestionale-log-ui";
import type { PublicAuthUser } from "@/src/types/auth-user";

export function ProfileSheetContent({
  user,
  onLogout,
}: {
  user: PublicAuthUser;
  onLogout: () => void;
}) {
  return (
    <div className={`${gestionaleLogScrollEmbeddedClass} flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-3 pb-4 pt-2`}>
      <ProfileSheetHeader user={user} />
      <ProfileAccountSection user={user} />
      <ProfileContextSection user={user} />
      <ProfileActionsSection user={user} onLogout={onLogout} />
      <ProfileVersionFooter />
    </div>
  );
}
