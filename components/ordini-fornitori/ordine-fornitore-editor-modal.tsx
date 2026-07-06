"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconActionButton } from "@/components/design-system";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RicambiMagSearchPortal } from "@/components/lavorazioni/schede/schede-ricambi-portal-fields";
import { applyFornitoreLabelToRecord } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { openOrdineFornitorePdfInNewTab } from "@/lib/ordini-fornitori/ordine-fornitore-pdf";
import { defaultPrezzoUnitarioOrdineFromRicambio } from "@/lib/ordini-fornitori/ordine-fornitore-ricambio-price";
import {
  calcolaTotaliOrdineFornitore,
  totaleNettoRigaOrdine,
} from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type {
  OrdineFornitoreCreateInput,
  OrdineFornitoreRecord,
  OrdineFornitoreRiga,
  OrdineFornitoreStatus,
} from "@/lib/ordini-fornitori/types";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsLabel,
  dsScrollbar,
  dsTable,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  dsTableRow,
  dsTableWrap,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";
import { useSubmitLock } from "@/lib/forms/form-engine";

function newRigaId(): string {
  return crypto.randomUUID();
}

function recordToCreateInput(record: OrdineFornitoreRecord): OrdineFornitoreCreateInput {
  return {
    status: record.status,
    data_ordine: record.dataOrdine,
    fornitore_label: record.fornitoreLabel,
    fornitore_snapshot: record.fornitoreSnapshot,
    destinazione: record.destinazione || null,
    destinazione_snapshot: record.destinazioneSnapshot,
    note: record.note || null,
    trasporto: record.trasporto,
    iva_percent: record.ivaPercent,
    righe: record.righe.map((r) => ({
      ricambio_id: r.ricambioId,
      codice: r.codice || null,
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzo_unitario: r.prezzoUnitario,
      sconto_percent: r.scontoPercent,
      meta: r.meta,
    })),
  };
}

