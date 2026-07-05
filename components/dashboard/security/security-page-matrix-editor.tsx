"use client";

import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { pageMatrixColumnLabel } from "@/src/lib/permissions/gestionale-pages";
import type { PageAccessMatrix } from "@/src/actions/security-roles-permissions";
import { PageAccessLevelCell } from "@/components/dashboard/security/page-access-level-cell";
import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import {
  dsScrollbar,
  dsTable,
  dsTableHeadCell,
  dsTableRow,
  dsTableRowZebra,
  dsTableTd,
  dsTableTdCompact,
  dsTableWrap,
} from "@/lib/ui/design-system";

type Props = {
  matrix: PageAccessMatrix;
  draft: Map<string, PageAccessLevel>;
  onDraftChange: (next: Map<string, PageAccessLevel>) => void;
  readOnly: boolean;
};

function cellKey(roleKey: string, pageKey: string) {
  return `${roleKey}::${pageKey}`;
}

export function SecurityPageMatrixEditor({ matrix, draft, onDraftChange, readOnly }: Props) {
  function setLevel(roleKey: string, pageKey: string, level: PageAccessLevel, locked: boolean) {
    if (readOnly || locked) return;
    const next = new Map(draft);
    next.set(cellKey(roleKey, pageKey), level);
    onDraftChange(next);
  }

  return (
    <div className={`${dsTableWrap} overflow-auto ${dsScrollbar}`}>
      <table className={`${dsTable} min-w-max`}>
        <thead>
          <tr className={dsTableRow}>
            <th
              className={`${dsTableHeadCell} sticky left-0 z-20 min-w-[9rem] bg-[var(--cab-surface-2)] shadow-[inset_-1px_0_0_var(--cab-border)]`}
            >
              Ruolo
            </th>
            {matrix.pages.map((p) => (
              <th
                key={p.key}
                className={`${dsTableHeadCell} w-10 min-w-[2.5rem] max-w-[3.25rem] px-1 text-center normal-case tracking-normal`}
                title={p.label}
              >
                <span className="block text-[10px] font-semibold leading-tight">{pageMatrixColumnLabel(p.label)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr
              key={row.role.key}
              className={`${dsTableRow} ${dsTableRowZebra} ${!row.role.is_active ? "opacity-60" : ""}`}
            >
              <td
                className={`${dsTableTd} sticky left-0 z-10 min-w-[9rem] bg-[var(--cab-card)] shadow-[inset_-1px_0_0_var(--cab-border)]`}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium">{row.role.name}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SecurityRoleBadge role={row.role.key} />
                    {row.locked ? (
                      <span className="text-[10px] text-[color:var(--cab-text-muted)]">sistema</span>
                    ) : null}
                    {!row.role.is_active ? (
                      <span className="text-[10px] text-amber-600">inattivo</span>
                    ) : null}
                  </div>
                </div>
              </td>
              {row.cells.map((cell) => {
                const level = draft.get(cellKey(row.role.key, cell.pageKey)) ?? cell.level;
                return (
                  <td key={cell.pageKey} className={`${dsTableTdCompact} px-1 text-center`}>
                    <PageAccessLevelCell
                      level={level}
                      locked={row.locked}
                      readOnly={readOnly}
                      ariaLabel={`${row.role.name}, ${cell.label}`}
                      onChange={(next) => setLevel(row.role.key, cell.pageKey, next, row.locked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
