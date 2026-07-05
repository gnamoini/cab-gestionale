"use client";

import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { pageAccessLabel } from "@/src/lib/permissions/gestionale-pages";
import type { PageAccessMatrix } from "@/src/actions/security-roles-permissions";
import { dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";

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
    <div className={`${dsTableWrap} max-h-[min(32rem,70vh)] overflow-auto ${dsScrollbar}`}>
      <table className={`${dsTable} min-w-max text-[11px]`}>
        <thead>
          <tr className={dsTableRow}>
            <th className={`${dsTableTd} sticky left-0 z-10 bg-[var(--cab-card)] text-left font-semibold`}>Ruolo</th>
            {matrix.pages.map((p) => (
              <th key={p.key} className={`${dsTableTd} whitespace-nowrap px-2 text-center font-semibold`} title={p.label}>
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.role.key} className={dsTableRow}>
              <td className={`${dsTableTd} sticky left-0 z-10 bg-[var(--cab-card)] font-medium`}>
                {row.role.name}
                {row.locked ? (
                  <span className="ml-1 text-[10px] text-[color:var(--cab-text-muted)]">(bloccato)</span>
                ) : null}
              </td>
              {row.cells.map((cell) => {
                const level = draft.get(cellKey(row.role.key, cell.pageKey)) ?? cell.level;
                return (
                  <td key={cell.pageKey} className={`${dsTableTd} px-1 text-center`}>
                    <select
                      className="w-full max-w-[9rem] rounded border border-[color:var(--cab-border)] bg-[var(--cab-bg)] px-1 py-0.5 text-[10px]"
                      disabled={readOnly || row.locked}
                      value={row.locked ? "write" : level}
                      onChange={(e) => setLevel(row.role.key, cell.pageKey, e.target.value as PageAccessLevel, row.locked)}
                      aria-label={`${row.role.name} — ${cell.label}`}
                    >
                      <option value="write">{pageAccessLabel("write")}</option>
                      <option value="read">{pageAccessLabel("read")}</option>
                      <option value="none">{pageAccessLabel("none")}</option>
                    </select>
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
