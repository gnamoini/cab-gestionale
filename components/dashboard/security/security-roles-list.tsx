"use client";

import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import { dsBtnPrimary, dsScrollbar, dsTable, dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";
import type { RoleRow } from "@/src/types/supabase-tables";

type Props = {
  roles: RoleRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onCreate: () => void;
  readOnly: boolean;
  loading: boolean;
};

export function SecurityRolesList({ roles, selectedKey, onSelect, onCreate, readOnly, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento ruoli…</p>;
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <button type="button" className={dsBtnPrimary} onClick={onCreate}>
          Nuovo ruolo
        </button>
      ) : null}
      <div className={`${dsTableWrap} max-h-[min(24rem,50vh)] ${dsScrollbar}`}>
        <table className={`${dsTable} text-[12px]`}>
          <tbody>
            {roles.map((role) => (
              <tr
                key={role.key}
                className={`${dsTableRow} cursor-pointer ${selectedKey === role.key ? "bg-[color:var(--cab-surface-muted)]" : ""}`}
                onClick={() => onSelect(role.key)}
              >
                <td className={dsTableTd}>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{role.name}</span>
                    <span className="text-[10px] text-[color:var(--cab-text-muted)]">{role.key}</span>
                    <SecurityRoleBadge role={role.key} />
                    {!role.is_active ? (
                      <span className="text-[10px] text-amber-600">Inattivo</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
