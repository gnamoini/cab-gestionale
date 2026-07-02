"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { listRolesAction, getRolePermissionMatrixAction, updateRolePermissionsAction } from "@/src/actions/security-roles-permissions";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityRolesList } from "@/components/dashboard/security/security-roles-list";
import { SecurityRoleMatrixEditor } from "@/components/dashboard/security/security-role-matrix-editor";
import { SecurityRoleCreateModal } from "@/components/dashboard/security/security-role-create-modal";
import { SecurityInlineNotice } from "@/components/dashboard/security/security-inline-notice";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import type { RoleRow } from "@/src/types/supabase-tables";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Props = { readOnly?: boolean };

export function SecurityRolesPanel({ readOnly = false }: Props) {
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftAllowed, setDraftAllowed] = useState<Set<string>>(new Set());
  const [savedAllowed, setSavedAllowed] = useState<Set<string>>(new Set());

  const rolesQ = useQuery({
    queryKey: ["security", "roles"],
    queryFn: async () => {
      const res = await listRolesAction();
      if (!res.ok) throw new Error(res.message);
      return res.roles;
    },
  });

  const matrixQ = useQuery({
    queryKey: ["security", "role-matrix", selectedKey],
    enabled: !!selectedKey,
    queryFn: async () => {
      const res = await getRolePermissionMatrixAction(selectedKey!);
      if (!res.ok) throw new Error(res.message);
      return res.matrix;
    },
  });

  const roles = rolesQ.data ?? [];
  const selectedRole = roles.find((r) => r.key === selectedKey) ?? null;

  useEffect(() => {
    if (!matrixQ.data) return;
    const allowed = new Set(matrixQ.data.cells.filter((c) => c.allowed).map((c) => c.permissionId));
    setDraftAllowed(allowed);
    setSavedAllowed(new Set(allowed));
  }, [matrixQ.data]);

  const dirty = useMemo(() => {
    if (draftAllowed.size !== savedAllowed.size) return true;
    for (const id of draftAllowed) if (!savedAllowed.has(id)) return true;
    return false;
  }, [draftAllowed, savedAllowed]);

  const handleSave = useCallback(async () => {
    if (!selectedKey || readOnly) return;
    setSaving(true);
    const res = await updateRolePermissionsAction({
      roleKey: selectedKey,
      allowedPermissionIds: [...draftAllowed],
    });
    setSaving(false);
    if (!res.ok) {
      gestToast.error(res.message);
      return;
    }
    gestToast.successDone();
    setSavedAllowed(new Set(draftAllowed));
    void queryClient.invalidateQueries({ queryKey: ["security", "role-matrix", selectedKey] });
    void queryClient.invalidateQueries({ queryKey: QK.securityUsersPermissions });
  }, [selectedKey, readOnly, draftAllowed, gestToast, queryClient]);

  if (rolesQ.isError) {
    return <SecurityInlineNotice variant="danger">{rolesQ.error.message}</SecurityInlineNotice>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,22rem)_1fr]">
      <ShellCard title="Ruoli" className="h-fit">
        <SecurityRolesList
          roles={roles as RoleRow[]}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onCreate={() => setCreateOpen(true)}
          readOnly={readOnly}
          loading={rolesQ.isLoading}
        />
      </ShellCard>

      <ShellCard title={selectedRole ? `Matrice — ${selectedRole.name}` : "Matrice permessi"}>
        {selectedRole && !readOnly ? (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className={dsBtnPrimary}
              disabled={!dirty || saving || matrixQ.isLoading}
              onClick={() => void handleSave()}
            >
              {saving ? "Salvataggio…" : "Salva matrice"}
            </button>
          </div>
        ) : null}
        {!selectedRole ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Seleziona un ruolo per modificare i permessi.</p>
        ) : matrixQ.isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento matrice…</p>
        ) : matrixQ.isError ? (
          <SecurityInlineNotice variant="danger">{matrixQ.error.message}</SecurityInlineNotice>
        ) : matrixQ.data ? (
          <SecurityRoleMatrixEditor
            cells={matrixQ.data.cells}
            role={selectedRole}
            draftAllowed={draftAllowed}
            onDraftChange={setDraftAllowed}
            readOnly={readOnly}
          />
        ) : null}
        {selectedRole?.is_system ? (
          <p className="mt-3 text-[11px] text-[color:var(--cab-text-muted)]">
            Ruolo di sistema: la key non è modificabile; i permessi sono editabili.
          </p>
        ) : null}
      </ShellCard>

      <SecurityRoleCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles as RoleRow[]}
        onCreated={(key) => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["security", "roles"] });
          setSelectedKey(key);
        }}
      />
    </div>
  );
}
