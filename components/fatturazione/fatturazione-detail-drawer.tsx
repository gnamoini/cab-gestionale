"use client";

import { useCallback, useState } from "react";
import { Drawer, LoadingButton } from "@/components/design-system";
import { FatturaEliminaConfirmDialog } from "@/components/fatturazione/fattura-elimina-confirm-dialog";
import {
  FatturaStatusBadge,
  formatInvoiceDate,
  formatInvoiceMoney,
} from "@/components/fatturazione/fattura-status-badge";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { dsBtnNeutralForm } from "@/lib/ui/design-system";
import type { InvoiceDetail } from "@/lib/fatturazione/types";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { invoiceIsDeletable, invoicesService } from "@/src/services/invoices.service";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function FatturazioneDetailDrawer({
  detail,
  open,
  onClose,
  canWrite,
  isAdmin,
  onChanged,
  onRegisterPayment,
  onEditDraft,
}: {
  detail: InvoiceDetail | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  isAdmin: boolean;
  onChanged: () => void;
  onRegisterPayment: () => void;
  onEditDraft?: () => void;
}) {
  const isMobile = useMaxMdDown();
  const toast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [busy, setBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const inv = detail?.invoice;

  const issue = useCallback(
    async (status: "emessa" | "inviata") => {
      if (!inv || busy) return;
      setBusy(true);
      try {
        const res = await invoicesService.issue(inv.id, status);
        if (!res.success) throw new Error(res.error ?? "Operazione non riuscita.");
        toast.successOnce("fatt-issue", status === "emessa" ? "Fattura emessa." : "Fattura segnata come inviata.");
        onChanged();
      } catch (e) {
        toast.errorOnce("fatt-issue", e);
      } finally {
        setBusy(false);
      }
    },
    [busy, inv, onChanged, toast],
  );

  const cancel = useCallback(async () => {
    if (!inv || busy || !isAdmin) return;
    const ok = await confirm({
      title: "Annullare fattura",
      message: "Confermi l'annullamento di questa fattura?",
      confirmLabel: "Annulla fattura",
      destructive: true,
    });
    if (!ok) return;
    const reason = "";
    setBusy(true);
    try {
      const res = await invoicesService.cancel(inv.id, reason);
      if (!res.success) throw new Error(res.error ?? "Annullamento non riuscito.");
      toast.successOnce("fatt-cancel", "Fattura annullata.");
      onChanged();
      onClose();
    } catch (e) {
      toast.errorOnce("fatt-cancel", e);
    } finally {
      setBusy(false);
    }
  }, [busy, confirm, isAdmin, inv, onChanged, onClose, toast]);

  const removeDraft = useCallback(async () => {
    if (!inv || busy || !canWrite) return;
    setBusy(true);
    try {
      const res = await invoicesService.remove(inv.id);
      if (!res.success) throw new Error(res.error ?? "Eliminazione non riuscita.");
      toast.successOnce("fatt-delete", "Fattura eliminata.");
      setDeleteConfirmOpen(false);
      onChanged();
      onClose();
    } catch (e) {
      toast.errorOnce("fatt-delete", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canWrite, inv, onChanged, onClose, toast]);

  if (!inv || !detail) return null;

  const canPay =
    canWrite &&
    inv.residuo > 0 &&
    inv.status !== "bozza" &&
    inv.status !== "da_verificare" &&
    inv.status !== "annullata";
  const isDraft = inv.status === "bozza" || inv.status === "da_verificare";
  const canDeleteDraft = canWrite && invoiceIsDeletable(inv.status);

  const body = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--cab-text)]">{invoiceDisplayNumber(inv)}</h3>
          <p className="text-sm text-[color:var(--cab-text-muted)]">{inv.cliente_label}</p>
        </div>
        <FatturaStatusBadge status={inv.status} />
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Emissione</dt>
          <dd>{formatInvoiceDate(inv.data_emissione)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Scadenza</dt>
          <dd>{formatInvoiceDate(inv.data_scadenza)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Imponibile</dt>
          <dd>{formatInvoiceMoney(inv.imponibile)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">IVA</dt>
          <dd>{formatInvoiceMoney(inv.iva)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Totale</dt>
          <dd className="font-semibold">{formatInvoiceMoney(inv.totale)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Residuo</dt>
          <dd className="font-semibold">{formatInvoiceMoney(inv.residuo)}</dd>
        </div>
      </dl>
      {inv.note ? (
        <div>
          <p className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Note</p>
          <p className="text-sm whitespace-pre-wrap">{inv.note}</p>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Righe</p>
        <ul className="divide-y divide-[color:var(--cab-border)] rounded border border-[color:var(--cab-border)]">
          {detail.rows.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <p className="font-medium">{r.descrizione}</p>
              <p className="text-[color:var(--cab-text-muted)]">
                {r.quantita} × {formatInvoiceMoney(r.prezzo_unitario)} — {formatInvoiceMoney(r.totale)}
              </p>
            </li>
          ))}
        </ul>
      </div>
      {detail.payments.length ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Pagamenti</p>
          <ul className="divide-y divide-[color:var(--cab-border)]">
            {detail.payments.map((p) => (
              <li key={p.id} className="py-2 text-sm">
                {formatInvoiceDate(p.data)} — {formatInvoiceMoney(p.importo)} ({p.metodo})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 border-t border-[color:var(--cab-border)] pt-3">
        {isDraft && canWrite && onEditDraft ? (
          <button type="button" className={dsBtnNeutralForm} onClick={onEditDraft}>
            Modifica bozza
          </button>
        ) : null}
        {isDraft && canWrite ? (
          <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void issue("emessa")}>
            Emetti
          </LoadingButton>
        ) : null}
        {inv.status === "emessa" && canWrite ? (
          <LoadingButton type="button" variant="secondary" loading={busy} onClick={() => void issue("inviata")}>
            Segna inviata
          </LoadingButton>
        ) : null}
        {canPay ? (
          <button type="button" className={dsBtnNeutralForm} onClick={onRegisterPayment}>
            Registra pagamento
          </button>
        ) : null}
        <button
          type="button"
          className={dsBtnNeutralForm}
          onClick={() => void openPdfArtifact("fattura", { id: inv.id })}
        >
          Stampa PDF
        </button>
        {isAdmin && inv.status !== "annullata" && inv.status !== "pagata" ? (
          <LoadingButton type="button" variant="danger" loading={busy} onClick={() => void cancel()}>
            Annulla
          </LoadingButton>
        ) : null}
        {canDeleteDraft ? (
          <LoadingButton type="button" variant="danger" loading={busy} onClick={() => setDeleteConfirmOpen(true)}>
            Elimina
          </LoadingButton>
        ) : null}
      </div>
      <section className="rounded border border-dashed border-[color:var(--cab-border)] p-3 opacity-60">
        <p className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Fatturazione elettronica</p>
        <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Integrazione SDI / FE — disponibile in una release futura.</p>
      </section>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={`Fattura ${invoiceDisplayNumber(inv)}`}
        ariaLabel="Dettaglio fattura"
        asideClassName={isMobile ? undefined : resolveDrawerAsideClasses("drawerLog")}
      >
        {body}
      </Drawer>
      <FatturaEliminaConfirmDialog
        open={deleteConfirmOpen}
        invoice={inv}
        pending={busy}
        onCancel={() => {
          if (!busy) setDeleteConfirmOpen(false);
        }}
        onConfirm={() => void removeDraft()}
      />
      {confirmDialog}
    </>
  );
}
