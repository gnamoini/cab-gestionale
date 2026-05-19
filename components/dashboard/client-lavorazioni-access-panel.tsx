"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listClientLavorazioniAccessByAdminAction, setClientLavorazioniAccessByAdminAction, type ClientLavorazioniAccessRow } from "@/src/actions/client-lavorazioni-access";
import { ShellCard } from "@/components/gestionale/shell-card";
import { roleLabel, type AppRole, hasPermission } from "@/lib/auth/rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";
import {
  dsTable,
  dsTableEmptyCell,
  dsTableHeadCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  dsPageToolbarBtn,
} from "@/lib/ui/design-system";

function RoleBadge({ role }: { role: AppRole }) {
  const tone =
    role === "admin"
      ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/35 dark:text-red-200"
      : role === "operatore"
        ? "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-200"
        : "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>{roleLabel(role)}</span>
  );
}

export function ClientLavorazioniAccessPanel() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ClientLavorazioniAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listClientLavorazioniAccessByAdminAction();
    if (!res.ok) {
      setError(res.message);
      setRows([]);
    } else {
      setRows(res.rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(row: ClientLavorazioniAccessRow, enabled: boolean) {
    if (hasPermission(row.ruolo, "viewClientLavorazioni")) return;
    setPendingId(row.id);
    const res = await setClientLavorazioniAccessByAdminAction({ userId: row.id, enabled });
    setPendingId(null);
    if (!res.ok) {
      window.alert(res.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: QK.clientLavorazioniAccess });
    await load();
  }

  return (
    <ShellCard title="Accesso Lavorazioni Clienti">
      <p className="mb-4 text-sm text-[color:var(--cab-text-muted)]">
        Abilita la dashboard read-only <strong className="text-[color:var(--cab-text)]">Lavorazioni (Clienti)</strong> per utenti
        selezionati. Gli admin hanno sempre accesso; default disabilitato per gli altri.
      </p>
      <div className="mb-3 flex justify-end">
        <button type="button" className={dsPageToolbarBtn} onClick={() => void load()} disabled={loading}>
          {loading ? "Aggiornamento…" : "Aggiorna"}
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <div className={dsTableWrap}>
        <table className={`${dsTable} text-xs`}>
          <thead>
            <tr>
              <th className={dsTableHeadCell}>Utente</th>
              <th className={dsTableHeadCell}>Email</th>
              <th className={dsTableHeadCell}>Ruolo</th>
              <th className={dsTableHeadCell}>Accesso portale</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={dsTableEmptyCell}>
                  Caricamento…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={dsTableEmptyCell}>
                  Nessun utente registrato.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isAdmin = hasPermission(row.ruolo, "manageUsers");
                return (
                  <tr key={row.id} className={dsTableRow}>
                    <td className={`${dsTableTd} font-medium`}>{row.nome}</td>
                    <td className={dsTableTd}>{row.email || "—"}</td>
                    <td className={dsTableTd}>
                      <RoleBadge role={row.ruolo} />
                    </td>
                    <td className={dsTableTd}>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300"
                          checked={row.enabled}
                          disabled={isAdmin || pendingId === row.id}
                          onChange={(e) => void toggle(row, e.target.checked)}
                        />
                        <span className="text-[color:var(--cab-text-muted)]">{isAdmin ? "Sempre attivo" : row.enabled ? "ON" : "OFF"}</span>
                      </label>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </ShellCard>
  );
}
