"use client";

import { useCallback, useState } from "react";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { Drawer, LoadingButton, LoadingFormSkeleton } from "@/components/design-system";
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
import { invoiceIsDeletable, invoicesEntry } from "@/lib/domain/invoices-entry";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { InvoiceTimeline } from "@/components/fatturazione/invoice-timeline";

export function FatturazioneDetailDrawer({
  detail,
  open,
  onClose,
  canWrite,
  onChanged,
  onRegisterPayment,
  onEditDraft,
}: {
  detail: InvoiceDetail | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
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
      if (!inv || busy || !canWrite) return;
      setBusy(true);
      try {
        const res = await invoicesEntry.issue(inv.id, status);
        if (!res.success) throw new Error(res.error ?? "Operazione non riuscita.");
        toast.successOnce("fatt-issue", status === "emessa" ? "Fattura emessa." : "Fattura segnata come inviata.");
        onChanged();
      } catch (e) {
        toast.errorOnce("fatt-issue", e);
      } finally {
        setBusy(false);
      }
    },
    [busy, canWrite, inv, onChanged, toast],
  );

  const createCreditNote = useCallback(async () => {
    if (!inv || busy || !canWrite) return;
    const ok = await confirm({
      title: "Nota di credito",
      message: "Creare una nota di credito per l'intero importo della fattura?",
      confirmLabel: "Crea NC",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await invoicesEntry.createCreditNote(inv.id);
      if (!res.success) throw new Error(res.error ?? "Creazione NC non riuscita.");
      toast.successOnce("fatt-nc", "Nota di credito creata.");
      onChanged();
    } catch (e) {
      toast.errorOnce("fatt-nc", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canWrite, confirm, inv, onChanged, toast]);

  const cancel = useCallback(async () => {
    if (!inv || busy || !canWrite) return;
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
      const res = await invoicesEntry.cancel(inv.id, reason);
      if (!res.success) throw new Error(res.error ?? "Annullamento non riuscito.");
      toast.successOnce("fatt-cancel", "Fattura annullata.");
      onChanged();
      onClose();
    } catch (e) {
      toast.errorOnce("fatt-cancel", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canWrite, confirm, inv, onChanged, onClose, toast]);

  const removeDraft = useCallback(async () => {
    if (!inv || busy || !canWrite) return;
    setBusy(true);
    try {
      const res = await invoicesEntry.remove(inv.id);
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

  if (!open) return null;

  if (!inv || !detail) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="Fattura"
        ariaLabel="Dettaglio fattura"
        asideClassName={isMobile ? undefined : resolveDrawerAsideClasses("drawerLog")}
      >
        <div className="p-4">
          <LoadingFormSkeleton sections={3} />
        </div>
      </Drawer>
    );
  }

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
        <ul className={`${LIST_DIVIDER_UL} rounded border border-[color:var(--cab-border)]`}>
          {detail.rows.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <p className="font-medium">{r.descrizione}</p>
              <p className="text-[color:var(--cab-text-muted)]">
                {r.quantita} ├ù {formatInvoiceMoney(r.prezzo_unitario)} ÔÇö {formatInvoiceMoney(r.totale)}
              </p>
            </li>
          ))}
        </ul>
      </div>
      {detail.payments.length ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Pagamenti</p>
          <ul className={`${LIST_DIVIDER_UL}`}>
            {detail.payments.map((p) => (
              <li key={p.id} className="py-2 text-sm">
                {formatInvoiceDate(p.data)} ÔÇö {formatInvoiceMoney(p.importo)} ({p.metodo})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Timeline</p>
        <InvoiceTimeline invoiceId={inv.id} />
      </div>
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
        {canWrite &&
        inv.document_type !== "nota_credito" &&
        !isDraft &&
        inv.status !== "annullata" ? (
          <LoadingButton type="button" variant="secondary" loading={busy} onClick={() => void createCreditNote()}>
            Nota di credito
          </LoadingButton>
        ) : null}
        {canWrite && inv.status !== "annullata" && inv.status !== "pagata" ? (
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
