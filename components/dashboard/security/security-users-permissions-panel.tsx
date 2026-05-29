"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityCreateUserModal } from "@/components/dashboard/security-create-user-modal";
import {
  SecurityUsersTable,
  buildSecurityUserPatches,
  rowsSnapshot,
  type EditableSecurityUser,
} from "@/components/dashboard/security/security-users-table";
import { batchUpdateSecurityUsersAction } from "@/src/actions/security-users-permissions";
import {
  fetchSecurityUsersPermissionsQuery,
  useSecurityUsersPermissionsQuery,
} from "@/src/hooks/use-security-users-permissions-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import {
  dsBtnGhost,
  dsBtnNeutral,
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsStickyToolbar,
} from "@/lib/ui/design-system";

type Props = {
  readOnly?: boolean;
  onOpenDetail: (userId: string) => void;
};

export function SecurityUsersPermissionsPanel({ readOnly = false, onOpenDetail }: Props) {
  const { refresh, user: sessionUser } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<EditableSecurityUser[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydratedRef = useRef(false);

  const usersQ = useSecurityUsersPermissionsQuery(true);
  const serverUsers = usersQ.users;

  useEffect(() => {
    if (!usersQ.isSuccess || hydratedRef.current) return;
    setDraftRows(serverUsers);
    setSavedSnapshot(rowsSnapshot(serverUsers));
    hydratedRef.current = true;
  }, [usersQ.isSuccess, serverUsers]);

  const syncFromServer = useCallback((users: EditableSecurityUser[]) => {
    setDraftRows(users);
    setSavedSnapshot(rowsSnapshot(users));
  }, []);

  const isDirty = useMemo(() => {
    if (!hydratedRef.current || savedSnapshot == null) return false;
    return rowsSnapshot(draftRows) !== savedSnapshot;
  }, [draftRows, savedSnapshot]);

  const handleCancel = useCallback(() => {
    syncFromServer(serverUsers);
  }, [serverUsers, syncFromServer]);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    const patches = buildSecurityUserPatches(serverUsers, draftRows);
    if (!patches.length) {
      setSavedSnapshot(rowsSnapshot(draftRows));
      return;
    }

    setSaving(true);
    try {
      const res = await batchUpdateSecurityUsersAction(patches);
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      await invalidateRuntimeTruth({
        reason: "roleOrPermissionsChanged",
        queryClient,
      });
      const fresh = await queryClient.fetchQuery({
        queryKey: QK.securityUsersPermissions,
        queryFn: fetchSecurityUsersPermissionsQuery,
      });
      syncFromServer(fresh.users);
      if (patches.some((p) => p.userId === sessionUser?.id)) {
        await refresh();
      }
      gestToast.successOnce("security-users-save", GESTIONALE_TOAST.successSaved);
    } finally {
      setSaving(false);
    }
  }, [serverUsers, draftRows, isDirty, gestToast, queryClient, refresh, sessionUser?.id, syncFromServer]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleRefetch = useCallback(() => {
    void (async () => {
      if (isDirty) {
        const ok = await confirm({
          title: "Modifiche non salvate",
          message: "Ci sono modifiche non salvate. Ricaricare comunque?",
          confirmLabel: "Ricarica",
        });
        if (!ok) return;
      }
      const res = await usersQ.refetch();
      if (res.data?.users) syncFromServer(res.data.users);
    })();
  }, [confirm, isDirty, usersQ, syncFromServer]);

  return (
    <ShellCard title="Gestione Utenti e Permessi">
      <div className={`${dsStickyToolbar} -mx-1 mb-4 sm:mx-0`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <button type="button" className={dsBtnPrimary} onClick={() => setCreateOpen(true)}>
                Nuovo utente
              </button>
            ) : null}
            <button type="button" className={dsPageToolbarBtn} onClick={handleRefetch} disabled={usersQ.isFetching}>
              {usersQ.isFetching ? "Aggiornamento…" : "Aggiorna"}
            </button>
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              {isDirty ? (
                <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))]">
                  Modifiche non salvate
                </span>
              ) : null}
              <button type="button" className={dsBtnGhost} onClick={handleCancel} disabled={!isDirty || saving}>
                Annulla modifiche
              </button>
              <button type="button" className={dsBtnNeutral} onClick={() => void handleSave()} disabled={!isDirty || saving}>
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {usersQ.isError ? (
        <div className="mb-4 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] px-3 py-2.5">
          <p className="text-sm text-[color:var(--cab-danger)]">
            {usersQ.error instanceof Error ? usersQ.error.message : "Errore caricamento utenti."}
          </p>
          <button type="button" className={`${dsPageToolbarBtn} mt-2`} onClick={() => void usersQ.refetch()}>
            Riprova
          </button>
        </div>
      ) : null}

      <SecurityUsersTable
        rows={usersQ.isError ? [] : draftRows}
        loading={usersQ.isLoading}
        readOnly={readOnly}
        onRowsChange={setDraftRows}
        onOpenDetail={onOpenDetail}
      />

      <SecurityCreateUserModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          hydratedRef.current = false;
          void invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient });
        }}
      />
      {confirmDialog}
    </ShellCard>
  );
}
