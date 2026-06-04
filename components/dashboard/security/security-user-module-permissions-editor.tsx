"use client";

import { resolveRole, type AppRole } from "@/lib/auth/rbac";
import {
  computeModulePermissionDraft,
  normalizeModuleDraftRow,
  type ModulePermissionDraftRow,
} from "@/lib/security/user-module-permissions";
import { SecurityToggle } from "@/components/dashboard/security/security-toggle";
import { dsBtnGhost, dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

const ROLE_MODULE_READONLY = new Set<AppRole>(["cliente", "guest"]);

type Props = {
  userId: string;
  ruolo: AppRole;
  readOnly: boolean;
  permissionRows: UserPermissionRow[];
  draft: ModulePermissionDraftRow[];
  onDraftChange: (rows: ModulePermissionDraftRow[]) => void;
  onRestoreFromRole: () => void;
};

export function buildInitialModuleDraft(
  ruolo: AppRole,
  userId: string,
  permissionRows: UserPermissionRow[],
): ModulePermissionDraftRow[] {
  return computeModulePermissionDraft(resolveRole(ruolo), userId, permissionRows);
}

export function SecurityUserModulePermissionsEditor({
  userId,
  ruolo,
  readOnly,
  permissionRows,
  draft,
  onDraftChange,
  onRestoreFromRole,
}: Props) {
  const role = resolveRole(ruolo);
  const matrixReadOnly = readOnly || ROLE_MODULE_READONLY.has(role);

  function patchModule(module: ModulePermissionDraftRow["module"], patch: Partial<ModulePermissionDraftRow>) {
    onDraftChange(
      draft.map((row) =>
        row.module === module ? normalizeModuleDraftRow({ ...row, ...patch }) : row,
      ),
    );
  }

  if (ROLE_MODULE_READONLY.has(role)) {
    return (
      <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
        Per il ruolo {role}, l&apos;accesso alle pagine ERP è definito dal ruolo e dal portale clienti (toggle in tabella).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
        Dashboard, BUNDER, Configurazione e Sicurezza seguono solo il ruolo. Qui imposti le pagine operative (allineate al menu).
      </p>
      {!matrixReadOnly ? (
        <button type="button" className={dsBtnGhost} onClick={onRestoreFromRole}>
          Ripristina permessi da ruolo
        </button>
      ) : null}
      <div className={`${dsTableWrap} max-h-[min(16rem,40vh)] ${dsScrollbar}`}>
        <table className={`${dsTable} text-[11px]`}>
          <thead>
            <tr className={dsTableRow}>
              <th className={`${dsTableTd} text-left font-semibold`}>Pagina</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Da ruolo</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Lettura</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Scrittura</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row) => (
              <tr key={`${userId}-${row.module}`} className={dsTableRow}>
                <td className={dsTableTd}>
                  <span className="font-medium text-[color:var(--cab-text)]">{row.label}</span>
                  {row.isCustomized ? (
                    <span className="ml-1.5 rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-1 py-0.5 text-[9px] font-bold uppercase text-[color:var(--cab-primary)]">
                      Custom
                    </span>
                  ) : null}
                </td>
                <td className={`${dsTableTd} text-center text-[color:var(--cab-text-muted)]`}>
                  {row.roleCanRead ? (row.roleCanWrite ? "R+S" : "R") : "—"}
                </td>
                <td className={`${dsTableTd} text-center`}>
                  <SecurityToggle
                    checked={row.canRead}
                    disabled={matrixReadOnly}
                    label={`Lettura ${row.label}`}
                    onChange={(next) => patchModule(row.module, { canRead: next, canWrite: next ? row.canWrite : false })}
                  />
                </td>
                <td className={`${dsTableTd} text-center`}>
                  <SecurityToggle
                    checked={row.canWrite}
                    disabled={matrixReadOnly || !row.canRead}
                    label={`Scrittura ${row.label}`}
                    onChange={(next) => patchModule(row.module, { canWrite: next })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[color:var(--cab-text-muted)]">
        Salvataggio con «Salva» nella tabella utenti. Le modifiche qui restano in bozza finché non salvi.
      </p>
    </div>
  );
}
