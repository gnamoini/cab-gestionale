"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SecurityRoleBadge, SecurityStatusBadge } from "@/components/dashboard/security/security-role-badge";
import { SecurityUserPagePermissionsEditor } from "@/components/dashboard/security/security-user-page-permissions-editor";
import type { PagePermissionDraftRow } from "@/lib/security/user-page-permissions";
import { Drawer, LoadingFormSkeleton } from "@/components/design-system";
import type { SecurityUserPermissionRow } from "@/src/actions/security-users-permissions";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { formatSecurityNullableWhen } from "@/lib/security/format-last-sign-in";
import { listSecurityUserActivityAction } from "@/src/actions/security-read";
import { PASSWORD_RESET_ADMIN_GENERIC_MESSAGE } from "@/lib/auth/password-reset";
import {
  sendPasswordResetByAdminAction,
  setUserAccountEnabledByAdminAction,
} from "@/src/actions/admin-users";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { fetchSecurityUsersPermissionsQuery } from "@/src/hooks/use-security-users-permissions-query";
import { dsBtnDanger, dsBtnGhost, dsBtnPrimary, dsPageToolbarBtn } from "@/lib/ui/design-system";

function useUserActivity(userId: string | null, enabled: boolean) {
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: [...QK.log, "security-user-activity", userId],
    enabled: enabled && !!userId,
    ...securityOpts,
    queryFn: async () => {
      if (!userId) return [];
      const res = await listSecurityUserActivityAction(userId);
      if (!res.ok) throw new Error(res.message);
      return res.rows;
    },
  });
}

type Props = {
  user: SecurityUserPermissionRow | null;
  open: boolean;
  readOnly: boolean;
  pageDraft: PagePermissionDraftRow[];
  onPageDraftChange: (rows: PagePermissionDraftRow[]) => void;
  onRestorePageFromRole: () => void;
  onClose: () => void;
};

export function SecurityUserDetailDrawer({
  user,
  open,
  readOnly,
  pageDraft,
  onPageDraftChange,
  onRestorePageFromRole,
  onClose,
}: Props) {
  const activityQ = useUserActivity(user?.id ?? null, open && !!user);
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<"reset" | "toggle" | null>(null);

  const refreshUsers = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: QK.securityUsersPermissions,
      queryFn: fetchSecurityUsersPermissionsQuery,
    });
  }, [queryClient]);

  const handleResetPassword = useCallback(async () => {
    if (!user || readOnly) return;
    const ok = await confirm({
      title: "Invia reset password",
      message: "Inviare un'email di reset password a questo utente?",
      confirmLabel: "Invia",
    });
    if (!ok) return;
    setPendingAction("reset");
    try {
      const res = await sendPasswordResetByAdminAction(user.id);
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      gestToast.successOnce("security-reset-pwd", PASSWORD_RESET_ADMIN_GENERIC_MESSAGE);
    } finally {
      setPendingAction(null);
    }
  }, [confirm, gestToast, readOnly, user]);

  const handleToggleAccount = useCallback(async () => {
    if (!user || readOnly) return;
    const enabling = !user.accountEnabled;
    const ok = await confirm({
      title: enabling ? "Riattiva account" : "Disattiva account",
      message: enabling
        ? "L'utente potrà di nuovo accedere al gestionale."
        : "L'utente non potrà più accedere finché non verrà riattivato.",
      confirmLabel: enabling ? "Riattiva" : "Disattiva",
    });
    if (!ok) return;
    setPendingAction("toggle");
    try {
      const res = await setUserAccountEnabledByAdminAction({ userId: user.id, enabled: enabling });
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      gestToast.successDone();
      await refreshUsers();
    } finally {
      setPendingAction(null);
    }
  }, [confirm, gestToast, readOnly, refreshUsers, user]);

  return (
    <>
      <Drawer open={open && !!user} onClose={onClose} title="Scheda utente" ariaLabel="Scheda utente">
        {!user ? null : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3">
            <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[color:var(--cab-text)]">{user.nome}</h3>
                  <p className="mt-0.5 truncate text-xs text-[color:var(--cab-text-muted)]">
                    {user.email || "Email non disponibile"}
                  </p>
                </div>
                <SecurityRoleBadge role={user.ruolo} />
              </div>
              <dl className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-[color:var(--cab-text-muted)]">Stato account</dt>
                  <dd>
                    <SecurityStatusBadge
                      lastSignInAt={user.lastSignInAt}
                      accountEnabled={user.accountEnabled}
                      align="end"
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[color:var(--cab-text-muted)]">Creato</dt>
                  <dd className="text-right tabular-nums text-[color:var(--cab-text)]">
                    {formatSecurityNullableWhen(user.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[color:var(--cab-text-muted)]">Ultimo accesso</dt>
                  <dd className="text-right tabular-nums text-[color:var(--cab-text)]">
                    {formatSecurityNullableWhen(user.lastSignInAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[color:var(--cab-text-muted)]">Id profilo</dt>
                  <dd className="max-w-[12rem] truncate text-right font-mono text-[10px] text-[color:var(--cab-text)]">
                    {user.id}
                  </dd>
                </div>
              </dl>
              {!readOnly ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={dsPageToolbarBtn}
                    disabled={pendingAction != null || !user.email}
                    onClick={() => void handleResetPassword()}
                  >
                    {pendingAction === "reset" ? "Invio…" : "Invia reset password"}
                  </button>
                  <button
                    type="button"
                    className={user.accountEnabled ? dsBtnDanger : dsBtnPrimary}
                    disabled={pendingAction != null}
                    onClick={() => void handleToggleAccount()}
                  >
                    {pendingAction === "toggle"
                      ? "…"
                      : user.accountEnabled
                        ? "Disattiva account"
                        : "Riattiva account"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Permessi pagine</h3>
              <div className="mt-2">
                <SecurityUserPagePermissionsEditor
                  ruolo={user.ruolo}
                  readOnly={readOnly || !user.accountEnabled}
                  draft={pageDraft}
                  onDraftChange={onPageDraftChange}
                  onRestoreFromRole={onRestorePageFromRole}
                />
              </div>
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
              <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
                <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Attività recenti (utente)</h3>
              </div>
              <div className="gestionale-scrollbar max-h-[min(28dvh,20rem)] overflow-y-auto">
                {activityQ.isLoading ? (
                  <div className="p-3" aria-busy="true" role="status" aria-label="Caricamento attività">
                    <LoadingFormSkeleton fields={4} />
                  </div>
                ) : activityQ.isError ? (
                  <p className="p-3 text-sm text-[color:var(--cab-danger)]">{activityQ.error.message}</p>
                ) : (activityQ.data ?? []).length === 0 ? (
                  <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessuna attività recente.</p>
                ) : (
                  <ul className="divide-y divide-[color:var(--cab-border)]">
                    {(activityQ.data ?? []).map((row) => (
                      <li key={row.id} className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[color:var(--cab-text)]">{row.action}</span>
                          <span className="tabular-nums text-[color:var(--cab-text-muted)]">
                            {formatSecurityNullableWhen(row.when)}
                          </span>
                        </div>
                        <p className="mt-1 text-[color:var(--cab-text-muted)]">
                          {row.entita} · {row.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
      {confirmDialog}
    </>
  );
}
