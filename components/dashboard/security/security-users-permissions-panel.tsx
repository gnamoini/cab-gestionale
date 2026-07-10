"use client";

import { Tooltip } from "@/components/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupMetaRow,
  ToolbarGroupPrimaryRow,
} from "@/components/design-system";
import { GestionaleRefreshToolbarButton } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityCreateUserModal } from "@/components/dashboard/security-create-user-modal";
import { SecurityUserDetailDrawer } from "@/components/dashboard/security/security-user-detail-drawer";
import {
  buildInitialPageDraft,
  SecurityUserPagePermissionsEditor,
} from "@/components/dashboard/security/security-user-page-permissions-editor";
import { SecurityClienteAuditPanel } from "@/components/dashboard/security/security-cliente-audit-panel";
import {
  SecurityUsersTable,
  buildSecurityUserPatches,
  rowClienteAssociationError,
  rowsSnapshot,
  type EditableSecurityUser,
} from "@/components/dashboard/security/security-users-table";
import { batchUpdateSecurityUsersAction } from "@/src/actions/security-users-permissions";
import {
  fetchSecurityUsersPermissionsQuery,
  useSecurityUsersPermissionsQuery,
} from "@/src/hooks/use-security-users-permissions-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { onUserRoleChangedClient } from "@/src/lib/rbac/on-user-role-changed.client";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import {
  computePagePermissionDraft,
  snapshotPageDraft,
  type PagePermissionDraftRow,
} from "@/lib/security/user-page-permissions";
import { buildKnownClientiSet, validateClienteAssociationForRole } from "@/src/lib/auth/cliente-portal-scope";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { resolveRole, type AppRole } from "@/lib/auth/rbac";
import {
  SecurityInlineNotice,
  securitySubsectionShellClass,
} from "@/components/dashboard/security/security-inline-notice";
import {
  dsBtnGhost,
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  dsPageToolbarMetaChipAccent,
  dsSectionTitle,
} from "@/lib/ui/design-system";

type Props = {
  readOnly?: boolean;
  /** Query condivisa dal parent (evita doppio hook sulla tab Utenti). */
  sharedUsersQ?: ReturnType<typeof useSecurityUsersPermissionsQuery>;
};

function buildPageSnapshots(
  users: EditableSecurityUser[],
  userPageOverrideRows: { user_id: string; page_key: string; access_level: import("@/src/lib/permissions/gestionale-pages").PageAccessLevel }[],
  rolePageAccessByRole: Record<string, Record<string, import("@/src/lib/permissions/gestionale-pages").PageAccessLevel>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const u of users) {
    const roleKey = resolveRole(u.ruolo);
    const draft = computePagePermissionDraft(
      roleKey,
      rolePageAccessByRole[roleKey] ?? {},
      u.id,
      userPageOverrideRows,
    );
    out[u.id] = snapshotPageDraft(draft);
  }
  return out;
}

function buildPageDrafts(
  users: EditableSecurityUser[],
  userPageOverrideRows: { user_id: string; page_key: string; access_level: import("@/src/lib/permissions/gestionale-pages").PageAccessLevel }[],
  rolePageAccessByRole: Record<string, Record<string, import("@/src/lib/permissions/gestionale-pages").PageAccessLevel>>,
): Record<string, PagePermissionDraftRow[]> {
  const out: Record<string, PagePermissionDraftRow[]> = {};
  for (const u of users) {
    const roleKey = resolveRole(u.ruolo);
    out[u.id] = buildInitialPageDraft(roleKey, rolePageAccessByRole[roleKey] ?? {}, u.id, userPageOverrideRows);
  }
  return out;
}

