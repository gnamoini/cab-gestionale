"use client";

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
  buildInitialModuleDraft,
} from "@/components/dashboard/security/security-user-module-permissions-editor";
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
  computeModulePermissionDraft,
  snapshotModuleDraft,
  type ModulePermissionDraftRow,
} from "@/lib/security/user-module-permissions";
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

function buildModuleSnapshots(
  users: EditableSecurityUser[],
  permissionRows: import("@/src/types/supabase-tables").UserPermissionRow[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const u of users) {
    const draft = computeModulePermissionDraft(u.ruolo, u.id, permissionRows);
    out[u.id] = snapshotModuleDraft(draft);
  }
  return out;
}

function buildModuleDrafts(
  users: EditableSecurityUser[],
  permissionRows: import("@/src/types/supabase-tables").UserPermissionRow[],
): Record<string, ModulePermissionDraftRow[]> {
  const out: Record<string, ModulePermissionDraftRow[]> = {};
  for (const u of users) {
    out[u.id] = buildInitialModuleDraft(u.ruolo, u.id, permissionRows);
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
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, ModulePermissionDraftRow[]>>({});
  const [savedModuleSnapshots, setSavedModuleSnapshots] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const hydratedRef = useRef(false);

  const internalUsersQ = useSecurityUsersPermissionsQuery(!sharedUsersQ);
  const usersQ = sharedUsersQ ?? internalUsersQ;
  const serverUsers = usersQ.users;
  const permissionRows = usersQ.permissionRows;
  const globalOpts = useGlobalOptions({ debugTag: "SecurityUsersPermissions" });
  const knownClienti = useMemo(
    () => buildKnownClientiSet(globalOpts.mezziListe.clienti ?? []),
    [globalOpts.mezziListe.clienti],
  );

  useEffect(() => {
    if (!usersQ.isSuccess || hydratedRef.current) return;
    setDraftRows(serverUsers);
    setSavedSnapshot(rowsSnapshot(serverUsers));
    setModuleDrafts(buildModuleDrafts(serverUsers, permissionRows));
    setSavedModuleSnapshots(buildModuleSnapshots(serverUsers, permissionRows));
    hydratedRef.current = true;
  }, [usersQ.isSuccess, serverUsers, permissionRows]);

  const syncFromServer = useCallback(
    (users: EditableSecurityUser[], perms: typeof permissionRows) => {
      setDraftRows(users);
      setSavedSnapshot(rowsSnapshot(users));
      setModuleDrafts(buildModuleDrafts(users, perms));
      setSavedModuleSnapshots(buildModuleSnapshots(users, perms));
    },
    [],
  );

  const isTableDirty = useMemo(() => {
    if (!hydratedRef.current || savedSnapshot == null) return false;
    return rowsSnapshot(draftRows) !== savedSnapshot;
  }, [draftRows, savedSnapshot]);

  const isModuleDirty = useMemo(() => {
    if (!hydratedRef.current) return false;
    for (const row of draftRows) {
      const saved = savedModuleSnapshots[row.id];
      const draft = moduleDrafts[row.id];
      if (!saved || !draft) continue;
      if (snapshotModuleDraft(draft) !== saved) return true;
    }
    return false;
  }, [draftRows, moduleDrafts, savedModuleSnapshots]);

  const isDirty = isTableDirty || isModuleDirty;

  const hasClienteAssociationViolations = useMemo(() => {
    if (readOnly) return false;
    return draftRows.some((row) => rowClienteAssociationError(row, knownClienti) != null);
  }, [draftRows, knownClienti, readOnly]);

  const selectedUser = useMemo(
    () => draftRows.find((u) => u.id === selectedUserId) ?? null,
    [draftRows, selectedUserId],
  );

  const selectedModuleDraft = useMemo(() => {
    if (!selectedUserId) return [];
    return moduleDrafts[selectedUserId] ?? [];
  }, [moduleDrafts, selectedUserId]);

  const handleCancel = useCallback(() => {
    syncFromServer(serverUsers, permissionRows);
  }, [serverUsers, permissionRows, syncFromServer]);

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
      savedModuleSnapshots,
      moduleDrafts,
      permissionRows,
    );
    if (!patches.length) {
      setSavedSnapshot(rowsSnapshot(draftRows));
      setSavedModuleSnapshots(buildModuleSnapshots(draftRows, permissionRows));
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
      syncFromServer(fresh.users, fresh.permissionRows);
      gestToast.successOnce("security-users-save", GESTIONALE_TOAST.successSaved);
    } finally {
      setSaving(false);
    }
  }, [
    serverUsers,
    draftRows,
    savedModuleSnapshots,
    moduleDrafts,
    permissionRows,
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
      if (res.data?.users) syncFromServer(res.data.users, res.data.permissionRows);
      hydratedRef.current = true;
    })();
  }, [confirm, isDirty, usersQ, syncFromServer]);

  const handleRoleChange = useCallback((userId: string, ruolo: AppRole) => {
    const role = resolveRole(ruolo);
    setModuleDrafts((prev) => ({
      ...prev,
      [userId]: computeModulePermissionDraft(role, userId, []),
    }));
  }, []);

  const handleRestoreModuleFromRole = useCallback(() => {
    if (!selectedUser) return;
    const role = resolveRole(selectedUser.ruolo);
    setModuleDrafts((prev) => ({
      ...prev,
      [selectedUser.id]: computeModulePermissionDraft(role, selectedUser.id, []),
    }));
  }, [selectedUser]);

  const handleModuleDraftChange = useCallback(
    (rows: ModulePermissionDraftRow[]) => {
      if (!selectedUserId) return;
      setModuleDrafts((prev) => ({ ...prev, [selectedUserId]: rows }));
    },
    [selectedUserId],
  );

  return (
    <ShellCard title="Utenti, ruoli e pagine consentite" subtitle="Gestione centralizzata di profili, ruoli, accesso portale clienti e permessi per modulo (menu ERP).">
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
                <button
                  type="button"
                  className={dsBtnPrimary}
                  onClick={() => void handleSave()}
                  disabled={saving || hasClienteAssociationViolations}
                  title={hasClienteAssociationViolations ? "Correggi le associazioni cliente prima di salvare." : undefined}
                >
                  {saving ? "Salvataggio…" : "Salva"}
                </button>
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
          permissionRows={permissionRows}
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
        permissionRows={permissionRows}
        moduleDraft={selectedModuleDraft}
        onModuleDraftChange={handleModuleDraftChange}
        onRestoreModuleFromRole={handleRestoreModuleFromRole}
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
