"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import { LoadingButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import {
  billingSnapshotFromAnagrafica,
  findBillingCustomerByLabel,
  mergeBillingSnapshot,
  type BillingCustomerSnapshot,
} from "@/lib/fatturazione/billing-customer-bridge";
import {
  buildPreventivoInvoiceLink,
  preventivoBillingResiduo,
  preventivoToInvoiceDraftRows,
} from "@/lib/fatturazione/preventivo-to-invoice-draft";
import { calculateInvoiceTotals, assertNoPreventivoOverbilling } from "@/lib/fatturazione/invoice-calculations";
import { formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import type { FatturazioneOrigine, InvoiceCreateInput, InvoiceDetail, InvoiceDraftRowInput } from "@/lib/fatturazione/types";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { dsBtnNeutralForm, dsInput } from "@/lib/ui/design-system";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import type { BillingCustomerRow, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { clientiAnagraficaService } from "@/src/services/clienti-anagrafica.service";
import { invoicesService } from "@/src/services/invoices.service";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type StepId = "origine" | "cliente" | "fiscali" | "righe" | "iva" | "conferma";
const STEPS: { id: StepId; label: string }[] = [
  { id: "origine", label: "Origine" },
  { id: "cliente", label: "Cliente" },
  { id: "fiscali", label: "Dati fiscali" },
  { id: "righe", label: "Righe" },
  { id: "iva", label: "IVA" },
  { id: "conferma", label: "Conferma" },
];

const ROW_TIPI = [
  { value: "ricambio", label: "Ricambio" },
  { value: "articolo_magazzino", label: "Articolo magazzino" },
  { value: "manodopera", label: "Manodopera" },
  { value: "lavorazione", label: "Lavorazione" },
  { value: "costo_extra", label: "Costo extra" },
  { value: "libera", label: "Riga libera" },
];

function emptyRow(): InvoiceDraftRowInput {
  return { tipo: "libera", descrizione: "", quantita: 1, prezzo_unitario: 0, sconto_percent: 0, iva_percent: 22 };
}

export function FatturazioneWizardModal({
  onRequestClose,
  onSaved,
  preventiviRecords,
  preventiviBilling,
  billingCustomers,
  initialOrigine,
  initialPreventivoIds,
  editDetail,
}: {
  onRequestClose: () => void;
  onSaved: () => void;
  preventiviRecords: readonly PreventivoRecord[];
  preventiviBilling: readonly PreventivoBillingStatusRow[];
  billingCustomers: readonly BillingCustomerRow[];
  initialOrigine?: FatturazioneOrigine;
  initialPreventivoIds?: string[];
  editDetail?: InvoiceDetail | null;
}) {
  const isMobile = useMaxMdDown();
  const toast = useGestionaleToast();
  const editingId = editDetail?.invoice.id ?? null;
  const [step, setStep] = useState<StepId>(editDetail ? "cliente" : "origine");
  const [busy, setBusy] = useState(false);
  const [origine, setOrigine] = useState<FatturazioneOrigine>(initialOrigine ?? "manuale");
  const [selectedPreventivoIds, setSelectedPreventivoIds] = useState<string[]>(initialPreventivoIds ?? []);
  const [clienteLabel, setClienteLabel] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<BillingCustomerSnapshot>({});
  const [rows, setRows] = useState<InvoiceDraftRowInput[]>([emptyRow()]);
  const [dataEmissione, setDataEmissione] = useState(new Date().toISOString().slice(0, 10));
  const [dataScadenza, setDataScadenza] = useState("");
  const [note, setNote] = useState("");
  const [statusOut, setStatusOut] = useState<"bozza" | "da_verificare" | "emessa">("bozza");

  useEffect(() => {
    if (!editDetail) return;
    const inv = editDetail.invoice;
    setOrigine((inv.origine as FatturazioneOrigine | null) ?? "manuale");
    setClienteLabel(inv.cliente_label);
    setCustomerId(inv.customer_id);
    setSnapshot((inv.customer_snapshot as BillingCustomerSnapshot) ?? {});
    setRows(
      editDetail.rows.length
        ? editDetail.rows.map((r) => ({
            tipo: r.tipo,
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario,
            sconto_percent: r.sconto_percent,
            iva_percent: r.iva_percent,
            ricambio_id: r.ricambio_id,
            lavorazione_id: r.lavorazione_id,
            preventivo_id: r.preventivo_id,
            meta: (r.meta as Record<string, unknown>) ?? {},
          }))
        : [emptyRow()],
    );
    setDataEmissione(inv.data_emissione ?? new Date().toISOString().slice(0, 10));
    setDataScadenza(inv.data_scadenza ?? "");
    setNote(inv.note ?? "");
    setStatusOut(inv.status === "da_verificare" || inv.status === "emessa" ? inv.status : "bozza");
    setSelectedPreventivoIds(
      editDetail.links.filter((l) => l.source_type === "preventivo").map((l) => l.source_id),
    );
  }, [editDetail]);

  const billingByPrev = useMemo(() => {
    const m = new Map<string, PreventivoBillingStatusRow>();
    for (const b of preventiviBilling) m.set(b.preventivo_id, b);
    return m;
  }, [preventiviBilling]);

  const eligiblePreventivi = useMemo(
    () =>
      preventiviRecords.filter((p) => {
        const b = billingByPrev.get(p.id);
        const residuo = preventivoBillingResiduo(b, p.totaleFinale ?? 0);
        return residuo > 0;
      }),
    [preventiviRecords, billingByPrev],
  );

  const totals = useMemo(() => calculateInvoiceTotals(rows), [rows]);

  const hydrateCliente = useCallback(async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const existing = findBillingCustomerByLabel(billingCustomers, trimmed);
    if (existing) {
      setCustomerId(existing.id);
      setSnapshot({
        ragione_sociale: existing.ragione_sociale ?? trimmed,
        partita_iva: existing.partita_iva ?? undefined,
        codice_fiscale: existing.codice_fiscale ?? undefined,
        pec: existing.pec ?? undefined,
        codice_sdi: existing.codice_sdi ?? undefined,
        indirizzo: (existing.indirizzo as BillingCustomerSnapshot["indirizzo"]) ?? {},
      });
      return;
    }
    const key = buildClienteEntityKey(trimmed);
    if (!key) return;
    const anagRes = await clientiAnagraficaService.getByNomeDisplay(trimmed);
    if (anagRes.success && anagRes.data) {
      setSnapshot(billingSnapshotFromAnagrafica(anagRes.data));
    } else {
      setSnapshot({ ragione_sociale: trimmed });
    }
    setCustomerId(null);
  }, [billingCustomers]);

  const importFromPreventivi = useCallback(() => {
    const ids = origine === "preventivo" ? selectedPreventivoIds.slice(0, 1) : selectedPreventivoIds;
    if (!ids.length) return;
    const draftRows: InvoiceDraftRowInput[] = [];
    let label = "";
    for (const id of ids) {
      const prev = preventiviRecords.find((p) => p.id === id);
      if (!prev) continue;
      if (!label) label = prev.cliente.trim();
      draftRows.push(...preventivoToInvoiceDraftRows(prev, id));
    }
    if (label) {
      setClienteLabel(label);
      void hydrateCliente(label);
    }
    if (draftRows.length) setRows(draftRows);
  }, [hydrateCliente, origine, preventiviRecords, selectedPreventivoIds]);

  const buildLinks = useCallback(() => {
    const ids = origine === "preventivo" ? selectedPreventivoIds.slice(0, 1) : selectedPreventivoIds;
    if (!ids.length) return [];
    const perPrev = totals.totale / ids.length;
    return ids.map((id) => buildPreventivoInvoiceLink(id, perPrev, totals.imponibile / ids.length, totals.iva / ids.length));
  }, [origine, selectedPreventivoIds, totals]);

  const validatePreventivi = useCallback(() => {
    const ids = origine === "preventivo" ? selectedPreventivoIds.slice(0, 1) : selectedPreventivoIds;
    for (const id of ids) {
      const prev = preventiviRecords.find((p) => p.id === id);
      const b = billingByPrev.get(id);
      if (!prev) continue;
      const alloc = origine === "multi_preventivo" ? totals.totale / ids.length : totals.totale;
      const check = assertNoPreventivoOverbilling({
        preventivoTotale: prev.totaleFinale ?? 0,
        giaFatturato: b?.fatturato ?? 0,
        nuovaAllocazione: alloc,
      });
      if (!check.ok) return check.message;
    }
    return null;
  }, [billingByPrev, origine, preventiviRecords, selectedPreventivoIds, totals.totale]);

  const submit = async () => {
    if (busy) return;
    if (!clienteLabel.trim()) {
      toast.validation("Seleziona un cliente.");
      return;
    }
    if (rows.every((r) => !r.descrizione.trim())) {
      toast.validation("Aggiungi almeno una riga con descrizione.");
      return;
    }
    const prevErr = origine !== "manuale" ? validatePreventivi() : null;
    if (prevErr) {
      toast.validation(prevErr);
      return;
    }
    setBusy(true);
    try {
      const payload: InvoiceCreateInput = {
        origine,
        status: statusOut,
        customer_id: customerId,
        cliente_label: clienteLabel.trim(),
        customer_snapshot: snapshot as Record<string, unknown>,
        data_emissione: dataEmissione,
        data_scadenza: dataScadenza || null,
        note: note.trim() || null,
        rows: rows.filter((r) => r.descrizione.trim()),
        links: buildLinks(),
      };
      const res = editingId
        ? await invoicesService.updateDraftWithRows(editingId, payload)
        : await invoicesService.create(payload);
      if (!res.success) throw new Error(res.error ?? "Salvataggio non riuscito.");
      toast.successOnce("fatt-create", editingId ? "Bozza aggiornata." : "Fattura creata.");
      onSaved();
      onRequestClose();
    } catch (e) {
      toast.errorOnce("fatt-create", e);
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goNext = () => {
    if (step === "origine" && origine !== "manuale") importFromPreventivi();
    if (step === "cliente" && clienteLabel.trim()) void hydrateCliente(clienteLabel);
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const panelId = "fatt-wizard-panel";

  const content = (
    <div id={panelId} className="space-y-4 p-4">
      {step === "origine" ? (
        <FormSection title="Origine documento">
          <div className="flex flex-col gap-2">
            {(
              [
                ["manuale", "Manuale"],
                ["preventivo", "Da preventivo"],
                ["multi_preventivo", "Da più preventivi"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={origine === v} onChange={() => setOrigine(v)} />
                {label}
              </label>
            ))}
          </div>
          {origine !== "manuale" ? (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded border border-[color:var(--cab-border)] p-2">
              {eligiblePreventivi.map((p) => {
                const b = billingByPrev.get(p.id);
                const residuo = preventivoBillingResiduo(b, p.totaleFinale ?? 0);
                const checked = selectedPreventivoIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type={origine === "preventivo" ? "radio" : "checkbox"}
                        checked={checked}
                        onChange={() => {
                          if (origine === "preventivo") setSelectedPreventivoIds([p.id]);
                          else
                            setSelectedPreventivoIds((prev) =>
                              checked ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                            );
                        }}
                      />
                      <span>
                        {p.numero} — {p.cliente} (residuo {formatInvoiceMoney(residuo)})
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </FormSection>
      ) : null}

      {step === "cliente" ? (
        <FormSection title="Cliente">
          <FormField label="Cliente">
            <GlobalSettingsListSelect
              listKey="mezzi:clienti"
              value={clienteLabel}
              onChange={(v) => {
                setClienteLabel(v);
                void hydrateCliente(v);
              }}
              aria-label="Cliente fattura"
            />
          </FormField>
        </FormSection>
      ) : null}

      {step === "fiscali" ? (
        <FormSection title="Dati fiscali">
          <FormField label="Ragione sociale">
            <input
              className={dsInput}
              value={snapshot.ragione_sociale ?? ""}
              onChange={(e) => setSnapshot((s) => mergeBillingSnapshot(s, { ragione_sociale: e.target.value }))}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Partita IVA">
              <input
                className={dsInput}
                value={snapshot.partita_iva ?? ""}
                onChange={(e) => setSnapshot((s) => mergeBillingSnapshot(s, { partita_iva: e.target.value }))}
              />
            </FormField>
            <FormField label="Codice SDI">
              <input
                className={dsInput}
                value={snapshot.codice_sdi ?? ""}
                onChange={(e) => setSnapshot((s) => mergeBillingSnapshot(s, { codice_sdi: e.target.value.toUpperCase() }))}
              />
            </FormField>
            <FormField label="PEC">
              <input
                className={dsInput}
                value={snapshot.pec ?? ""}
                onChange={(e) => setSnapshot((s) => mergeBillingSnapshot(s, { pec: e.target.value }))}
              />
            </FormField>
          </div>
        </FormSection>
      ) : null}

      {step === "righe" ? (
        <FormSection
          title="Righe documento"
          action={
            <button type="button" className={dsBtnNeutralForm} onClick={() => setRows((r) => [...r, emptyRow()])}>
              Aggiungi riga
            </button>
          }
        >
          <ul className="space-y-3">
            {rows.map((row, i) => (
              <li key={i} className="rounded border border-[color:var(--cab-border)] p-3">
                <div className="mb-2 flex justify-between">
                  <span className="text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]">Riga {i + 1}</span>
                  {rows.length > 1 ? (
                    <button type="button" className={dsBtnNeutralForm} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                      Rimuovi
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormField label="Tipo">
                    <GlobalSelect
                      value={row.tipo}
                      onChange={(v) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, tipo: v as InvoiceDraftRowInput["tipo"] } : r)))
                      }
                      items={ROW_TIPI}
                      selectOnly
                    />
                  </FormField>
                  <FormField label="Descrizione" className="sm:col-span-2">
                    <input
                      className={dsInput}
                      value={row.descrizione}
                      onChange={(e) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, descrizione: e.target.value } : r)))
                      }
                    />
                  </FormField>
                  <FormField label="Qtà">
                    <input
                      className={dsInput}
                      inputMode="decimal"
                      value={row.quantita}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r, j) => (j === i ? { ...r, quantita: Number(e.target.value) || 0 } : r)),
                        )
                      }
                    />
                  </FormField>
                  <FormField label="Prezzo unitario">
                    <input
                      className={dsInput}
                      inputMode="decimal"
                      value={row.prezzo_unitario}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r, j) => (j === i ? { ...r, prezzo_unitario: Number(e.target.value) || 0 } : r)),
                        )
                      }
                    />
                  </FormField>
                </div>
              </li>
            ))}
          </ul>
        </FormSection>
      ) : null}

      {step === "iva" ? (
        <FormSection title="IVA e riepilogo">
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Imponibile</dt>
              <dd className="font-semibold">{formatInvoiceMoney(totals.imponibile)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">IVA</dt>
              <dd className="font-semibold">{formatInvoiceMoney(totals.iva)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">Totale</dt>
              <dd className="font-semibold">{formatInvoiceMoney(totals.totale)}</dd>
            </div>
          </dl>
        </FormSection>
      ) : null}

      {step === "conferma" ? (
        <FormSection title="Conferma">
          <FormField label="Data emissione">
            <input className={dsInput} type="date" value={dataEmissione} onChange={(e) => setDataEmissione(e.target.value)} />
          </FormField>
          <FormField label="Scadenza">
            <input className={dsInput} type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} />
          </FormField>
          <FormField label="Stato iniziale">
            <GlobalSelect
              value={statusOut}
              onChange={(v) => setStatusOut(v as typeof statusOut)}
              items={[
                { value: "bozza", label: "Bozza" },
                { value: "da_verificare", label: "Da verificare" },
                { value: "emessa", label: "Emessa" },
              ]}
              selectOnly
            />
          </FormField>
          <FormField label="Note">
            <GestionaleTextarea rows={3} value={note} onChange={setNote} />
          </FormField>
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Cliente: <strong>{clienteLabel}</strong> — Totale: <strong>{formatInvoiceMoney(totals.totale)}</strong>
          </p>
        </FormSection>
      ) : null}
    </div>
  );

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      title={editingId ? "Modifica bozza" : "Nuova fattura"}
      onRequestClose={onRequestClose}
      footer={
        <div className="flex justify-between gap-2 border-t border-[color:var(--cab-border)] px-4 py-3">
          <LoadingButton type="button" variant="secondary" onClick={stepIndex > 0 ? goPrev : onRequestClose} disabled={busy}>
            {stepIndex > 0 ? "Indietro" : "Chiudi"}
          </LoadingButton>
          <div className="flex gap-2">
            {step !== "conferma" ? (
              <LoadingButton type="button" variant="primary" onClick={goNext} disabled={busy}>
                Avanti
              </LoadingButton>
            ) : (
              <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void submit()}>
                {editingId ? "Salva bozza" : "Crea fattura"}
              </LoadingButton>
            )}
          </div>
        </div>
      }
    >
      {!isMobile ? (
        <HubModalTabBar aria-label="Step fattura">
          {STEPS.map((t) => (
            <HubModalTab
              key={t.id}
              id={`fatt-tab-${t.id}`}
              panelId={panelId}
              label={t.label}
              active={step === t.id}
              onSelect={() => setStep(t.id)}
            />
          ))}
        </HubModalTabBar>
      ) : null}
      <GestionaleModalScrollBody>{content}</GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
