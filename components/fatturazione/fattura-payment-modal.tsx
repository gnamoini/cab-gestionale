"use client";

import { useEffect, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import type { InvoicePaymentInput } from "@/lib/fatturazione/types";
import { dsInput } from "@/lib/ui/design-system";
import type { InvoicePaymentMetodo, InvoiceRow } from "@/src/types/supabase-tables";
import { invoicesService } from "@/src/services/invoices.service";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const METODI: { value: InvoicePaymentMetodo; label: string }[] = [
  { value: "bonifico", label: "Bonifico" },
  { value: "contanti", label: "Contanti" },
  { value: "assegno", label: "Assegno" },
  { value: "pos", label: "POS" },
  { value: "altro", label: "Altro" },
];

export function FatturaPaymentModal({
  invoice,
  onRequestClose,
  onSaved,
}: {
  invoice: InvoiceRow;
  onRequestClose: () => void;
  onSaved: () => void;
}) {
  const toast = useGestionaleToast();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [importo, setImporto] = useState(String(invoice.residuo));
  const [metodo, setMetodo] = useState<InvoicePaymentMetodo>("bonifico");
  const [riferimento, setRiferimento] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setImporto(String(invoice.residuo));
  }, [invoice.id, invoice.residuo]);

  const submit = async () => {
    if (busy) return;
    const amount = Number(importo.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.validation("Importo pagamento non valido.");
      return;
    }
    if (amount > invoice.residuo + 0.001) {
      toast.validation(`Importo massimo ${formatInvoiceMoney(invoice.residuo)}.`);
      return;
    }
    setBusy(true);
    try {
      const payload: InvoicePaymentInput = {
        invoice_id: invoice.id,
        data,
        importo: amount,
        metodo,
        riferimento: riferimento.trim() || null,
        note: note.trim() || null,
      };
      const res = await invoicesService.registerPayment(payload);
      if (!res.success) throw new Error(res.error ?? "Registrazione non riuscita.");
      toast.successOnce("fatt-pay", "Pagamento registrato.");
      onSaved();
      onRequestClose();
    } catch (e) {
      toast.errorOnce("fatt-pay", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LavorazioniModalShell modalSize="formSmall" title="Registra pagamento" onRequestClose={onRequestClose}>
      <GestionaleModalScrollBody>
        <div className="space-y-3 p-4">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Residuo: <strong>{formatInvoiceMoney(invoice.residuo)}</strong>
          </p>
          <FormField label="Data">
            <input className={dsInput} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </FormField>
          <FormField label="Importo">
            <input
              className={dsInput}
              inputMode="decimal"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
            />
          </FormField>
          <FormField label="Metodo">
            <GlobalSelect value={metodo} onChange={(v) => setMetodo(v as InvoicePaymentMetodo)} items={METODI} selectOnly />
          </FormField>
          <FormField label="Riferimento">
            <input className={dsInput} value={riferimento} onChange={(e) => setRiferimento(e.target.value)} />
          </FormField>
          <FormField label="Note">
            <GestionaleTextarea rows={2} value={note} onChange={setNote} />
          </FormField>
        </div>
      </GestionaleModalScrollBody>
      <div className="flex justify-end gap-2 border-t border-[color:var(--cab-border)] px-4 py-3">
        <LoadingButton type="button" variant="secondary" onClick={onRequestClose} disabled={busy}>
          Annulla
        </LoadingButton>
        <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void submit()}>
          Registra
        </LoadingButton>
      </div>
    </LavorazioniModalShell>
  );
}
