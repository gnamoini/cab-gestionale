"use client";

import "./security-users-table.css";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CardMobile, CardMobileActions, IconActionButton, LoadingTableSkeleton } from "@/components/design-system";
import { useAuthUserId } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { HubIconPencil } from "@/components/design-system/hub-table-action-icons";
import {
  SecurityEditNameModal,
  type SecurityEditProfileValues,
} from "@/components/dashboard/security/security-edit-name-modal";
import { deleteUserByAdminAction } from "@/src/actions/admin-users";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { SecurityRoleBadge, SecurityStatusBadge } from "@/components/dashboard/security/security-role-badge";
import {
  CLIENTE_REF_UNKNOWN_MSG,
  fieldClienteAssociationMessage,
  validateClienteAssociationForRole,
} from "@/src/lib/auth/cliente-portal-scope";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GestionaleListTableRow,
  GlobalTableHeadLabel,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { PageToolbar, PageToolbarResultCount } from "@/components/design-system/page-toolbar";
import { cycleReportSort, type ReportSortPhase } from "@/components/report/report-sort-th";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { SecurityInlineNotice } from "@/components/dashboard/security/security-inline-notice";
import { APP_ROLES, resolveRole, roleLabel, type AppRole } from "@/lib/auth/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { isRbacSnapshotReady, snapshotHasPageRead } from "@/src/lib/rbac/rbac-snapshot-access";
import { securityUserDisplayName } from "@/lib/auth/profile-display-name";
import {
  buildSecurityUserPatches,
  rowsSnapshot,
  type EditableSecurityUser,
} from "@/lib/security/build-security-user-patches";
import { PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import {
  dsBtnGhost,
  dsScrollbar,
  dsTableActionBtnInfo,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  gestionaleListColAzioniClass,
  gestionaleListTableClass,
  gestionaleListTableMobileEmptyClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  useGestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";

export type SecurityUserSortKey = "nome" | "username" | "email" | "ruolo" | "clienteRef" | "clientAccess" | "stato";

export type { EditableSecurityUser };
export { buildSecurityUserPatches, rowsSnapshot };

const SECURITY_USERS_COL_COUNT = 7;
const securityUsersTableClass = `security-users-dense-table ${gestionaleListTableClass}`;
const securityUsersTableTd = `${gestionaleListTableTd} py-2`;

/** Select compatto tabella/mobile: mantiene radius DS (inputClassName sostituisce dsInput intero). */
const securityDenseSelectBase =
  "min-h-8 w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] px-2.5 py-1 text-xs shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]";

function securityDenseSelectClass(associationErr: string | null): string {
  if (!associationErr) return securityDenseSelectBase;
  if (associationErr === CLIENTE_REF_UNKNOWN_MSG) {
    return `${securityDenseSelectBase} border-[color:color-mix(in_srgb,var(--cab-danger)_55%,var(--cab-border))] focus:border-[color:color-mix(in_srgb,var(--cab-danger)_65%,var(--cab-border))] focus:ring-[color:color-mix(in_srgb,var(--cab-danger)_22%,transparent)]`;
  }
  return `${securityDenseSelectBase} border-[color:color-mix(in_srgb,var(--cab-warning)_55%,var(--cab-border))] focus:border-[color:color-mix(in_srgb,var(--cab-warning)_65%,var(--cab-border))] focus:ring-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)]`;
}

/** Combobox searchable cliente: stesso stile dense + cursore testo. */
function securityDenseSearchClass(associationErr: string | null): string {
  return `${securityDenseSelectClass(associationErr)} cursor-text`;
}

const identityPrimaryClass = "truncate text-sm font-medium leading-snug text-[color:var(--cab-text)]";
const identitySecondaryClass = "truncate text-xs leading-snug text-[color:var(--cab-text-muted)]";
const identityUsernameClass = "truncate font-mono text-[10px] leading-snug text-[color:var(--cab-text-muted)]";

function IconInfo({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function compareUsers(a: EditableSecurityUser, b: EditableSecurityUser, key: SecurityUserSortKey, phase: "asc" | "desc"): number {
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "nome":
      return dir * a.nome.localeCompare(b.nome, "it");
    case "username":
      return dir * (a.username ?? "").localeCompare(b.username ?? "", "it");
    case "email":
      return dir * (a.email || "").localeCompare(b.email || "", "it");
    case "ruolo":
      return dir * a.ruolo.localeCompare(b.ruolo, "it");
    case "clienteRef":
      return dir * (a.clienteRef ?? "").localeCompare(b.clienteRef ?? "", "it");
    case "clientAccess":
      return dir * (Number(a.clientLavorazioniAccess) - Number(b.clientLavorazioniAccess));
    case "stato": {
      const aOff = a.accountEnabled === false ? 0 : 1;
      const bOff = b.accountEnabled === false ? 0 : 1;
      if (aOff !== bOff) return dir * (aOff - bOff);
      const av = a.lastSignInAt ?? "";
      const bv = b.lastSignInAt ?? "";
      return dir * av.localeCompare(bv);
    }
    default:
      return 0;
  }
}

function applyRoleToRow(row: EditableSecurityUser, ruolo: AppRole): EditableSecurityUser {
  const snap = buildTestSnapshot({ userId: row.id, roleKey: ruolo });
  const fromRole =
    isRbacSnapshotReady(snap) && snapshotHasPageRead(snap, "lavorazioni_clienti");
  return {
    ...row,
    ruolo,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole,
  };
}

export function rowClienteAssociationError(
  row: EditableSecurityUser,
  knownClienti?: Set<string>,
): string | null {
  return validateClienteAssociationForRole(row.ruolo, row.clienteRef, knownClienti);
}

function UserIdentityCell({ row }: { row: EditableSecurityUser }) {
  const displayName = securityUserDisplayName(row);
  const title = [displayName, row.email, row.username].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={title}>
      <span className={identityPrimaryClass}>{displayName}</span>
      <span className={identitySecondaryClass}>{row.email || "—"}</span>
      {row.username ? <span className={identityUsernameClass}>@{row.username}</span> : null}
    </div>
  );
}

function PortalAccessBadge({ row }: { row: EditableSecurityUser }) {
  if (row.clientLavorazioniAccessFromRole) {
    return (
      <span className="inline-flex rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--cab-primary)]">
        Da ruolo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--cab-text-muted)]">
      Non disponibile
    </span>
  );
}

function PermissionsBadge({ row }: { row: EditableSecurityUser }) {
  if (row.hasPagePermissionOverrides) {
    return (
      <span className="inline-flex max-w-full rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--cab-primary)]">
        Personalizzati
      </span>
    );
  }
  return <span className="text-[10px] text-[color:var(--cab-text-muted)]">Da ruolo</span>;
}

type RowEditorProps = {
  row: EditableSecurityUser;
  readOnly: boolean;
  knownClienti?: Set<string>;
  onRoleChange: (userId: string, ruolo: string) => void;
  onPatch: (userId: string, patch: Partial<EditableSecurityUser>) => void;
  density?: "table" | "mobile";
  roleInputClassName?: string;
  roleSelectItems: { value: string; label: string }[];
};

function SecurityUserRoleField({
  row,
  readOnly,
  onRoleChange,
  roleInputClassName,
  roleSelectItems,
  density = "table",
}: RowEditorProps) {
  if (readOnly) return <SecurityRoleBadge role={row.ruolo} />;
  return (
    <GlobalSelect
      selectOnly
      variant="default"
      value={row.ruolo}
      onChange={(v) => onRoleChange(row.id, v)}
      aria-label={`Ruolo ${securityUserDisplayName(row)}`}
      sheetTitle="Seleziona ruolo"
      inputClassName={roleInputClassName ?? securityDenseSelectBase}
      items={roleSelectItems}
      preserveItemOrder
      showSimilarWarning={false}
      mobileSheet
      mobileSheetMode="selectOnly"
      minSheetOptions={0}
      className={density === "mobile" ? "w-full" : undefined}
    />
  );
}

function SecurityUserClienteField({ row, readOnly, knownClienti, onPatch, density = "table" }: RowEditorProps) {
  const isCliente = row.ruolo === "cliente";
  const associationErr = rowClienteAssociationError(row, knownClienti);
  const displayErr = fieldClienteAssociationMessage(associationErr);
  const errorId = `security-cliente-err-${row.id}`;
  const noticeVariant = associationErr === CLIENTE_REF_UNKNOWN_MSG ? "danger" : "warning";
  const hintMessage = density === "mobile" ? displayErr : associationErr;

  if (readOnly) {
    return (
      <span className="block max-w-full truncate text-xs" title={row.clienteRef ?? undefined}>
        {row.clienteRef || "—"}
      </span>
    );
  }
  return (
    <div className="min-w-0 space-y-1.5">
      <GlobalSettingsListSelect
        variant="default"
        listKey="mezzi:clienti"
        allowAdd={false}
        value={row.clienteRef ?? ""}
        onChange={(v) => {
          const next = v.trim() || null;
          if (isCliente && !next) return;
          onPatch(row.id, { clienteRef: next });
        }}
        aria-label={`Cliente associato ${securityUserDisplayName(row)}`}
        aria-invalid={!!associationErr || undefined}
        aria-describedby={associationErr ? errorId : undefined}
        inputClassName={securityDenseSearchClass(associationErr)}
        placeholder={isCliente ? "Cerca o seleziona…" : "—"}
        required={isCliente}
      />
      {hintMessage ? (
        <SecurityInlineNotice variant={noticeVariant} appearance="inline" id={errorId}>
          {hintMessage}
        </SecurityInlineNotice>
      ) : null}
    </div>
  );
}

function SecurityUserPortalField({ row }: { row: EditableSecurityUser }) {
  return <PortalAccessBadge row={row} />;
}

function SecurityUserRowActions({
  row,
  readOnly,
  onOpenDetail,
  onEditName,
}: {
  row: EditableSecurityUser;
  readOnly: boolean;
  onOpenDetail: (userId: string) => void;
  onEditName: (userId: string) => void;
}) {
  return (
    <div className={gestionaleListTableActionsGroupEnd}>
      {!readOnly ? (
        <IconActionButton
          type="button"
          label="Modifica profilo"
          className={dsTableActionBtnSecondary}
          onClick={() => onEditName(row.id)}
        >
          <HubIconPencil className={dsTableActionGlyph} />
        </IconActionButton>
      ) : null}
      <IconActionButton
        type="button"
        label="Dettaglio utente"
        className={dsTableActionBtnInfo}
        onClick={() => onOpenDetail(row.id)}
      >
        <IconInfo />
      </IconActionButton>
    </div>
  );
}

function SecurityUserTableRow({
  row,
  readOnly,
  knownClienti,
  onOpenDetail,
  onEditName,
  onRoleChange,
  onPatch,
  roleSelectItems,
}: {
  row: EditableSecurityUser;
  readOnly: boolean;
  knownClienti?: Set<string>;
  onOpenDetail: (userId: string) => void;
  onEditName: (userId: string) => void;
  onRoleChange: (userId: string, ruolo: string) => void;
  onPatch: (userId: string, patch: Partial<EditableSecurityUser>) => void;
  roleSelectItems: { value: string; label: string }[];
}) {
  const editorProps: RowEditorProps = { row, readOnly, knownClienti, onRoleChange, onPatch, roleSelectItems };
  return (
    <GestionaleListTableRow>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <UserIdentityCell row={row} />
      </td>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <SecurityUserRoleField {...editorProps} />
      </td>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <SecurityUserClienteField {...editorProps} />
      </td>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <SecurityUserPortalField row={row} />
      </td>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <PermissionsBadge row={row} />
      </td>
      <td className={`min-w-0 ${securityUsersTableTd}`}>
        <SecurityStatusBadge lastSignInAt={row.lastSignInAt} accountEnabled={row.accountEnabled} />
      </td>
      <td className={gestionaleListTableTdAzioni}>
        <SecurityUserRowActions row={row} readOnly={readOnly} onOpenDetail={onOpenDetail} onEditName={onEditName} />
      </td>
    </GestionaleListTableRow>
  );
}

function SecurityUserMobileCard({
  row,
  readOnly,
  knownClienti,
  onOpenDetail,
  onEditName,
  onRoleChange,
  onPatch,
  roleSelectItems,
}: {
  row: EditableSecurityUser;
  readOnly: boolean;
  knownClienti?: Set<string>;
  onOpenDetail: (userId: string) => void;
  onEditName: (userId: string) => void;
  onRoleChange: (userId: string, ruolo: string) => void;
  onPatch: (userId: string, patch: Partial<EditableSecurityUser>) => void;
  roleSelectItems: { value: string; label: string }[];
}) {
  const associationErr = rowClienteAssociationError(row, knownClienti);
  const isClienteRole = row.ruolo === "cliente";
  const editorProps: RowEditorProps = {
    row,
    readOnly,
    knownClienti,
    onRoleChange,
    onPatch,
    roleSelectItems,
    density: "mobile",
    roleInputClassName: securityDenseSelectBase,
  };
  const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";
  const clienteBlockClass = associationErr
    ? "space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_6%,var(--cab-surface))] p-2.5"
    : "space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-2.5";
  const cardAccentClass = associationErr
    ? "ring-1 ring-[color:color-mix(in_srgb,var(--cab-warning)_25%,var(--cab-border))]"
    : "";

  return (
    <CardMobile className={`gap-3 !p-3 sm:!p-3.5 ${cardAccentClass}`.trim()}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={identityPrimaryClass}>{securityUserDisplayName(row)}</p>
          <p className={`mt-0.5 ${identitySecondaryClass}`}>{row.email || "—"}</p>
          {row.username ? <p className={`mt-0.5 ${identityUsernameClass}`}>@{row.username}</p> : null}
        </div>
        <SecurityStatusBadge lastSignInAt={row.lastSignInAt} accountEnabled={row.accountEnabled} align="end" />
      </div>

      <div className="space-y-3 border-t border-[color:var(--cab-border)] pt-3">
        <div className="space-y-1.5">
          <span className={fieldLabel}>Ruolo</span>
          <SecurityUserRoleField {...editorProps} />
        </div>

        {isClienteRole ? (
          <div className={clienteBlockClass}>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[color:var(--cab-text)]">Cliente per portale</p>
              <p className="mt-0.5 text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
                Collega l&apos;utente all&apos;anagrafica mezzi
              </p>
            </div>
            <SecurityUserClienteField {...editorProps} />
          </div>
        ) : null}

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-[color:var(--cab-border)] pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={fieldLabel}>{PORTALE_CLIENTI_LABEL}</span>
            <SecurityUserPortalField row={row} />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className={fieldLabel}>Permessi</span>
            <PermissionsBadge row={row} />
          </div>
        </div>
      </div>

      <CardMobileActions>
        {!readOnly ? (
          <button type="button" className={dsBtnGhost} onClick={() => onEditName(row.id)}>
            Modifica profilo
          </button>
        ) : null}
        <button type="button" className={dsBtnGhost} onClick={() => onOpenDetail(row.id)}>
          Dettaglio
        </button>
      </CardMobileActions>
    </CardMobile>
  );
}

function SecurityUsersTableSkeleton() {
  return (
    <LoadingTableSkeleton
      preset="generic"
      visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
      wrapClassName={dsScrollbar}
      className="min-h-[24rem]"
    />
  );
}

type Props = {
  rows: EditableSecurityUser[];
  loading: boolean;
  readOnly: boolean;
  assignableRoles?: { key: string; name: string }[];
  knownClienti?: Set<string>;
  currentUserId?: string | null;
  onRowsChange: (rows: EditableSecurityUser[]) => void;
  onOpenDetail: (userId: string) => void;
  onRoleChange?: (userId: string, ruolo: string) => void;
};

export function SecurityUsersTable({
  rows,
  loading,
  readOnly,
  assignableRoles,
  knownClienti,
  currentUserId,
  onRowsChange,
  onOpenDetail,
  onRoleChange,
}: Props) {
  const userId = useAuthUserId();
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "lg" });
  const queryClient = useQueryClient();
  const gestToast = useGestionaleToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "disabled">("all");
  const [filtersExpanded, setFiltersExpanded] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "security-users", key: "filters", userId }),
  );
  const [sortColumn, setSortColumn] = useState<SecurityUserSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");
  const [editNameUserId, setEditNameUserId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const roleSelectItems = useMemo(
    () =>
      assignableRoles?.length
        ? assignableRoles.map((r) => ({ value: r.key, label: r.name }))
        : APP_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
    [assignableRoles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (roleFilter !== "all") list = list.filter((r) => r.ruolo === roleFilter);
    if (accountFilter === "active") list = list.filter((r) => r.accountEnabled !== false);
    if (accountFilter === "disabled") list = list.filter((r) => r.accountEnabled === false);
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
  }, [rows, search, roleFilter, accountFilter, sortColumn, sortPhase]);

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

  const editNameUser = editNameUserId ? (rows.find((r) => r.id === editNameUserId) ?? null) : null;

  async function handleDeleteUser(userId: string) {
    setDeletePending(true);
    try {
      const res = await deleteUserByAdminAction(userId);
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      onRowsChange(rows.filter((r) => r.id !== userId));
      setEditNameUserId(null);
      await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient });
      await queryClient.invalidateQueries({ queryKey: QK.securityUsersPermissions });
      gestToast.successOnce("security-user-delete", "Utente eliminato.");
    } finally {
      setDeletePending(false);
    }
  }

  function handleSort(key: SecurityUserSortKey) {
    const next = cycleReportSort(sortColumn, sortPhase, key);
    setSortColumn(next.column);
    setSortPhase(next.phase);
    resetPage();
  }

  function patchRow(userId: string, patch: Partial<EditableSecurityUser>) {
    onRowsChange(rows.map((r) => (r.id === userId ? { ...r, ...patch } : r)));
  }

  function handleRoleChange(userId: string, ruolo: string) {
    const resolved = resolveRole(ruolo);
    onRowsChange(rows.map((r) => (r.id === userId ? applyRoleToRow(r, resolved) : r)));
    onRoleChange?.(userId, ruolo);
  }

  const filtersActive = roleFilter !== "all" || accountFilter !== "all";
  const searchActive = search.trim().length > 0;

  function resetFilters() {
    setRoleFilter("all");
    setAccountFilter("all");
    resetPage();
  }

  function resetSearch() {
    setSearch("");
    resetPage();
  }

  if (loading) {
    return (
      <div ref={listLayoutRef} className={`min-w-0 max-w-full ${listLayoutClassName}`.trim()}>
        <SecurityUsersTableSkeleton />
      </div>
    );
  }

  const rowProps = {
    readOnly,
    knownClienti,
    onOpenDetail,
    onEditName: setEditNameUserId,
    onRoleChange: handleRoleChange,
    onPatch: patchRow,
    roleSelectItems,
  };

  return (
    <div ref={listLayoutRef} className={`min-w-0 max-w-full ${listLayoutClassName}`.trim()}>
    <>
      <PageToolbar
        className="mb-3"
        search={
          <GestionaleSearchField
            id="security-users-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Cerca per nome, username o email…"
            aria-label="Cerca utente"
            wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
          />
        }
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((o) => !o)}
        filtersActive={filtersActive}
        filterDrawerTitle="Filtra utenti"
        onFilterReset={resetFilters}
        filtersPanel={
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label className="flex min-w-0 flex-col gap-1 sm:max-w-xs">
              <span className="text-[11px] font-medium text-[color:var(--cab-text-muted)]">Ruolo</span>
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
            <label className="flex min-w-0 flex-col gap-1 sm:max-w-xs">
              <span className="text-[11px] font-medium text-[color:var(--cab-text-muted)]">Stato account</span>
              <GlobalSelect
                selectOnly
                variant="filter"
                value={accountFilter}
                onChange={(v) => {
                  setAccountFilter(v as "all" | "active" | "disabled");
                  resetPage();
                }}
                aria-label="Filtra stato account"
                items={[
                  { value: "all", label: "Tutti" },
                  { value: "active", label: "Attivi" },
                  { value: "disabled", label: "Disattivati" },
                ]}
              />
            </label>
          </div>
        }
        meta={
          <PageToolbarResultCount
            count={filtered.length}
            filtersActive={filtersActive}
            searchActive={searchActive}
            onFilterReset={resetFilters}
            onSearchReset={resetSearch}
            singularLabel="utente"
            pluralLabel="utenti"
          />
        }
      />

      {filtered.length === 0 ? (
        <>
          {listLayout === "desktop" ? (
          <GestionaleListTable
            visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
            className={securityUsersTableClass}
            colSpan={SECURITY_USERS_COL_COUNT}
            empty
            emptyMessage="Nessun utente corrisponde ai filtri."
            headRow={
              <>
                <GlobalTableHeadLabel label="Identità" />
                <GlobalTableHeadLabel label="Ruolo" />
                <GlobalTableHeadLabel label="Cliente associato" />
                <GlobalTableHeadLabel label={`Accesso ${PORTALE_CLIENTI_LABEL}`} />
                <GlobalTableHeadLabel label="Permessi" />
                <GlobalTableHeadLabel label="Stato account" />
                <GestionaleListTableActionsHead />
              </>
            }
          >
            {null}
          </GestionaleListTable>
          ) : (
          <p className={gestionaleListTableMobileEmptyClass}>Nessun utente corrisponde ai filtri.</p>
          )}
        </>
      ) : (
        <>
          {listLayout === "desktop" ? (
          <GestionaleListTable
            visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
            className={securityUsersTableClass}
            colSpan={SECURITY_USERS_COL_COUNT}
            colgroup={
              <>
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className={gestionaleListColAzioniClass} />
              </>
            }
            headRow={
              <>
                <GlobalTableSortTh label="Identità" columnKey="nome" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <GlobalTableSortTh label="Ruolo" columnKey="ruolo" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <GlobalTableSortTh
                  label="Cliente associato"
                  columnKey="clienteRef"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={handleSort}
                />
                <GlobalTableSortTh
                  label={`Accesso ${PORTALE_CLIENTI_LABEL}`}
                  columnKey="clientAccess"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={handleSort}
                />
                <GlobalTableHeadLabel label="Permessi" />
                <GlobalTableSortTh label="Stato account" columnKey="stato" sortColumn={sortColumn} sortPhase={sortPhase} onSort={handleSort} />
                <GestionaleListTableActionsHead />
              </>
            }
          >
            {paged.map((row) => (
              <SecurityUserTableRow key={row.id} row={row} {...rowProps} />
            ))}
          </GestionaleListTable>
          ) : null}

          {listLayout === "mobile" ? (
          <div className="space-y-3">
            {paged.map((row) => (
              <SecurityUserMobileCard key={row.id} row={row} {...rowProps} />
            ))}
          </div>
          ) : null}

          {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={pagerLabel} /> : null}
        </>
      )}

      {editNameUser ? (
        <SecurityEditNameModal
          open
          userId={editNameUser.id}
          initialNome={editNameUser.nome}
          initialCognome={editNameUser.cognome}
          initialUsername={editNameUser.username ?? ""}
          userEmail={editNameUser.email}
          readOnly={readOnly}
          canDelete={!readOnly && editNameUser.id !== currentUserId}
          deletePending={deletePending}
          onClose={() => setEditNameUserId(null)}
          onSave={(values: SecurityEditProfileValues) => {
            patchRow(editNameUser.id, {
              nome: values.nome,
              cognome: values.cognome,
              username: values.username,
            });
            setEditNameUserId(null);
          }}
          onDelete={() => handleDeleteUser(editNameUser.id)}
        />
      ) : null}
    </>
    </div>
  );
}

