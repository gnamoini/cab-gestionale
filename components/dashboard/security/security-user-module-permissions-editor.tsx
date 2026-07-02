"use client";

import { resolveRole, ROLE_LABELS, type AppRole } from "@/lib/auth/rbac";
import {
  buildInitialModuleDraft,
  computeModulePermissionDraft,
  normalizeModuleDraftRow,
  type ModulePermissionDraftRow,
} from "@/lib/security/user-module-permissions";
import { dsBtnGhost, dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export { buildInitialModuleDraft };

const ROLE_MODULE_READONLY = new Set<AppRole>(["cliente", "guest"]);

type AccessLevel = "hidden" | "read" | "full";

function toAccessLevel(row: ModulePermissionDraftRow): AccessLevel {
  if (!row.canRead) return "hidden";
  if (row.canWrite) return "full";
  return "read";
}

function fromAccessLevel(level: AccessLevel): Pick<ModulePermissionDraftRow, "canRead" | "canWrite"> {
  if (level === "hidden") return { canRead: false, canWrite: false };
  if (level === "read") return { canRead: true, canWrite: false };
  return { canRead: true, canWrite: true };
}

type Props = {
  userId: string;
  ruolo: AppRole;
  readOnly: boolean;
  permissionRows: UserPermissionRow[];
  draft: ModulePermissionDraftRow[];
  onDraftChange: (rows: ModulePermissionDraftRow[]) => void;
  onRestoreFromRole: () => void;
};

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

  function setAccessLevel(module: ModulePermissionDraftRow["module"], level: AccessLevel) {
    patchModule(module, fromAccessLevel(level));
  }

  if (ROLE_MODULE_READONLY.has(role)) {
    return (
      <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
        {role === "guest"
          ? `${ROLE_LABELS.guest}: accesso read-only completo a tutti i moduli ERP (non configurabile).`
          : "Per il ruolo Cliente, l'accesso è definito dal portale clienti."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
        Dashboard, Configurazione, Sicurezza e Portale Clienti seguono solo il ruolo e non sono
        modificabili da questa schermata.
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
              <th className={`${dsTableTd} text-left font-semibold`}>Accesso</th>
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
                  {row.roleCanRead ? (row.roleCanWrite ? "Completo" : "Sola lettura") : "Nascosto"}
                </td>
                <td className={dsTableTd}>
                  <select
                    className="w-full min-w-0 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]"
                    disabled={matrixReadOnly}
                    value={toAccessLevel(row)}
                    aria-label={`Accesso ${row.label}`}
                    onChange={(e) => setAccessLevel(row.module, e.target.value as AccessLevel)}
                  >
                    <option value="hidden">Nascosto</option>
                    <option value="read">Sola lettura</option>
                    <option value="full">Accesso completo</option>
                  </select>
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
