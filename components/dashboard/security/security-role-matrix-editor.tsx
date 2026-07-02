"use client";

import type { RolePermissionMatrixCell } from "@/src/actions/security-roles-permissions";
import { dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { RoleRow } from "@/src/types/supabase-tables";

type Props = {
  role: RoleRow;
  cells: RolePermissionMatrixCell[];
  draftAllowed: Set<string>;
  onDraftChange: (next: Set<string>) => void;
  readOnly: boolean;
};

function groupByModule(cells: RolePermissionMatrixCell[]) {
  const map = new Map<string, RolePermissionMatrixCell[]>();
  for (const c of cells) {
    const mod = c.module ?? (c.action === "capability" ? "Capability" : "—");
    if (!map.has(mod)) map.set(mod, []);
    map.get(mod)!.push(c);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "it"));
}

export function SecurityRoleMatrixEditor({ cells, draftAllowed, onDraftChange, readOnly }: Props) {
  const groups = groupByModule(cells);

  function toggle(id: string, on: boolean) {
    const next = new Set(draftAllowed);
    if (on) next.add(id);
    else next.delete(id);
    onDraftChange(next);
  }

  return (
    <div className={`${dsTableWrap} max-h-[min(28rem,60vh)] ${dsScrollbar}`}>
      <table className={`${dsTable} text-[11px]`}>
        <thead>
          <tr className={dsTableRow}>
            <th className={`${dsTableTd} text-left font-semibold`}>Modulo / Capability</th>
            <th className={`${dsTableTd} text-center font-semibold`}>Permesso</th>
            <th className={`${dsTableTd} text-center font-semibold`}>Attivo</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([mod, rows]) =>
            rows.map((cell, idx) => (
              <tr key={cell.permissionId} className={dsTableRow}>
                <td className={dsTableTd}>{idx === 0 ? mod : ""}</td>
                <td className={dsTableTd}>
                  <span className="font-medium">{cell.label}</span>
                  <span className="ml-1 text-[color:var(--cab-text-muted)]">({cell.permissionKey})</span>
                </td>
                <td className={`${dsTableTd} text-center`}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={draftAllowed.has(cell.permissionId)}
                    onChange={(e) => toggle(cell.permissionId, e.target.checked)}
                    aria-label={`${cell.label} per ruolo`}
                  />
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
