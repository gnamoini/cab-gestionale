"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import { openItemAbsRemaining } from "@/lib/fatturazione/open-items";
import type { CustomerPaymentMultiInput } from "@/lib/fatturazione/types";
import { dsInput } from "@/lib/ui/design-system";
import type { CustomerOpenItemRow, InvoicePaymentMetodo } from "@/src/types/supabase-tables";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const METODI: { value: InvoicePaymentMetodo; label: string }[] = [
  { value: "bonifico", label: "Bonifico" },
  { value: "contanti", label: "Contanti" },
  { value: "assegno", label: "Assegno" },
  { value: "pos", label: "POS" },
  { value: "altro", label: "Altro" },
];

export function FatturaMultiPaymentModal({
  openItems,
  onRequestClose,
  onSaved,
}: {
  openItems: CustomerOpenItemRow[];
  onRequestClose: () => void;
  onSaved: () => void;
}) {
  const toast = useGestionaleToast();
  const debits = useMemo(() => openItems.filter((i) => i.remaining_signed < 0), [openItems]);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [importo, setImporto] = useState("");
  const [metodo, setMetodo] = useState<InvoicePaymentMetodo>("bonifico");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const total = debits
      .filter((d) => selected.has(d.id))
      .reduce((s, d) => s + openItemAbsRemaining(d), 0);
    if (total > 0 && !importo) setImporto(String(total.toFixed(2)));
  }, [debits, importo, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (busy) return;
    const amount = Number(importo.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.validation("Importo non valido.");
      return;
    }
    const picked = debits.filter((d) => selected.has(d.id));
    if (picked.length === 0) {
      toast.validation("Seleziona almeno una partita.");
      return;
    }
  // ponytail: allocazione FIFO semplice sulle partite selezionate
    let remaining = amount;
    const allocations: CustomerPaymentMultiInput["allocations"] = [];
    for (const item of picked) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, openItemAbsRemaining(item));
      if (alloc > 0) {
        allocations.push({ open_item_id: item.id, amount: alloc });
        remaining -= alloc;
      }
    }
    const customerId = picked[0]?.customer_id ?? null;
    setBusy(true);
    try {
      const res = await invoicesEntry.registerCustomerPaymentMulti({
        customer_id: customerId,
        data,
        importo: amount,
        metodo,
        allocations,
      });
      if (!res.success) throw new Error(res.error ?? "Registrazione non riuscita.");
      toast.successOnce("fatt-multi-pay", "Incasso multiplo registrato.");
      onSaved();
      onRequestClose();
    } catch (e) {
      toast.errorOnce("fatt-multi-pay", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LavorazioniModalShell modalSize="formMedium" title="Incasso multiplo" onRequestClose={onRequestClose}>
      <GestionaleModalScrollBody>
        <div className="space-y-4 p-4">
          <FormField label="Data">
            <input type="date" className={dsInput} value={data} onChange={(e) => setData(e.target.value)} />
          </FormField>
          <FormField label="Importo">
            <input className={dsInput} value={importo} onChange={(e) => setImporto(e.target.value)} />
          </FormField>
          <FormField label="Metodo">
            <GlobalSelect
              value={metodo}
              onChange={(v) => setMetodo(v as InvoicePaymentMetodo)}
              items={METODI}
              selectOnly
            />
          </FormField>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]">Partite (FIFO)</p>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {debits.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                    <span>
                      {item.document_number ?? "—"} — {formatInvoiceMoney(openItemAbsRemaining(item))}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void submit()}>
            Registra incasso
          </LoadingButton>
        </div>
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
