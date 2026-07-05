"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { getPageMatrixAction, updatePageMatrixAction } from "@/src/actions/security-roles-permissions";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityPageMatrixEditor } from "@/components/dashboard/security/security-page-matrix-editor";
import { SecurityRoleCreateModal } from "@/components/dashboard/security/security-role-create-modal";
import { PageAccessLegend } from "@/components/dashboard/security/page-access-level-cell";
import { SecurityInlineNotice } from "@/components/dashboard/security/security-inline-notice";
import {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupMetaRow,
  ToolbarGroupPrimaryRow,
} from "@/components/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  dsBtnGhost,
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  dsPageToolbarMetaChipAccent,
} from "@/lib/ui/design-system";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Map<string, PageAccessLevel>>(new Map());
  const [saved, setSaved] = useState<Map<string, PageAccessLevel>>(new Map());

  const matrixQ = useQuery({
    queryKey: ["security", "page-matrix"],
    queryFn: async () => {
      const res = await getPageMatrixAction();
      if (!res.ok) throw new Error(res.message);
      return res.matrix;
    },
  });

  const roles = useMemo(
    () => (matrixQ.data?.rows.map((r) => r.role) ?? []) as RoleRow[],
    [matrixQ.data],
  );

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

  const handleCancel = useCallback(() => {
    setDraft(new Map(saved));
  }, [saved]);

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

  return (
    <ShellCard title="Matrice permessi ruolo × pagina">
      <ToolbarGroup className="mb-3">
        <ToolbarGroupBody>
          <ToolbarGroupPrimaryRow>
            <PageAccessLegend className="min-w-0 flex-1" />
            {!readOnly ? (
              <button type="button" className={dsPageToolbarCtaCompact} onClick={() => setCreateOpen(true)}>
                Nuovo ruolo
              </button>
            ) : null}
          </ToolbarGroupPrimaryRow>
          {!readOnly && dirty ? (
            <ToolbarGroupMetaRow>
              <span className={dsPageToolbarMetaChipAccent} role="status">
                Modifiche non salvate
              </span>
              <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2">
                <button type="button" className={dsBtnGhost} onClick={handleCancel} disabled={saving}>
                  Annulla
                </button>
                <button type="button" className={dsBtnPrimary} disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Salvataggio…" : "Salva matrice"}
                </button>
              </div>
            </ToolbarGroupMetaRow>
          ) : null}
        </ToolbarGroupBody>
      </ToolbarGroup>

      {matrixQ.isLoading ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento matrice…</p>
      ) : matrixQ.isError ? (
        <div className="space-y-2">
          <SecurityInlineNotice variant="danger" title="Errore caricamento">
            {matrixQ.error.message}
          </SecurityInlineNotice>
          <button type="button" className={dsPageToolbarBtn} onClick={() => void matrixQ.refetch()}>
            Riprova
          </button>
        </div>
      ) : matrixQ.data ? (
        <SecurityPageMatrixEditor matrix={matrixQ.data} draft={draft} onDraftChange={setDraft} readOnly={readOnly} />
      ) : null}

      <SecurityRoleCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
        onCreated={() => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["security", "page-matrix"] });
          void queryClient.invalidateQueries({ queryKey: QK.securityUsersPermissions });
        }}
      />
    </ShellCard>
  );
}
