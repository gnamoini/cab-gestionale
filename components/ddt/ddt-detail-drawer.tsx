"use client";

import { useCallback, useState } from "react";
import { Drawer, LoadingButton } from "@/components/design-system";
import { formatDdtDate } from "@/components/ddt/ddt-status-badge";
import { openDdtPdfInNewTab } from "@/lib/ddt/ddt-pdf";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { dsBtnNeutralForm } from "@/lib/ui/design-system";
import type { DdtDetail } from "@/lib/ddt/types";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function DdtDetailDrawer({
  detail,
  open,
  onClose,
  canWrite,
  isAdmin,
  canRegenerate = false,
  regenerateBusy = false,
  onRegenerate,
  onChanged,
}: {
  detail: DdtDetail | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  isAdmin: boolean;
  canRegenerate?: boolean;
  regenerateBusy?: boolean;
  onRegenerate?: () => void;
  onChanged: () => void;
}) {
  const isMobile = useMaxMdDown();
  const toast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [busy, setBusy] = useState(false);
  const doc = detail?.document;

  const printPdf = useCallback(async () => {
    if (!doc || busy) return;
    setBusy(true);
    try {
      await openDdtPdfInNewTab(doc.id);
    } catch (e) {
      toast.errorOnce("ddt-print", e);
    } finally {
      setBusy(false);
    }
  }, [busy, doc, toast]);

  const markDelivered = useCallback(async () => {
    if (!doc || busy || !canWrite) return;
    setBusy(true);
    try {
      const res = await ddtEntry.markConsegnato(doc.id);
      if (!res.success) throw new Error(res.error ?? "Operazione non riuscita.");
      toast.successOnce("ddt-delivered", "DDT segnato come consegnato.");
      onChanged();
    } catch (e) {
      toast.errorOnce("ddt-delivered", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canWrite, doc, onChanged, toast]);

  const cancel = useCallback(async () => {
    if (!doc || busy || !isAdmin) return;
    const ok = await confirm({
      title: "Annullare DDT",
      message: "Annullare questo DDT?",
      confirmLabel: "Annulla DDT",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await ddtEntry.cancel(doc.id);
      if (!res.success) throw new Error(res.error ?? "Annullamento non riuscito.");
      toast.successOnce("ddt-cancel", "DDT annullato.");
      onChanged();
      onClose();
    } catch (e) {
      toast.errorOnce("ddt-cancel", e);
    } finally {
      setBusy(false);
    }
  }, [busy, confirm, isAdmin, doc, onChanged, onClose, toast]);

  if (!doc || !detail) return null;

  const canPrint = doc.status !== "bozza" && doc.status !== "annullato";
  const canDeliver = canWrite && (doc.status === "confermato" || doc.status === "stampato");
  const canCancel = isAdmin && doc.status !== "annullato" && doc.status !== "consegnato";
  const showRegenerate = canRegenerate && canWrite && doc.status !== "annullato";

  const body = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--cab-text)]">{ddtDisplayNumber(doc)}</h3>
          <p className="text-sm text-[color:var(--cab-text-muted)]">{doc.cliente_label}</p>
        </div>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Data documento</dt>
          <dd>{formatDdtDate(doc.data_documento)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Data consegna</dt>
          <dd>{formatDdtDate(doc.data_consegna)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Causale</dt>
          <dd>{doc.causale_trasporto ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Vettore</dt>
          <dd>{doc.vettore ?? "—"}</dd>
        </div>
      </dl>
      {doc.note?.trim() ? (
        <div>
          <p className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Note</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{doc.note}</p>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Righe</p>
        <div className="overflow-x-auto rounded border border-[color:var(--cab-border)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)]">
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase">Codice</th>
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase">Descrizione</th>
                <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase">Qty</th>
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase">U.M.</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--cab-border)] last:border-0">
                  <td className="px-2 py-1 font-mono text-xs">{r.codice ?? "—"}</td>
                  <td className="px-2 py-1">{r.descrizione}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.quantita}</td>
                  <td className="px-2 py-1">{r.unita_misura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-[color:var(--cab-border)] pt-4">
        {canPrint ? (
          <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={() => void printPdf()}>
            Stampa PDF
          </LoadingButton>
        ) : null}
        {canDeliver ? (
          <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={() => void markDelivered()}>
            Segna consegnato
          </LoadingButton>
        ) : null}
        {showRegenerate && onRegenerate ? (
          <LoadingButton
            type="button"
            className={dsBtnNeutralForm}
            loading={busy || regenerateBusy}
            onClick={() => void onRegenerate()}
          >
            Rigenera DDT
          </LoadingButton>
        ) : null}
        {canCancel ? (
          <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={() => void cancel()}>
            Annulla
          </LoadingButton>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Dettaglio DDT"
        ariaLabel="Dettaglio DDT"
        asideClassName={isMobile ? undefined : resolveDrawerAsideClasses("drawerLog")}
      >
        {body}
      </Drawer>
      {confirmDialog}
    </>
  );
}
