"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { useCallback, useEffect, useState } from "react";
import { VatCodesAdminSection } from "@/components/dashboard/settings/vat-codes-admin-section";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { downloadAccountingCsv } from "@/lib/fatturazione/accounting-export";
import { ACCOUNTING_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { dsPageToolbarBtn, dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";
import { gestionaleListTableTd, gestionaleListTableRowClass } from "@/lib/ui/gestionale-list-table";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type {
  AccountingEntryRow,
  AccountingFiscalYearRow,
  AccountingPeriodRow,
  AccountingPeriodStatus,
} from "@/src/types/supabase-tables";

type FiscalYearWithPeriods = AccountingFiscalYearRow & { periods: AccountingPeriodRow[] };

function periodStatusLabel(status: AccountingPeriodStatus): string {
  if (status === "OPEN") return "Aperto";
  if (status === "CLOSED") return "Chiuso";
  return "Bloccato";
}

function periodStatusClass(status: AccountingPeriodStatus): string {
  if (status === "OPEN") return "bg-emerald-100 text-emerald-800";
  if (status === "CLOSED") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

export function FatturazioneContabilitaSection() {
  const [entries, setEntries] = useState<AccountingEntryRow[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYearWithPeriods[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<AccountingEntryRow | null>(null);
  const [reverseDate, setReverseDate] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const c = getBrowserSupabase();
    const [entriesRes, periodsRes] = await Promise.all([
      c.from("accounting_entries").select(ACCOUNTING_ENTRIES_COLUMNS).order("entry_date", { ascending: false }),
      c.rpc("accounting_list_fiscal_periods"),
    ]);
    if (entriesRes.error) setError(entriesRes.error.message);
    else setEntries((entriesRes.data ?? []) as AccountingEntryRow[]);
    if (periodsRes.error) setError(periodsRes.error.message);
    else setFiscalYears((periodsRes.data ?? []) as FiscalYearWithPeriods[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function runPeriodAction(
    rpc: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    setActionLoading(true);
    setError(null);
    const { error: rpcError } = await getBrowserSupabase().rpc(rpc, params);
    setActionLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await reload();
  }

  async function confirmReverse(): Promise<void> {
    if (!reverseTarget || !reverseDate) return;
    setActionLoading(true);
    setError(null);
    const { error: rpcError } = await getBrowserSupabase().rpc("accounting_reverse_entry", {
      p_entry_id: reverseTarget.id,
      p_reversal_date: reverseDate,
      p_reason: reverseReason || null,
      p_idempotency_key: null,
    });
    setActionLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setReverseTarget(null);
    setReverseDate("");
    setReverseReason("");
    await reload();
  }

  const immutableHint =
    "Scrittura contabilizzata e non modificabile. Per correggerla utilizzare Storno e nuova scrittura.";

  return (
    <div className="space-y-6">
      <ShellCard>
        <VatCodesAdminSection />
      </ShellCard>
      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Esercizi e periodi contabili</h2>
        <p className={`${dsTypoSmall} mt-1`}>
          Ogni esercizio contiene 12 periodi mensili. La chiusura esercizio richiede tutti i periodi chiusi o bloccati.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <p className={`${dsTypoSmall} mt-4`}>Caricamento…</p>
        ) : fiscalYears.length === 0 ? (
          <p className={`${dsTypoSmall} mt-4`}>Nessun esercizio configurato.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {fiscalYears.map((fy) => (
              <div key={fy.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">Esercizio {fy.year}</span>
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs ${fy.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {fy.status === "OPEN" ? "Aperto" : "Chiuso"}
                    </span>
                  </div>
                  {fy.status === "OPEN" ? (
                    <button
                      type="button"
                      className={dsPageToolbarBtn}
                      disabled={actionLoading}
                      onClick={() => void runPeriodAction("accounting_close_fiscal_year", { p_fiscal_year_id: fy.id })}
                    >
                      Chiudi esercizio
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(fy.periods ?? []).map((p) => (
                    <div key={p.id} className="rounded border border-border/60 p-2 text-sm">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium whitespace-nowrap">{p.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs whitespace-nowrap ${periodStatusClass(p.status)}`}>
                          {periodStatusLabel(p.status)}
                        </span>
                      </div>
                      {p.lock_reason ? (
                        <p className={`${dsTypoSmall} mt-1 text-muted-foreground`}>{p.lock_reason}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.status === "OPEN" ? (
                          <button
                            type="button"
                            className="text-xs underline"
                            disabled={actionLoading}
                            onClick={() =>
                              void runPeriodAction("accounting_close_accounting_period", {
                                p_period_id: p.id,
                                p_reason: null,
                              })
                            }
                          >
                            Chiudi
                          </button>
                        ) : null}
                        {p.status === "CLOSED" ? (
                          <>
                            <button
                              type="button"
                              className="text-xs underline"
                              disabled={actionLoading}
                              onClick={() => {
                                const reason = window.prompt("Motivo blocco periodo:");
                                if (reason) {
                                  void runPeriodAction("accounting_lock_accounting_period", {
                                    p_period_id: p.id,
                                    p_reason: reason,
                                  });
                                }
                              }}
                            >
                              Blocca
                            </button>
                            <button
                              type="button"
                              className="text-xs underline"
                              disabled={actionLoading}
                              onClick={() =>
                                void runPeriodAction("accounting_reopen_accounting_period", {
                                  p_period_id: p.id,
                                  p_reason: null,
                                })
                              }
                            >
                              Riapri
                            </button>
                          </>
                        ) : null}
                        {p.status === "LOCKED" ? (
                          <span className={`${dsTypoSmall} text-muted-foreground`}>Non riapribile</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ShellCard>

      <ShellCard>
        <h2 className={dsTypoSectionTitle}>Scritture contabili</h2>
        <p className={`${dsTypoSmall} mt-1`}>
          {loading ? "Caricamento…" : `${entries.length} scritture.`} {immutableHint}
        </p>
        <button
          type="button"
          className={`${dsPageToolbarBtn} mt-4`}
          disabled={loading || entries.length === 0}
          onClick={() => downloadAccountingCsv(entries)}
        >
          Esporta CSV commercialista
        </button>
        {!loading && entries.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">N.</th>
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 pr-2">Descrizione</th>
                  <th className="py-2 pr-2">Stato</th>
                  <th className="py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className={gestionaleListTableRowClass}>
                    <td className={gestionaleListTableTd}>
                      {e.entry_number != null ? `${e.entry_number}/${e.fiscal_year ?? "—"}` : "—"}
                    </td>
                    <td className={gestionaleListTableTd}>{e.competence_date ?? e.entry_date}</td>
                    <td className={gestionaleListTableTd}>{e.description}</td>
                    <td className={gestionaleListTableTd}>{e.status}</td>
                    <td className={gestionaleListTableTd}>
                      {e.status === "posted" && !e.reversed_by_entry_id ? (
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => {
                            setReverseTarget(e);
                            setReverseDate(new Date().toISOString().slice(0, 10));
                          }}
                        >
                          Storna scrittura
                        </button>
                      ) : e.status === "posted" || e.status === "reversed" ? (
                        <span className={`${dsTypoSmall} text-muted-foreground`}>Non modificabile</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ShellCard>

      <GestionaleConfirmDialog
        open={reverseTarget != null}
        title="Storna scrittura"
        message={
          reverseTarget
            ? `Storno della scrittura ${reverseTarget.entry_number ?? "—"}. Verrà registrato nel periodo OPEN della data indicata. L'originale resterà immutata.`
            : ""
        }
        confirmLabel={actionLoading ? "Elaborazione…" : "Conferma storno"}
        cancelLabel="Annulla"
        pending={actionLoading}
        confirmDisabled={actionLoading || !reverseDate}
        onConfirm={() => void confirmReverse()}
        onCancel={() => {
          setReverseTarget(null);
          setReverseDate("");
          setReverseReason("");
        }}
      >
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Data storno (obbligatoria)
            <input
              type="date"
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={reverseDate}
              onChange={(ev) => setReverseDate(ev.target.value)}
            />
          </label>
          <label className="block text-sm">
            Motivazione
            <textarea
              className="mt-1 w-full rounded border border-border px-2 py-1"
              rows={2}
              value={reverseReason}
              onChange={(ev) => setReverseReason(ev.target.value)}
            />
          </label>
        </div>
      </GestionaleConfirmDialog>
    </div>
  );
}
