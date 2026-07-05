"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { getPageMatrixAction, listRolesAction, updatePageMatrixAction } from "@/src/actions/security-roles-permissions";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityRolesList } from "@/components/dashboard/security/security-roles-list";
import { SecurityPageMatrixEditor } from "@/components/dashboard/security/security-page-matrix-editor";
import { SecurityRoleCreateModal } from "@/components/dashboard/security/security-role-create-modal";
import { SecurityInlineNotice } from "@/components/dashboard/security/security-inline-notice";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { RoleRow } from "@/src/types/supabase-tables";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Props = { readOnly?: boolean };

function cellKey(roleKey: string, pageKey: string) {
  return `${roleKey}::${pageKey}`;
}

export function SecurityRolesPanel({ readOnly = false }: Props) {
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Map<string, PageAccessLevel>>(new Map());
  const [saved, setSaved] = useState<Map<string, PageAccessLevel>>(new Map());

  const rolesQ = useQuery({
    queryKey: ["security", "roles"],
    queryFn: async () => {
      const res = await listRolesAction();
      if (!res.ok) throw new Error(res.message);
      return res.roles;
    },
  });

  const matrixQ = useQuery({
    queryKey: ["security", "page-matrix"],
    queryFn: async () => {
      const res = await getPageMatrixAction();
      if (!res.ok) throw new Error(res.message);
      return res.matrix;
    },
  });

  const roles = rolesQ.data ?? [];
  const selectedRole = roles.find((r) => r.key === selectedKey) ?? null;

  useEffect(() => {
    if (!matrixQ.data) return;
    const initial = new Map<string, PageAccessLevel>();
    for (const row of matrixQ.data.rows) {
      for (const cell of row.cells) {
        initial.set(cellKey(row.role.key, cell.pageKey), cell.level);
      }
    }
    setDraft(initial);
    setSaved(new Map(initial));
  }, [matrixQ.data]);

  const dirty = useMemo(() => {
    if (draft.size !== saved.size) return true;
    for (const [k, v] of draft) if (saved.get(k) !== v) return true;
    return false;
  }, [draft, saved]);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    const patches: { roleKey: string; pageKey: string; level: PageAccessLevel }[] = [];
    for (const [k, level] of draft) {
      if (saved.get(k) === level) continue;
      const [roleKey, pageKey] = k.split("::");
      if (!roleKey || !pageKey) continue;
      patches.push({ roleKey, pageKey, level });
    }
    const res = await updatePageMatrixAction({ patches });
    setSaving(false);
    if (!res.ok) {
      gestToast.error(res.message);
      return;
    }
    gestToast.successDone();
    setSaved(new Map(draft));
    void queryClient.invalidateQueries({ queryKey: ["security", "page-matrix"] });
    void queryClient.invalidateQueries({ queryKey: QK.securityUsersPermissions });
  }, [readOnly, draft, saved, gestToast, queryClient]);

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
        {selectedRole ? (
          <p className="mt-3 text-[11px] text-[color:var(--cab-text-muted)]">
            Ruolo selezionato: <strong>{selectedRole.name}</strong> — modifica la matrice a destra.
          </p>
        ) : null}
      </ShellCard>

      <ShellCard title="Matrice permessi (ruolo × pagina)">
        {!readOnly ? (
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
        {matrixQ.isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento matrice…</p>
        ) : matrixQ.isError ? (
          <SecurityInlineNotice variant="danger">{matrixQ.error.message}</SecurityInlineNotice>
        ) : matrixQ.data ? (
          <SecurityPageMatrixEditor matrix={matrixQ.data} draft={draft} onDraftChange={setDraft} readOnly={readOnly} />
        ) : null}
      </ShellCard>

      <SecurityRoleCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles as RoleRow[]}
        onCreated={(key) => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["security", "roles"] });
          void queryClient.invalidateQueries({ queryKey: ["security", "page-matrix"] });
          setSelectedKey(key);
        }}
      />
    </div>
  );
}
