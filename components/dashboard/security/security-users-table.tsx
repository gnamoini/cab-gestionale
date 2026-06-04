"use client";

import { useMemo, useState } from "react";
import { APP_ROLES, hasPermission, resolveRole, roleLabel, type AppRole } from "@/lib/auth/rbac";
import { buildInitialModuleDraft } from "@/components/dashboard/security/security-user-module-permissions-editor";
import { snapshotModuleDraft } from "@/lib/security/user-module-permissions";
import { modulePermissionsPayloadFromDraft } from "@/lib/security/user-module-permissions";
import type { ModulePermissionDraftRow } from "@/lib/security/user-module-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";
import { PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import type { SecurityUserPermissionRow } from "@/src/actions/security-users-permissions";
import { SecurityEditNameModal } from "@/components/dashboard/security/security-edit-name-modal";
import { SecurityRoleBadge, SecurityStatusBadge } from "@/components/dashboard/security/security-role-badge";
import { SecurityToggle } from "@/components/dashboard/security/security-toggle";
import { GlobalTableHead, GestionaleListTableActionsHead } from "@/components/gestionale/global-table";
import { cycleReportSort, ReportSortTh, type ReportSortPhase } from "@/components/report/report-sort-th";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import {
  dsBtnGhost,
  dsInput,
  dsScrollbar,
  dsSkeletonPulse,
  dsTable,
  dsTableEmptyCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";

export type SecurityUserSortKey = "nome" | "username" | "email" | "ruolo" | "clienteRef" | "clientAccess" | "stato";

export type EditableSecurityUser = SecurityUserPermissionRow;

function compareUsers(a: EditableSecurityUser, b: EditableSecurityUser, key: SecurityUserSortKey, phase: "asc" | "desc"): number {
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "nome":
      return dir * a.nome.localeCompare(b.nome, "it");
    case "username":
      return dir * (a.username || "").localeCompare(b.username || "", "it");
    case "email":
      return dir * (a.email || "").localeCompare(b.email || "", "it");
    case "ruolo":
      return dir * a.ruolo.localeCompare(b.ruolo, "it");
    case "clienteRef":
      return dir * (a.clienteRef ?? "").localeCompare(b.clienteRef ?? "", "it");
    case "clientAccess":
      return dir * (Number(a.clientLavorazioniAccess) - Number(b.clientLavorazioniAccess));
    case "stato": {
      const av = a.lastSignInAt ?? "";
      const bv = b.lastSignInAt ?? "";
      return dir * av.localeCompare(bv);
    }
    default:
      return 0;
  }
}

function applyRoleToRow(row: EditableSecurityUser, ruolo: AppRole): EditableSecurityUser {
  const fromRole = hasPermission(ruolo, "viewClientLavorazioni");
  return {
    ...row,
    ruolo,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole ? true : row.clientLavorazioniAccess,
  };
}

function SecurityUsersTableSkeleton() {
  return (
    <div className={`${dsTableWrap} ${dsScrollbar}`}>
      <table className={dsTable}>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className={dsTableRow}>
              <td colSpan={9} className="px-3 py-3">
                <div className={`h-4 w-full ${dsSkeletonPulse}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  rows: EditableSecurityUser[];
  loading: boolean;
  readOnly: boolean;
  permissionRows: UserPermissionRow[];
  onRowsChange: (rows: EditableSecurityUser[]) => void;
  onOpenDetail: (userId: string) => void;
  onRoleChange?: (userId: string, ruolo: AppRole) => void;
};

export function SecurityUsersTable({
  rows,
  loading,
  readOnly,
  permissionRows,
  onRowsChange,
  onOpenDetail,
  onRoleChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [sortColumn, setSortColumn] = useState<SecurityUserSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");
  const [editNameUserId, setEditNameUserId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (roleFilter !== "all") list = list.filter((r) => r.ruolo === roleFilter);
    if (q) {
      list = list.filter(
        (r) =>
          r.nome.toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.ruolo.toLowerCase().includes(q) ||
          (r.clienteRef ?? "").toLowerCase().includes(q),
      );
    }
    if (sortColumn && (sortPhase === "asc" || sortPhase === "desc")) {
      list = [...list].sort((a, b) => compareUsers(a, b, sortColumn, sortPhase));
    } else {
      list = [...list].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
    }
    return list;
  }, [rows, search, roleFilter, sortColumn, sortPhase]);

  const {
    page,
    setPage,
    pageCount,
    sliceItems,
    showPager,
    label: pagerLabel,
    resetPage,
  } = useClientPagination(filtered.length, 12);

  const paged = useMemo(() => sliceItems(filtered), [filtered, sliceItems]);

  const editNameUser = editNameUserId ? rows.find((r) => r.id === editNameUserId) ?? null : null;

  function handleSort(key: SecurityUserSortKey) {
    const next = cycleReportSort(sortColumn, sortPhase, key);
    setSortColumn(next.column);
    setSortPhase(next.phase);
    resetPage();
  }

  function patchRow(userId: string, patch: Partial<EditableSecurityUser>) {
    onRowsChange(rows.map((r) => (r.id === userId ? { ...r, ...patch } : r)));
  }

  function handleRoleChange(userId: string, ruolo: AppRole) {
    onRowsChange(rows.map((r) => (r.id === userId ? applyRoleToRow(r, ruolo) : r)));
    onRoleChange?.(userId, ruolo);
  }

  if (loading) return <SecurityUsersTableSkeleton />;

  return (
    <>
      <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Cerca utente</span>
          <input
            className={`${dsInput} w-full`}
            placeholder="Cerca per nome, username o email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </label>
        <label className="block min-w-[10rem] sm:min-w-[12rem]">
          <span className="sr-only">Filtra ruolo</span>
          <GlobalSelect
            selectOnly
            variant="filter"
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v as "all" | AppRole);
              resetPage();
            }}
            aria-label="Filtra ruolo"
            items={[
              { value: "all", label: "Tutti i ruoli" },
              ...APP_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
            ]}
          />
        </label>
        <span className="text-xs text-[color:var(--cab-text-muted)]">
          <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">{filtered.length}</span> utent
          {filtered.length === 1 ? "e" : "i"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={dsTableWrap}>
          <table className={dsTable}>
            <tbody>
              <tr>
                <td className={dsTableEmptyCell}>Nessun utente corrisponde ai filtri.</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} text-xs`}>
              <GlobalTableHead>
                <ReportSortTh label="Nome" columnKey="nome" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <ReportSortTh label="Username" columnKey="username" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <ReportSortTh label="Email" columnKey="email" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <ReportSortTh label="Ruolo" columnKey="ruolo" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <ReportSortTh
                  label="Cliente associato"
                  columnKey="clienteRef"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={handleSort}
                />
                <ReportSortTh
                  label={`Accesso ${PORTALE_CLIENTI_LABEL}`}
                  columnKey="clientAccess"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={handleSort}
                />
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  Permessi
                </th>
                <ReportSortTh label="Stato" columnKey="stato" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <GestionaleListTableActionsHead />
              </GlobalTableHead>
              <tbody>
                {paged.map((row) => {
                  const portalLocked = row.clientLavorazioniAccessFromRole;
                  return (
                    <tr key={row.id} className={dsTableRow}>
                      <td className={`${dsTableTd} font-medium text-[color:var(--cab-text)]`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate">{row.nome}</span>
                          {!readOnly ? (
                            <button
                              type="button"
                              className="shrink-0 text-[10px] font-semibold text-[color:var(--cab-primary)] hover:underline"
                              onClick={() => setEditNameUserId(row.id)}
                            >
                              Modifica
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${dsTableTd} max-w-[10rem] truncate font-mono text-[11px]`} title={row.username ?? undefined}>
                        {row.username || "—"}
                      </td>
                      <td className={`${dsTableTd} max-w-[14rem] truncate`} title={row.email}>
                        {row.email || "—"}
                      </td>
                      <td className={dsTableTd}>
                        {readOnly ? (
                          <SecurityRoleBadge role={row.ruolo} />
                        ) : (
                          <GlobalSelect
                            selectOnly
                            variant="default"
                            value={row.ruolo}
                            onChange={(v) => handleRoleChange(row.id, v as AppRole)}
                            aria-label={`Ruolo ${row.nome}`}
                            inputClassName="min-h-8 py-1 text-xs"
                            items={APP_ROLES.map((role) => ({
                              value: role,
                              label: roleLabel(role),
                            }))}
                          />
                        )}
                      </td>
                      <td className={dsTableTd}>
                        {readOnly ? (
                          <span className="max-w-[12rem] truncate" title={row.clienteRef ?? undefined}>
                            {row.clienteRef || "—"}
                          </span>
                        ) : (
                          <GlobalSettingsListSelect
                            selectOnly
                            variant="default"
                            listKey="mezzi:clienti"
                            value={row.clienteRef ?? ""}
                            onChange={(v) => patchRow(row.id, { clienteRef: v.trim() || null })}
                            aria-label={`Cliente associato ${row.nome}`}
                            inputClassName="min-h-8 py-1 text-xs"
                            placeholder="—"
                          />
                        )}
                      </td>
                      <td className={dsTableTd}>
                        <div className="flex min-w-0 items-center gap-2">
                          <SecurityToggle
                            checked={row.clientLavorazioniAccess}
                            disabled={readOnly || portalLocked}
                            label={`Accesso lavorazioni clienti per ${row.nome}`}
                            onChange={(next) => patchRow(row.id, { clientLavorazioniAccess: next })}
                          />
                          <span className="text-[10px] text-[color:var(--cab-text-muted)]">
                            {portalLocked ? "Da ruolo" : row.clientLavorazioniAccess ? "ON" : "OFF"}
                          </span>
                        </div>
                      </td>
                      <td className={dsTableTd}>
                        {row.hasModulePermissionOverrides ? (
                          <span className="rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--cab-primary)]">
                            Personalizzati
                          </span>
                        ) : (
                          <span className="text-[10px] text-[color:var(--cab-text-muted)]">Da ruolo</span>
                        )}
                      </td>
                      <td className={dsTableTd}>
                        <SecurityStatusBadge lastSignInAt={row.lastSignInAt} />
                      </td>
                      <td className={dsTableTd}>
                        <button type="button" className={dsBtnGhost} onClick={() => onOpenDetail(row.id)}>
                          Dettaglio
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={pagerLabel} /> : null}
        </>
      )}

      <SecurityEditNameModal
        open={!!editNameUser}
        initialNome={editNameUser?.nome ?? ""}
        onClose={() => setEditNameUserId(null)}
        onSave={(nome) => {
          if (editNameUserId) patchRow(editNameUserId, { nome });
          setEditNameUserId(null);
        }}
      />
    </>
  );
}

export function rowsSnapshot(rows: EditableSecurityUser[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      nome: r.nome.trim(),
      ruolo: r.ruolo,
      clienteRef: r.clienteRef,
      clientLavorazioniAccess: r.clientLavorazioniAccess,
      clientLavorazioniAccessFromRole: r.clientLavorazioniAccessFromRole,
    })),
  );
}

export function buildSecurityUserPatches(
  saved: EditableSecurityUser[],
  draft: EditableSecurityUser[],
  savedModuleSnapshots: Record<string, string>,
  draftModuleDrafts: Record<string, ModulePermissionDraftRow[]>,
  permissionRows: UserPermissionRow[],
): import("@/src/actions/security-users-permissions").SecurityUserBatchPatch[] {
  const savedById = new Map(saved.map((r) => [r.id, r]));
  const patches: import("@/src/actions/security-users-permissions").SecurityUserBatchPatch[] = [];

  for (const row of draft) {
    const orig = savedById.get(row.id);
    if (!orig) continue;
    const patch: import("@/src/actions/security-users-permissions").SecurityUserBatchPatch = { userId: row.id };
    let dirty = false;

    if (row.nome.trim() !== orig.nome.trim()) {
      patch.nome = row.nome.trim();
      dirty = true;
    }
    const roleChanged = row.ruolo !== orig.ruolo;
    if (roleChanged) {
      patch.ruolo = row.ruolo;
      patch.clearModulePermissions = true;
      dirty = true;
    }
    const clienteRefChanged = (row.clienteRef ?? null) !== (orig.clienteRef ?? null);
    if (clienteRefChanged) {
      patch.clienteRef = row.clienteRef ?? null;
      dirty = true;
    }
    if (!row.clientLavorazioniAccessFromRole && row.clientLavorazioniAccess !== orig.clientLavorazioniAccess) {
      patch.clientLavorazioniAccess = row.clientLavorazioniAccess;
      dirty = true;
    }

    const savedModSnap = savedModuleSnapshots[row.id] ?? snapshotModuleDraft(buildInitialModuleDraft(orig.ruolo, orig.id, permissionRows));
    const draftMod = draftModuleDrafts[row.id];
    const draftModSnap = draftMod ? snapshotModuleDraft(draftMod) : savedModSnap;
    if (!roleChanged && draftModSnap !== savedModSnap && draftMod) {
      patch.modulePermissions = modulePermissionsPayloadFromDraft(resolveRole(row.ruolo), draftMod);
      dirty = true;
    }

    if (dirty) patches.push(patch);
  }
  return patches;
}
