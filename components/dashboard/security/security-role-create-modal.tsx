"use client";

import { useEffect, useMemo, useState } from "react";
import { createRoleAction } from "@/src/actions/security-roles-permissions";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { PageAccessLegend, PageAccessLevelCell } from "@/components/dashboard/security/page-access-level-cell";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { GESTIONALE_PAGES, type PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import {
  dsBtnGhost,
  dsBtnPrimary,
  dsInput,
  dsLabel,
  dsScrollbar,
  dsTable,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { globalTableThCell } from "@/lib/ui/global-table";
import type { RoleRow } from "@/src/types/supabase-tables";

type Props = {
  open: boolean;
  onClose: () => void;
  roles: RoleRow[];
  onCreated: () => void;
};

function emptyPageAccess(): Record<string, PageAccessLevel> {
  return Object.fromEntries(GESTIONALE_PAGES.map((p) => [p.key, "none" as const]));
}

export function SecurityRoleCreateModal({ open, onClose, roles, onCreated }: Props) {
  const gestToast = useGestionaleToast();
  const [name, setName] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");
  const [pageAccess, setPageAccess] = useState<Record<string, PageAccessLevel>>(emptyPageAccess);
  const [saving, setSaving] = useState(false);

  const previewKey = useMemo(() => {
    const slug = name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    return slug.length >= 2 ? slug : "";
  }, [name]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setName("");
    setCloneFrom("");
    setPageAccess(emptyPageAccess());
  }, [open]);

  useEffect(() => {
    if (!cloneFrom) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setPageAccess(emptyPageAccess());
      return;
    }
    setPageAccess({ ...emptyPageAccess(), ...seedPageAccessForRole(cloneFrom) });
  }, [cloneFrom]);

  function setLevel(pageKey: string, level: PageAccessLevel) {
    setPageAccess((prev) => ({ ...prev, [pageKey]: level }));
    setCloneFrom("");
  }

  async function handleCreate() {
    setSaving(true);
    const res = await createRoleAction({
      name: name.trim(),
      cloneFromRoleKey: cloneFrom || null,
      pageAccess,
    });
    setSaving(false);
    if (!res.ok) {
      gestToast.error(res.message);
      return;
    }
    gestToast.successDone();
    onCreated();
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title="Nuovo ruolo"
      titleId="security-role-create-title"
      modalSize="formMedium"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={dsLabel} htmlFor="role-name">
              Nome ruolo
            </label>
            <input
              id="role-name"
              className={dsInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Capo officina"
              autoFocus
            />
            {previewKey ? (
              <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">
                Identificativo: <code className="text-[10px]">{previewKey}</code>
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className={dsLabel} htmlFor="role-clone">
              Parti da ruolo esistente (opzionale)
            </label>
            <select id="role-clone" className={dsInput} value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
              <option value="">Nessuno — imposta manualmente</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <p className={dsLabel}>Permessi per pagina</p>
            <PageAccessLegend />
          </div>
          <div className={`${dsTableWrap} max-h-[min(20rem,45vh)] overflow-auto ${dsScrollbar}`}>
            <table className={dsTable}>
              <thead>
                <tr className={dsTableRow}>
                  <th className={`${globalTableThCell} text-left`}>Pagina</th>
                  <th className={`${globalTableThCell} w-16 text-center`}>Accesso</th>
                </tr>
              </thead>
              <tbody>
                {GESTIONALE_PAGES.map((page) => (
                  <tr key={page.key} className={dsTableRow}>
                    <td className={dsTableTd}>{page.label}</td>
                    <td className={`${dsTableTd} text-center`}>
                      <PageAccessLevelCell
                        level={pageAccess[page.key] ?? "none"}
                        ariaLabel={page.label}
                        onChange={(level) => setLevel(page.key, level)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--cab-border)] pt-3">
          <button type="button" className={dsBtnGhost} onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className={dsBtnPrimary}
            disabled={saving || !name.trim()}
            onClick={() => void handleCreate()}
          >
            {saving ? "Creazione…" : "Crea ruolo"}
          </button>
        </div>
      </div>
    </GestionaleModalShell>
  );
}
