"use client";

import { resolveRole, ROLE_LABELS, type AppRole } from "@/lib/auth/rbac";
import {
  normalizeModuleDraftRow,
  type ModulePermissionDraftRow,
} from "@/lib/security/user-module-permissions";
import { dsBtnGhost, dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

export { buildInitialModuleDraft } from "@/lib/security/user-module-permissions";

const ROLE_MODULE_READONLY = new Set<AppRole>(["cliente", "guest"]);

type OverrideEffect = ModulePermissionDraftRow["overrideRead"];

function roleAccessLabel(canRead: boolean, canWrite: boolean): string {
  if (!canRead) return "Nascosto";
  if (canWrite) return "Completo";
  return "Sola lettura";
}

function effectiveAccessLabel(canRead: boolean, canWrite: boolean): string {
  return roleAccessLabel(canRead, canWrite);
}

function recomputeRow(
  row: ModulePermissionDraftRow,
  patch: Partial<Pick<ModulePermissionDraftRow, "overrideRead" | "overrideWrite">>,
): ModulePermissionDraftRow {
  const overrideRead = patch.overrideRead ?? row.overrideRead;
  const overrideWrite = patch.overrideWrite ?? row.overrideWrite;

  let canRead = row.roleCanRead;
  if (overrideRead === "allow") canRead = true;
  if (overrideRead === "deny") canRead = false;

  let canWrite = row.roleCanWrite;
  if (overrideWrite === "allow") canWrite = true;
  if (overrideWrite === "deny") canWrite = false;
  if (!canRead) canWrite = false;

  const isCustomized =
    overrideRead !== "inherit" ||
    overrideWrite !== "inherit" ||
    canRead !== row.roleCanRead ||
    canWrite !== row.roleCanWrite;

  return normalizeModuleDraftRow({
    ...row,
    overrideRead,
    overrideWrite,
    canRead,
    canWrite,
    isCustomized,
  });
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
  draft,
  onDraftChange,
  onRestoreFromRole,
}: Props) {
  const role = resolveRole(ruolo);
  const matrixReadOnly = readOnly || ROLE_MODULE_READONLY.has(role);

  function patchModule(
    module: ModulePermissionDraftRow["module"],
    patch: Partial<Pick<ModulePermissionDraftRow, "overrideRead" | "overrideWrite">>,
  ) {
    onDraftChange(
      draft.map((row) => (row.module === module ? recomputeRow(row, patch) : row)),
    );
  }

  function setOverride(
    module: ModulePermissionDraftRow["module"],
    field: "overrideRead" | "overrideWrite",
    effect: OverrideEffect,
  ) {
    patchModule(module, { [field]: effect });
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
        modificabili da questa schermata. Precedenza: deny &gt; allow &gt; ruolo.
      </p>
      {!matrixReadOnly ? (
        <button type="button" className={dsBtnGhost} onClick={onRestoreFromRole}>
          Ripristina permessi da ruolo
        </button>
      ) : null}
      <div className={`${dsTableWrap} max-h-[min(20rem,45vh)] ${dsScrollbar}`}>
        <table className={`${dsTable} text-[11px]`}>
          <thead>
            <tr className={dsTableRow}>
              <th className={`${dsTableTd} text-left font-semibold`}>Pagina</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Da ruolo</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Override lettura</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Override scrittura</th>
              <th className={`${dsTableTd} text-center font-semibold`}>Effettivo</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row) => (
              <tr key={`${userId}-${row.module}`} className={dsTableRow}>
                <td className={dsTableTd}>
                  <span className="font-medium text-[color:var(--cab-text)]">{row.label}</span>
                  {row.isCustomized ? (
                    <span className="ml-1.5 rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-1 py-0.5 text-[9px] font-bold uppercase text-[color:var(--cab-primary)]">
                      Override
                    </span>
                  ) : null}
                </td>
                <td className={`${dsTableTd} text-center text-[color:var(--cab-text-muted)]`}>
                  {roleAccessLabel(row.roleCanRead, row.roleCanWrite)}
                </td>
                <td className={dsTableTd}>
                  <select
                    className="w-full min-w-0 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]"
                    disabled={matrixReadOnly}
                    value={row.overrideRead}
                    aria-label={`Override lettura ${row.label}`}
                    onChange={(e) =>
                      setOverride(row.module, "overrideRead", e.target.value as OverrideEffect)
                    }
                  >
                    <option value="inherit">Eredita</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </td>
                <td className={dsTableTd}>
                  <select
                    className="w-full min-w-0 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]"
                    disabled={matrixReadOnly || !row.canRead && row.overrideRead === "deny"}
                    value={row.overrideWrite}
                    aria-label={`Override scrittura ${row.label}`}
                    onChange={(e) =>
                      setOverride(row.module, "overrideWrite", e.target.value as OverrideEffect)
                    }
                  >
                    <option value="inherit">Eredita</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </td>
                <td
                  className={`${dsTableTd} text-center font-medium ${
                    row.isCustomized
                      ? "text-[color:var(--cab-primary)]"
                      : "text-[color:var(--cab-text-muted)]"
                  }`}
                >
                  {effectiveAccessLabel(row.canRead, row.canWrite)}
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