export function OrdineFornitoreEditorModal({
  record: initialRecord,
  isNew,
  canWrite,
  onClose,
  onSaved,
}: {
  record: OrdineFornitoreRecord;
  isNew: boolean;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const gestToast = useGestionaleToast();
  const submitLock = useSubmitLock();
  const magazzinoQ = useMagazzinoRicambiUIQuery();
  const prodotti = magazzinoQ.data ?? [];

  const [record, setRecord] = useState(initialRecord);
  const [magSearch, setMagSearch] = useState("");
  const [magSearchOpen, setMagSearchOpen] = useState(false);
  const readOnly = !canWrite || record.status !== "bozza";

  useEffect(() => {
    setRecord(initialRecord);
  }, [initialRecord]);

  const totals = useMemo(
    () =>
      calcolaTotaliOrdineFornitore({
        righe: record.righe,
        trasporto: record.trasporto,
        ivaPercent: record.ivaPercent,
      }),
    [record.righe, record.trasporto, record.ivaPercent],
  );

  const magSearchHits = useMemo(() => {
    const q = magSearch.trim().toLowerCase();
    if (q.length < 1) return [];
    return prodotti
      .filter((p) => {
        const d = (p.descrizione ?? "").toLowerCase();
        const c = [p.codiceFornitoreOriginale, p.codiceFornitoreOriginaleSecondario]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return d.includes(q) || c.includes(q) || q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w)));
      })
      .slice(0, 16);
  }, [magSearch, prodotti]);

  const patchRighe = useCallback((righe: OrdineFornitoreRiga[]) => {
    setRecord((prev) => ({ ...prev, righe }));
  }, []);

  function addRicambioFromMag(p: RicambioMagazzino) {
    const { prezzo, scontoPercent } = defaultPrezzoUnitarioOrdineFromRicambio(p, record.fornitoreLabel);
    const riga: OrdineFornitoreRiga = {
      id: newRigaId(),
      ordine: record.righe.length + 1,
      ricambioId: p.id,
      codice: p.codiceFornitoreOriginale ?? "",
      descrizione: p.descrizione ?? "",
      quantita: 1,
      prezzoUnitario: prezzo,
      scontoPercent,
      totaleRiga: totaleNettoRigaOrdine({ quantita: 1, prezzoUnitario: prezzo, scontoPercent }),
      meta: { produttore: p.marca },
    };
    patchRighe([...record.righe, riga]);
    setMagSearch("");
    setMagSearchOpen(false);
  }

  function updateRiga(id: string, patch: Partial<OrdineFornitoreRiga>) {
    patchRighe(
      record.righe.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.totaleRiga = totaleNettoRigaOrdine(next);
        return next;
      }),
    );
  }

  function removeRiga(id: string) {
    patchRighe(record.righe.filter((r) => r.id !== id).map((r, i) => ({ ...r, ordine: i + 1 })));
  }

  async function handleSave() {
    if (readOnly) return;
    if (!submitLock.acquire()) return;
    if (!record.fornitoreLabel.trim()) {
      submitLock.release();
      gestToast.validation("Seleziona un fornitore.");
      return;
    }
    if (record.righe.length === 0) {
      submitLock.release();
      gestToast.validation("Aggiungi almeno una riga.");
      return;
    }

    try {
      const payload = recordToCreateInput({
        ...record,
        imponibileRighe: totals.imponibileRighe,
        imponibile: totals.imponibile,
        iva: totals.iva,
        totale: totals.totale,
      });

      if (isNew) {
        const res = await ordiniFornitoriEntry.create(payload);
        if (!res.success) throw new Error(res.error ?? "Salvataggio fallito.");
        gestToast.successOnce("ordine-save", "Ordine creato.");
        onSaved();
        return;
      }

      const res = await ordiniFornitoriEntry.updateDraft(record.id, payload, record.updatedAt);
      if (!res.success) throw new Error(res.error ?? "Salvataggio fallito.");
      gestToast.successOnce("ordine-save", "Ordine salvato.");
      onSaved();
    } catch (e) {
      gestToast.errorOnce("ordine-save", e, { module: "ordini_fornitori" });
    } finally {
      submitLock.release();
    }
  }

  return (
    <LavorazioniModalShell
      onRequestClose={onClose}
      title={isNew ? "Nuovo ordine fornitore" : `Ordine ${record.numero || ""}`}
      modalSize="formLarge"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!isNew ? (
              <button type="button" className={dsBtnNeutral} onClick={() => void openOrdineFornitorePdfInNewTab(record)}>
                PDF
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={dsBtnNeutral} onClick={onClose}>
              Chiudi
            </button>
            {!readOnly ? (
              <button type="button" className={dsBtnPrimary} disabled={submitLock.isLocked()} onClick={() => void handleSave()}>
                {submitLock.isLocked() ? "Salvataggio…" : "Salva ordine"}
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <GestionaleModalScrollBody className={`${gestionaleModalBodyFlexClass} ${dsScrollbar}`}>
        <div className="space-y-4 pb-24">
          <div className="sticky top-0 z-[2] -mx-4 mb-3 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-card)_94%,transparent)] px-4 py-2 backdrop-blur-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
              <div>
                <span className="text-[color:var(--cab-text-muted)]">Totale ordine</span>
                <p className="text-lg font-semibold tabular-nums">
                  {totals.totale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="text-right text-xs text-[color:var(--cab-text-muted)]">
                <p>Imponibile righe: {totals.imponibileRighe.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p>
                <p>IVA: {totals.iva.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={dsLabel}>Numero</label>
              <input className={dsInput} value={record.numero} readOnly aria-readonly />
            </div>
            <div>
              <label className={dsLabel} htmlFor="ordine-data">
                Data ordine
              </label>
              <input
                id="ordine-data"
                type="date"
                className={dsInput}
                value={record.dataOrdine}
                disabled={readOnly}
                onChange={(e) => setRecord((p) => ({ ...p, dataOrdine: e.target.value }))}
              />
            </div>
            <div>
              <label className={dsLabel} htmlFor="ordine-status">
                Stato
              </label>
              <select
                id="ordine-status"
                className={dsInput}
                value={record.status}
                disabled={readOnly}
                onChange={(e) =>
                  setRecord((p) => ({ ...p, status: e.target.value as OrdineFornitoreStatus }))
                }
              >
                <option value="bozza">Bozza</option>
                <option value="inviato">Inviato</option>
                <option value="confermato">Confermato</option>
              </select>
            </div>
            <div>
              <label className={dsLabel} htmlFor="ordine-fornitore">
                Fornitore *
              </label>
              <GlobalSettingsListSelect
                id="ordine-fornitore"
                listKey="magazzino:fornitori"
                value={record.fornitoreLabel}
                onChange={(v) => setRecord((p) => applyFornitoreLabelToRecord(p, v))}
                disabled={readOnly}
                required
              />
            </div>
          </div>

          <div>
            <label className={dsLabel} htmlFor="ordine-destinazione">
              Destinazione merce
            </label>
            <GestionaleTextarea
              id="ordine-destinazione"
              value={record.destinazione}
              disabled={readOnly}
              rows={2}
              maxLength={TEXT_LONG}
              onChange={(v) =>
                setRecord((p) => ({ ...p, destinazione: sliceInputValue(v, TEXT_LONG) }))
              }
              placeholder="Indirizzo o sede di consegna"
            />
          </div>

          {!readOnly ? (
            <RicambiMagSearchPortal
              value={magSearch}
              onChange={setMagSearch}
              open={magSearchOpen}
              onOpenChange={setMagSearchOpen}
              hits={magSearchHits}
              onSelect={addRicambioFromMag}
              placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
              ariaLabel="Cerca ricambio in magazzino"
            />
          ) : null}

          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Codice" />
                <GlobalTableHeadLabel label="Descrizione" thClassName="min-w-[10rem]" />
                <GlobalTableHeadLabel label="Qtà" />
                <GlobalTableHeadLabel label="Prezzo" />
                <GlobalTableHeadLabel label="Sc. %" />
                <GlobalTableHeadLabel label="Totale" />
                {!readOnly ? <GlobalTableHeadLabel label="" thClassName="w-12" /> : null}
              </GlobalTableHead>
              <tbody>
                {record.righe.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-2 py-4 text-center text-[color:var(--cab-text-muted)]">
                      Nessuna riga — cerca un ricambio sopra.
                    </td>
                  </tr>
                ) : (
                  record.righe.map((r) => (
                    <tr key={r.id} className={dsTableRow}>
                      <td className="px-2 py-1">
                        <input
                          className={dsInput}
                          value={r.codice}
                          disabled={readOnly}
                          onChange={(e) => updateRiga(r.id, { codice: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className={dsInput}
                          value={r.descrizione}
                          disabled={readOnly}
                          onChange={(e) => updateRiga(r.id, { descrizione: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0.001}
                          step={0.001}
                          className={`${dsInput} w-20`}
                          value={r.quantita}
                          disabled={readOnly}
                          onChange={(e) => updateRiga(r.id, { quantita: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className={`${dsInput} w-24`}
                          value={r.prezzoUnitario}
                          disabled={readOnly}
                          onChange={(e) => updateRiga(r.id, { prezzoUnitario: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className={`${dsInput} w-16`}
                          value={r.scontoPercent}
                          disabled={readOnly}
                          onChange={(e) => updateRiga(r.id, { scontoPercent: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1 tabular-nums">
                        {r.totaleRiga.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!readOnly ? (
                        <td className="px-2 py-1">
                          <IconActionButton label="Rimuovi riga" className={dsTableActionBtnDanger} onClick={() => removeRiga(r.id)}>
                            <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </IconActionButton>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={dsLabel} htmlFor="ordine-trasporto">
                Trasporto €
              </label>
              <input
                id="ordine-trasporto"
                type="number"
                min={0}
                step={0.01}
                className={dsInput}
                value={record.trasporto}
                disabled={readOnly}
                onChange={(e) => setRecord((p) => ({ ...p, trasporto: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className={dsLabel} htmlFor="ordine-iva">
                IVA %
              </label>
              <input
                id="ordine-iva"
                type="number"
                min={0}
                max={100}
                step={0.01}
                className={dsInput}
                value={record.ivaPercent}
                disabled={readOnly}
                onChange={(e) => setRecord((p) => ({ ...p, ivaPercent: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <label className={dsLabel} htmlFor="ordine-note">
              Note
            </label>
            <GestionaleTextarea
              id="ordine-note"
              value={record.note}
              disabled={readOnly}
              rows={3}
              maxLength={TEXT_EXTRA}
              onChange={(v) => setRecord((p) => ({ ...p, note: sliceInputValue(v, TEXT_EXTRA) }))}
            />
          </div>
        </div>
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
