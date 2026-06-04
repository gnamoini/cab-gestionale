"use client";

import { useQuery } from "@tanstack/react-query";
import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import { SecurityUserModulePermissionsEditor } from "@/components/dashboard/security/security-user-module-permissions-editor";
import type { ModulePermissionDraftRow } from "@/lib/security/user-module-permissions";
import { Drawer, LoadingFormSkeleton } from "@/components/design-system";
import type { SecurityUserPermissionRow } from "@/src/actions/security-users-permissions";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AuthLogWithProfileRow, LogModificaRow } from "@/src/types/supabase-tables";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

type UserActivityRow = {
  id: string;
  action: string;
  entita: string;
  when: string;
  actor: string;
  detail: string;
};

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function fmtNullableWhen(iso: string | null): string {
  return iso ? fmtWhen(iso) : "—";
}

function payloadDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const o = payload as Record<string, unknown>;
  if (typeof o.compact === "string") return o.compact;
  if (typeof o.event === "string") return o.event;
  if ("before" in o || "after" in o) return "Modifica dati";
  if ("snapshot" in o) return "Snapshot record";
  return "Evento registrato";
}

function useUserActivity(userId: string | null, enabled: boolean) {
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: [...QK.log, "security-user-activity", userId],
    enabled: enabled && !!userId,
    ...securityOpts,
    queryFn: async (): Promise<UserActivityRow[]> => {
      if (!userId) return [];
      const sb = getBrowserSupabase();
      const [audit, auth] = await Promise.all([
        sb
          .from("log_modifiche")
          .select("*, profiles!log_modifiche_autore_id_fkey(id,nome)")
          .eq("autore_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        sb
          .from("auth_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (audit.error) throw new Error(audit.error.message);
      if (auth.error) throw new Error(auth.error.message);

      const auditRows = ((audit.data ?? []) as Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>).map(
        (r) => ({
          id: `audit-${r.id}`,
          action: r.azione,
          entita: r.entita,
          when: r.created_at,
          actor: r.profiles?.nome?.trim() || "—",
          detail: payloadDetail(r.payload),
        }),
      );
      const authRows = ((auth.data ?? []) as AuthLogWithProfileRow[]).map((r) => ({
        id: `auth-${r.id}`,
        action: r.action.toUpperCase(),
        entita: "auth",
        when: r.created_at,
        actor: r.email,
        detail: r.action === "login" ? "Login" : r.action === "logout" ? "Logout" : "Login fallito",
      }));
      return [...auditRows, ...authRows].sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 50);
    },
  });
}

type Props = {
  user: SecurityUserPermissionRow | null;
  open: boolean;
  readOnly: boolean;
  permissionRows: UserPermissionRow[];
  moduleDraft: ModulePermissionDraftRow[];
  onModuleDraftChange: (rows: ModulePermissionDraftRow[]) => void;
  onRestoreModuleFromRole: () => void;
  onClose: () => void;
};

export function SecurityUserDetailDrawer({
  user,
  open,
  readOnly,
  permissionRows,
  moduleDraft,
  onModuleDraftChange,
  onRestoreModuleFromRole,
  onClose,
}: Props) {
  const activityQ = useUserActivity(user?.id ?? null, open && !!user);

  return (
    <Drawer open={open && !!user} onClose={onClose} title="Scheda utente" ariaLabel="Scheda utente">
      {!user ? null : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[color:var(--cab-text)]">{user.nome}</h3>
                <p className="mt-0.5 truncate text-xs text-[color:var(--cab-text-muted)]">{user.email || "Email non disponibile"}</p>
              </div>
              <SecurityRoleBadge role={user.ruolo} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Creato</dt>
                <dd className="text-right tabular-nums text-[color:var(--cab-text)]">{fmtNullableWhen(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Ultimo accesso</dt>
                <dd className="text-right tabular-nums text-[color:var(--cab-text)]">{fmtNullableWhen(user.lastSignInAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Id profilo</dt>
                <dd className="max-w-[12rem] truncate text-right font-mono text-[10px] text-[color:var(--cab-text)]">{user.id}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
            <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Permessi pagine</h3>
            <div className="mt-2">
              <SecurityUserModulePermissionsEditor
                userId={user.id}
                ruolo={user.ruolo}
                readOnly={readOnly}
                permissionRows={permissionRows}
                draft={moduleDraft}
                onDraftChange={onModuleDraftChange}
                onRestoreFromRole={onRestoreModuleFromRole}
              />
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
            <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Attività recenti (utente)</h3>
            </div>
            <div className="gestionale-scrollbar max-h-[min(28dvh,20rem)] overflow-y-auto">
              {activityQ.isLoading ? (
                <div className="p-3" aria-busy="true" role="status" aria-label="Caricamento attività">
                  <LoadingFormSkeleton fields={4} />
                </div>
              ) : activityQ.isError ? (
                <p className="p-3 text-sm text-[color:var(--cab-danger)]">{activityQ.error.message}</p>
              ) : (activityQ.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessuna attività recente.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--cab-border)]">
                  {(activityQ.data ?? []).map((row) => (
                    <li key={row.id} className="px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--cab-text)]">{row.action}</span>
                        <span className="tabular-nums text-[color:var(--cab-text-muted)]">{fmtWhen(row.when)}</span>
                      </div>
                      <p className="mt-1 text-[color:var(--cab-text-muted)]">
                        {row.entita} · {row.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
