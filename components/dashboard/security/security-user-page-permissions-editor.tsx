"use client";

import { pageAccessLabel } from "@/src/lib/permissions/gestionale-pages";
import type { PagePermissionDraftRow, PageOverrideUiLevel } from "@/lib/security/user-page-permissions";
import { dsBtnGhost, dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { AppRole } from "@/lib/auth/rbac";
import { resolveRole } from "@/lib/auth/rbac";

export { buildInitialPageDraft } from "@/lib/security/user-page-permissions";

const ROLE_PAGE_READONLY = new Set<AppRole>(["cliente", "guest"]);

type Props = {
  ruolo: AppRole;
  readOnly: boolean;
  draft: PagePermissionDraftRow[];
  onDraftChange: (rows: PagePermissionDraftRow[]) => void;
  onRestoreFromRole: () => void;
};

function effectiveLabel(row: PagePermissionDraftRow): string {
  if (row.overrideLevel === "inherit") return pageAccessLabel(row.roleLevel);
  return pageAccessLabel(row.effectiveLevel);
}

function patchRow(row: PagePermissionDraftRow, overrideLevel: PageOverrideUiLevel): PagePermissionDraftRow {
  const effectiveLevel = overrideLevel === "inherit" ? row.roleLevel : overrideLevel;
  const access = {
    canRead: effectiveLevel === "write" || effectiveLevel === "read",
    canWrite: effectiveLevel === "write",
  };
  return {
    ...row,
    overrideLevel,
    effectiveLevel,
    ...access,
    isCustomized: overrideLevel !== "inherit",
  };
}

export function SecurityUserPagePermissionsEditor({
  ruolo,
  readOnly,
  draft,
  onDraftChange,
  onRestoreFromRole,
}: Props) {
  const role = resolveRole(ruolo);
  const editorReadOnly = readOnly || ROLE_PAGE_READONLY.has(role);

  function setOverride(pageKey: string, level: PageOverrideUiLevel) {
    onDraftChange(draft.map((row) => (row.pageKey === pageKey ? patchRow(row, level) : row)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        <p className="text-[11px] text-[color:var(--cab-text-muted)]">
          Override per pagina. &quot;Eredita&quot; non viene salvato nel database.
        </p>
        {!editorReadOnly ? (
          <button type="button" className={dsBtnGhost} onClick={onRestoreFromRole}>
            Ripristina da ruolo
          </button>
        ) : null}
      </div>
      <div className={`${dsTableWrap} max-h-[min(24rem,50vh)] ${dsScrollbar}`}>
        <table className={`${dsTable} text-[11px]`}>
          <thead>
            <tr className={dsTableRow}>
              <th className={`${dsTableTd} text-left font-semibold`}>Pagina</th>
              <th className={`${dsTableTd} text-left font-semibold`}>Ruolo</th>
              <th className={`${dsTableTd} text-left font-semibold`}>Override</th>
              <th className={`${dsTableTd} text-left font-semibold`}>Effettivo</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row) => (
              <tr key={row.pageKey} className={dsTableRow}>
                <td className={dsTableTd}>{row.label}</td>
                <td className={dsTableTd}>{pageAccessLabel(row.roleLevel)}</td>
                <td className={dsTableTd}>
                  <select
                    className="w-full max-w-[11rem] rounded border border-[color:var(--cab-border)] bg-[var(--cab-bg)] px-1 py-0.5 text-[10px]"
                    disabled={editorReadOnly}
                    value={row.overrideLevel}
                    onChange={(e) => setOverride(row.pageKey, e.target.value as PageOverrideUiLevel)}
                  >
                    <option value="inherit">Eredita dal ruolo</option>
                    <option value="write">{pageAccessLabel("write")}</option>
                    <option value="read">{pageAccessLabel("read")}</option>
                    <option value="none">{pageAccessLabel("none")}</option>
                  </select>
                </td>
                <td className={dsTableTd}>{effectiveLabel(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