export function SecurityUsersPermissionsPanel({ readOnly = false, sharedUsersQ }: Props) {
  const { refresh, user: sessionUser } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<EditableSecurityUser[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [pageDrafts, setPageDrafts] = useState<Record<string, PagePermissionDraftRow[]>>({});
  const [savedPageSnapshots, setSavedPageSnapshots] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const hydratedRef = useRef(false);

  const internalUsersQ = useSecurityUsersPermissionsQuery(!sharedUsersQ);
  const usersQ = sharedUsersQ ?? internalUsersQ;
  const serverUsers = usersQ.users;
  const userPageOverrideRows = usersQ.userPageOverrideRows;
  const rolePageAccessByRole = usersQ.rolePageAccessByRole;
  const globalOpts = useGlobalOptions({ debugTag: "SecurityUsersPermissions" });
  const knownClienti = useMemo(
    () => buildKnownClientiSet(globalOpts.mezziListe.clienti ?? []),
    [globalOpts.mezziListe.clienti],
  );

  useEffect(() => {
    if (!usersQ.isSuccess || hydratedRef.current) return;
    setDraftRows(serverUsers);
    setSavedSnapshot(rowsSnapshot(serverUsers));
    setPageDrafts(buildPageDrafts(serverUsers, userPageOverrideRows, rolePageAccessByRole));
    setSavedPageSnapshots(buildPageSnapshots(serverUsers, userPageOverrideRows, rolePageAccessByRole));
    hydratedRef.current = true;
  }, [usersQ.isSuccess, serverUsers, userPageOverrideRows, rolePageAccessByRole]);

  const syncFromServer = useCallback(
    (
      users: EditableSecurityUser[],
      overrides: typeof userPageOverrideRows,
      roleAccess: typeof rolePageAccessByRole,
    ) => {
      setDraftRows(users);
      setSavedSnapshot(rowsSnapshot(users));
      setPageDrafts(buildPageDrafts(users, overrides, roleAccess));
      setSavedPageSnapshots(buildPageSnapshots(users, overrides, roleAccess));
    },
    [],
  );

  const isTableDirty = useMemo(() => {
    if (!hydratedRef.current || savedSnapshot == null) return false;
    return rowsSnapshot(draftRows) !== savedSnapshot;
  }, [draftRows, savedSnapshot]);

  const isPageDirty = useMemo(() => {
    if (!hydratedRef.current) return false;
    for (const row of draftRows) {
      const saved = savedPageSnapshots[row.id];
      const draft = pageDrafts[row.id];
      if (!saved || !draft) continue;
      if (snapshotPageDraft(draft) !== saved) return true;
    }
    return false;
  }, [draftRows, pageDrafts, savedPageSnapshots]);

  const isDirty = isTableDirty || isPageDirty;

  const hasClienteAssociationViolations = useMemo(() => {
    if (readOnly) return false;
    return draftRows.some((row) => rowClienteAssociationError(row, knownClienti) != null);
  }, [draftRows, knownClienti, readOnly]);

  const selectedUser = useMemo(
    () => draftRows.find((u) => u.id === selectedUserId) ?? null,
    [draftRows, selectedUserId],
  );

  const selectedPageDraft = useMemo(() => {
    if (!selectedUserId) return [];
    return pageDrafts[selectedUserId] ?? [];
  }, [pageDrafts, selectedUserId]);

  const handleCancel = useCallback(() => {
    syncFromServer(serverUsers, userPageOverrideRows, rolePageAccessByRole);
  }, [serverUsers, userPageOverrideRows, rolePageAccessByRole, syncFromServer]);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    for (const row of draftRows) {
      const clienteErr = validateClienteAssociationForRole(row.ruolo, row.clienteRef, knownClienti);
      if (clienteErr) {
        gestToast.error(clienteErr);
        return;
      }
    }
    const patches = buildSecurityUserPatches(
      serverUsers,
      draftRows,
      savedPageSnapshots,
      pageDrafts,
      userPageOverrideRows,
      rolePageAccessByRole,
    );
    if (!patches.length) {
      setSavedSnapshot(rowsSnapshot(draftRows));
      setSavedPageSnapshots(buildPageSnapshots(draftRows, userPageOverrideRows, rolePageAccessByRole));
      return;
    }

    const roleChanges = patches.filter((p) => p.ruolo != null);
    if (roleChanges.length > 0) {
      const ok = await confirm({
        title: "Cambio ruolo",
        message:
          "Il cambio ruolo ripristina i permessi personalizzati per pagina al default del nuovo ruolo (salvo override espliciti nella stessa operazione). Continuare?",
        confirmLabel: "Salva",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      // ponytail: batch Option B — fail-fast per patch; draft locale preservato (no syncFromServer su errore).
      const res = await batchUpdateSecurityUsersAction(patches);
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      const ids = res.roleChangedUserIds ?? [];

      if (ids.length > 0) {
        await Promise.all(
          ids.map((id) =>
            onUserRoleChangedClient(id, {
              currentUserId: sessionUser?.id,
              refresh: async () => {},
              queryClient,
            }),
          ),
        );

        if (sessionUser?.id && ids.includes(sessionUser.id)) {
          await new Promise<void>((resolve) => {
            queueMicrotask(() => {
              void refresh().finally(resolve);
            });
          });
        }
      } else {
        await invalidateRuntimeTruth({
          reason: "roleOrPermissionsChanged",
          queryClient,
        });
      }

      const fresh = await queryClient.fetchQuery({
        queryKey: QK.securityUsersPermissions,
        queryFn: fetchSecurityUsersPermissionsQuery,
      });
      syncFromServer(fresh.users, fresh.userPageOverrideRows, fresh.rolePageAccessByRole);
      gestToast.successOnce("security-users-save", GESTIONALE_TOAST.successSaved);
    } finally {
      setSaving(false);
    }
  }, [
    serverUsers,
    draftRows,
    savedPageSnapshots,
    pageDrafts,
    userPageOverrideRows,
    rolePageAccessByRole,
    isDirty,
    gestToast,
    queryClient,
    refresh,
    sessionUser?.id,
    syncFromServer,
    confirm,
    knownClienti,
  ]);

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
      if (res.data?.users) syncFromServer(res.data.users, res.data.userPageOverrideRows, res.data.rolePageAccessByRole);
      hydratedRef.current = true;
    })();
  }, [confirm, isDirty, usersQ, syncFromServer]);

  const handleRoleChange = useCallback(
    (userId: string, ruolo: string) => {
      const roleKey = resolveRole(ruolo);
      setPageDrafts((prev) => ({
        ...prev,
        [userId]: computePagePermissionDraft(
          roleKey,
          rolePageAccessByRole[roleKey] ?? {},
          userId,
          userPageOverrideRows,
        ),
      }));
    },
    [userPageOverrideRows, rolePageAccessByRole],
  );

  const handleRestorePageFromRole = useCallback(() => {
    if (!selectedUser) return;
    const roleKey = resolveRole(selectedUser.ruolo);
    setPageDrafts((prev) => ({
      ...prev,
      [selectedUser.id]: buildInitialPageDraft(
        roleKey,
        rolePageAccessByRole[roleKey] ?? {},
        selectedUser.id,
        userPageOverrideRows,
      ),
    }));
  }, [selectedUser, userPageOverrideRows, rolePageAccessByRole]);

  const handlePageDraftChange = useCallback(
    (rows: PagePermissionDraftRow[]) => {
      if (!selectedUserId) return;
      setPageDrafts((prev) => ({ ...prev, [selectedUserId]: rows }));
    },
    [selectedUserId],
  );

  return (
    <ShellCard title="Utenti, ruoli e pagine consentite" subtitle="Gestione centralizzata di profili, ruoli, associazione clienti e override permessi per pagina.">
      <ToolbarGroup className="mb-4">
        <ToolbarGroupBody>
          <ToolbarGroupPrimaryRow>
            {!readOnly ? (
              <button type="button" className={dsPageToolbarCtaCompact} onClick={() => setCreateOpen(true)}>
                Nuovo utente
              </button>
            ) : null}
            <GestionaleRefreshToolbarButton busy={usersQ.isFetching} onClick={handleRefetch} />
          </ToolbarGroupPrimaryRow>
          {!readOnly && isDirty ? (
            <ToolbarGroupMetaRow>
              <span className={dsPageToolbarMetaChipAccent} role="status">
                Modifiche non salvate
              </span>
              <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2">
                <button
                  type="button"
                  className={dsBtnGhost}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Annulla modifiche
                </button>
                <Tooltip content={hasClienteAssociationViolations ? "Correggi le associazioni cliente prima di salvare." : undefined}><button type="button" className={dsBtnPrimary} onClick={() => void handleSave()} disabled={saving || hasClienteAssociationViolations}>
                  {saving ? "Salvataggio…" : "Salva"}
                </button></Tooltip>
              </div>
            </ToolbarGroupMetaRow>
          ) : null}
        </ToolbarGroupBody>
      </ToolbarGroup>

      {usersQ.isError ? (
        <div className="mb-4 space-y-2">
          <SecurityInlineNotice variant="danger" title="Errore caricamento">
            {usersQ.error instanceof Error ? usersQ.error.message : "Errore caricamento utenti."}
          </SecurityInlineNotice>
          <button type="button" className={dsPageToolbarBtn} onClick={() => void usersQ.refetch()}>
            Riprova
          </button>
        </div>
      ) : null}

      <section className={`${securitySubsectionShellClass} space-y-3 p-3 sm:space-y-4 sm:p-4`} aria-label="Associazione clienti">
        <header className="min-w-0">
          <h3 className={dsSectionTitle}>Associazione clienti</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)] sm:text-[13px]">
            Collega ogni utente a un cliente dell&apos;anagrafica mezzi. Il ruolo Cliente richiede un cliente associato
            per accedere al portale.
          </p>
        </header>

        {hasClienteAssociationViolations ? (
          <SecurityInlineNotice variant="warning" title="Associazioni incomplete">
            Uno o più utenti con ruolo Cliente non hanno un cliente associato valido. Correggi prima di salvare.
          </SecurityInlineNotice>
        ) : null}

        <SecurityUsersTable
          rows={usersQ.isError ? [] : draftRows}
          loading={usersQ.isLoading}
          readOnly={readOnly}
          assignableRoles={usersQ.assignableRoles}
          knownClienti={knownClienti}
          currentUserId={sessionUser?.id}
          onRowsChange={setDraftRows}
          onOpenDetail={setSelectedUserId}
          onRoleChange={handleRoleChange}
        />
      </section>

      <SecurityClienteAuditPanel readOnly={readOnly} />

      <SecurityUserDetailDrawer
        user={selectedUser}
        open={!!selectedUser}
        readOnly={readOnly}
        pageDraft={selectedPageDraft}
        onPageDraftChange={handlePageDraftChange}
        onRestorePageFromRole={handleRestorePageFromRole}
        onClose={() => setSelectedUserId(null)}
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
