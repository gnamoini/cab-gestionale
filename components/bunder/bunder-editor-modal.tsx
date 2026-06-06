"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { applicaHintCliente, hintsByCliente } from "@/lib/bunder/bunder-cliente-hints";
import { appendBunderChangeLog } from "@/lib/bunder/bunder-change-log-storage";
import { bunderKindLabel } from "@/lib/bunder/doc-kind-meta";
import { importBunderPdf } from "@/lib/pdf/lazy-pdf-modules";
import { openBunderWordInNewTab, openBunderPrintPreview } from "@/lib/bunder/bunder-html-document";
import { righeFromPreventivo, totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import { BUNDER_DOC_KIND_OPTIONS } from "@/lib/bunder/doc-kind-meta";
import { bunderDocumentSnapshot, isBunderDocumentDirty } from "@/lib/bunder/bunder-document-dirty";
import { allocateNextNumero } from "@/lib/bunder/bunder-numbering";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import type { BunderCommercialDocument, BunderDocKind, BunderProductRiga } from "@/lib/bunder/types";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  GestionaleModalShell,
  GestionaleModalHeader,
  GestionaleModalScrollBody,
} from "@/components/gestionale/gestionale-modal";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnDanger, dsBtnNeutral, dsBtnPrimary, dsInput, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";

function nextRigaId(): string {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function BunderEditorModal({
  open,
  doc,
  allDocs,
  autore,
  onClose,
  onSave,
}: {
  open: boolean;
  doc: BunderCommercialDocument | null;
  allDocs: BunderCommercialDocument[];
  autore: string;
  onClose: () => void;
  onSave: (d: BunderCommercialDocument) => void;
}) {
  const [local, setLocal] = useState<BunderCommercialDocument | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const { records: preventivi } = usePreventiviRecordsQuery(open);
  const [prevPick, setPrevPick] = useState("");

  useEffect(() => {
    if (open && doc) {
      const copy = { ...doc };
      setLocal(copy);
      setBaselineSnapshot(bunderDocumentSnapshot(copy));
    }
    if (!open) {
      setLocal(null);
      setBaselineSnapshot(null);
      setUnsavedExitOpen(false);
    }
  }, [open, doc]);

  const isDirty = useMemo(() => {
    if (!local || !baselineSnapshot) return false;
    return isBunderDocumentDirty(local, baselineSnapshot);
  }, [local, baselineSnapshot]);

  useBeforeUnloadWhenDirty(open && isDirty, "Hai modifiche non salvate nel documento BUNDER.");

  const hintMap = useMemo(() => hintsByCliente(allDocs), [allDocs]);

  const applicaStoricoCliente = useCallback(() => {
    if (!local) return;
    const k = local.aziendaDestinatario.trim().toLowerCase();
    const h = hintMap.get(k);
    if (!h) return;
    setLocal(applicaHintCliente(local, h));
  }, [local, hintMap]);

  const onChangeKind = useCallback(
    (kind: BunderDocKind) => {
      if (!local) return;
      const others = allDocs.filter((x) => x.id !== local.id);
      const numero = allocateNextNumero(others, kind);
      setLocal({ ...local, kind, numeroProgressivo: numero });
    },
    [local, allDocs],
  );

  const importaPreventivo = useCallback(() => {
    if (!local || !prevPick) return;
    const p = preventivi.find((x) => x.id === prevPick);
    if (!p) return;
    const righe = righeFromPreventivo(p);
    setLocal({
      ...local,
      righe: righe.length ? righe : local.righe,
      aziendaDestinatario: p.cliente.trim() || local.aziendaDestinatario,
      oggetto: local.oggetto || `Riferimento preventivo ${p.numero} — ${p.macchinaRiassunto || "fornitura"}`,
    });
  }, [local, prevPick, preventivi]);

  const addRiga = useCallback(() => {
    if (!local) return;
    setLocal({
      ...local,
      righe: [
        ...local.righe,
        {
          id: nextRigaId(),
          quantita: 1,
          codice: "",
          nome: "",
          descrizioneTecnica: "",
          prezzoUnitario: 0,
        },
      ],
    });
  }, [local]);

  const updateRiga = useCallback((id: string, patch: Partial<BunderProductRiga>) => {
    if (!local) return;
    setLocal({
      ...local,
      righe: local.righe.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }, [local]);

  const removeRiga = useCallback((id: string) => {
    if (!local) return;
    setLocal({ ...local, righe: local.righe.filter((r) => r.id !== id) });
  }, [local]);

  const salva = useCallback(() => {
    if (!local) return;
    const iso = new Date().toISOString();
    const next: BunderCommercialDocument = {
      ...local,
      updatedAt: iso,
      lastEditedBy: autore.trim() || "Operatore",
    };
    appendBunderChangeLog({
      tone: "update",
      tipoRiga: "MODIFICA DOCUMENTO",
      oggettoRiga: `${local.numeroProgressivo} · ${bunderKindLabel(local.kind)}`,
      modificaRiga: `Destinatario: ${local.aziendaDestinatario}. Totale indicativo: ${totaleDocumento(next).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €.`,
      autore: autore.trim() || "Operatore",
      atIso: iso,
    });
    onSave(next);
    onClose();
  }, [local, autore, onSave, onClose]);

  const requestClose = useCallback(() => {
    if (!isDirty) {
      setUnsavedExitOpen(false);
      onClose();
      return;
    }
    setUnsavedExitOpen(true);
  }, [isDirty, onClose]);

  const esportaPdf = useCallback(() => {
    if (!local) return;
    void importBunderPdf().then(({ openBunderPdfInNewTab }) => openBunderPdfInNewTab(local, autore));
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE PDF",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Apertura PDF in nuova scheda del browser.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  const esportaWord = useCallback(() => {
    if (!local) return;
    openBunderWordInNewTab(local);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE WORD",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Apertura documento Word (HTML) in nuova scheda.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  const stampa = useCallback(() => {
    if (!local) return;
    openBunderPrintPreview(local);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "STAMPA",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Anteprima di stampa aperta in nuova scheda.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  if (!open || !local) return null;

  const tot = totaleDocumento(local);

  return (
    <>
    <GestionaleModalShell
      modalSize="formLarge"
      onRequestClose={requestClose}
      header={
        <GestionaleModalHeader
          title={`Documento commerciale — ${local.numeroProgressivo}`}
          subtitle={bunderKindLabel(local.kind)}
          onRequestClose={requestClose}
          actions={
            <>
              <button type="button" className={dsBtnNeutral} onClick={esportaWord}>
                Word
              </button>
              <button type="button" className={dsBtnNeutral} onClick={esportaPdf}>
                PDF
              </button>
              <button type="button" className={dsBtnNeutral} onClick={stampa}>
                Stampa
              </button>
              <button type="button" className={dsBtnPrimary} onClick={salva}>
                Salva
              </button>
            </>
          }
        />
      }
    >
        <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
          <GestionaleModalScrollBody className="sm:pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="bunder-edit-tipo" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tipo documento
              <div className="mt-1">
                <GlobalSelect
                  id="bunder-edit-tipo"
                  variant="filter"
                  inputClassName={globalInputFieldFilter}
                  items={BUNDER_DOC_KIND_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  value={local.kind}
                  onChange={(v) => onChangeKind(v as BunderDocKind)}
                  strictFromList
                  aria-label="Tipo documento"
                />
              </div>
            </label>
            <label htmlFor="bunder-edit-numero" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Numero (automatico)
              <input
                id="bunder-edit-numero"
                className={`${dsInput} mt-1 w-full`}
                readOnly
                aria-readonly="true"
                value={local.numeroProgressivo}
              />
            </label>
            <label htmlFor="bunder-edit-data" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Data documento
              <div className="mt-1">
                <GlobalDatePickerYmd
                  id="bunder-edit-data"
                  valueYmd={local.dataDocumento}
                  onChangeYmd={(v) => setLocal({ ...local, dataDocumento: v })}
                  aria-label="Data documento"
                />
              </div>
            </label>
            <label htmlFor="bunder-edit-luogo" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Luogo
              <input
                id="bunder-edit-luogo"
                className={`${dsInput} mt-1 w-full`}
                value={local.luogo}
                onChange={(e) => setLocal({ ...local, luogo: e.target.value })}
              />
            </label>
            <label htmlFor="bunder-edit-riferimento" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
              Riferimento interno
              <input
                id="bunder-edit-riferimento"
                className={`${dsInput} mt-1 w-full`}
                value={local.riferimentoInterno}
                onChange={(e) => setLocal({ ...local, riferimentoInterno: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Destinatario</p>
              <button type="button" className={`text-xs font-semibold text-orange-700 underline-offset-2 hover:underline ${erpFocus}`} onClick={applicaStoricoCliente}>
                Applica dati da ultimo documento stessa azienda
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="bunder-edit-azienda" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                Ragione sociale
                <input
                  id="bunder-edit-azienda"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.aziendaDestinatario}
                  onChange={(e) => setLocal({ ...local, aziendaDestinatario: e.target.value })}
                />
              </label>
              <label htmlFor="bunder-edit-indirizzo" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                Indirizzo
                <input
                  id="bunder-edit-indirizzo"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.indirizzo}
                  onChange={(e) => setLocal({ ...local, indirizzo: e.target.value })}
                />
              </label>
              <label htmlFor="bunder-edit-cap" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                CAP
                <input
                  id="bunder-edit-cap"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.cap}
                  onChange={(e) => setLocal({ ...local, cap: e.target.value })}
                />
              </label>
              <label htmlFor="bunder-edit-citta" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Città
                <input
                  id="bunder-edit-citta"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.citta}
                  onChange={(e) => setLocal({ ...local, citta: e.target.value })}
                />
              </label>
              <label htmlFor="bunder-edit-referente" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Referente (C.a.)
                <input
                  id="bunder-edit-referente"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.referente}
                  onChange={(e) => setLocal({ ...local, referente: e.target.value })}
                />
              </label>
              <label htmlFor="bunder-edit-settore" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Settore / ambito
                <input
                  id="bunder-edit-settore"
                  className={`${dsInput} mt-1 w-full`}
                  value={local.settore}
                  onChange={(e) => setLocal({ ...local, settore: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Importa righe da preventivo CAB</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label htmlFor="bunder-edit-preventivo" className="min-w-0 flex-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Preventivo
                <div className="mt-1">
                  <GlobalSelect
                    id="bunder-edit-preventivo"
                    variant="filter"
                    inputClassName={globalInputFieldFilter}
                    items={[
                      { value: "", label: "— Seleziona —" },
                      ...preventivi.map((p: PreventivoRecord) => ({
                        value: p.id,
                        label: `${p.numero} · ${p.cliente || "Cliente"} · ${p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
                      })),
                    ]}
                    value={prevPick}
                    onChange={setPrevPick}
                    strictFromList
                    aria-label="Preventivo da importare"
                  />
                </div>
              </label>
              <button type="button" className={dsBtnNeutral} onClick={importaPreventivo} disabled={!prevPick}>
                Importa righe
              </button>
            </div>
          </div>

          <label htmlFor="bunder-edit-oggetto" className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Oggetto
            <input
              id="bunder-edit-oggetto"
              className={`${dsInput} mt-1 w-full`}
              value={local.oggetto}
              onChange={(e) => setLocal({ ...local, oggetto: e.target.value })}
            />
          </label>
          <label htmlFor="bunder-edit-intro" className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Introduzione
            <textarea
              id="bunder-edit-intro"
              className={`${dsInput} mt-1 min-h-[72px] w-full resize-y`}
              value={local.intro}
              onChange={(e) => setLocal({ ...local, intro: e.target.value })}
            />
          </label>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Righe prodotto</p>
              <button type="button" className={`${dsBtnNeutral} text-xs`} onClick={addRiga}>
                + Riga
              </button>
            </div>
            <div
              className={`${dsTableWrap} ${dsScrollbar}`}
              role="region"
              aria-label="Righe prodotto, scorrimento orizzontale su schermi piccoli"
            >
              <table className={`${dsTable} min-w-[720px] text-[11px]`}>
                <GlobalTableHead sticky>
                    <GlobalTableHeadLabel label="Qtà" />
                    <GlobalTableHeadLabel label="Codice" />
                    <GlobalTableHeadLabel label="Nome" />
                    <GlobalTableHeadLabel label="Descr. tecnica" />
                    <GlobalTableHeadLabel label="Pr. unit." />
                    <GlobalTableHeadLabel label="Tot." />
                    <GlobalTableHeadLabel label="" thClassName="w-8" />
                </GlobalTableHead>
                <tbody>
                  {local.righe.map((r, idx) => (
                    <tr key={r.id} className={dsTableRow}>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          className={`${dsInput} w-16 py-1 text-xs`}
                          value={r.quantita}
                          min={0.01}
                          step={0.01}
                          inputMode="decimal"
                          aria-label={`Quantità riga ${idx + 1}`}
                          onChange={(e) => updateRiga(r.id, { quantita: Math.max(0.01, Number(e.target.value) || 1) })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          className={`${dsInput} w-24 py-1 text-xs`}
                          value={r.codice}
                          aria-label={`Codice riga ${idx + 1}`}
                          onChange={(e) => updateRiga(r.id, { codice: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          className={`${dsInput} min-w-[8rem] py-1 text-xs`}
                          value={r.nome}
                          aria-label={`Nome prodotto riga ${idx + 1}`}
                          onChange={(e) => updateRiga(r.id, { nome: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <textarea
                          className={`${dsInput} min-h-[48px] min-w-[12rem] resize-y py-1 text-xs`}
                          value={r.descrizioneTecnica}
                          aria-label={`Descrizione tecnica riga ${idx + 1}`}
                          onChange={(e) => updateRiga(r.id, { descrizioneTecnica: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          className={`${dsInput} w-24 py-1 text-xs`}
                          value={r.prezzoUnitario}
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                          aria-label={`Prezzo unitario riga ${idx + 1}`}
                          onChange={(e) => updateRiga(r.id, { prezzoUnitario: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </td>
                      <td className="px-2 py-1 tabular-nums text-[color:var(--cab-text)]">
                        {(r.quantita * r.prezzoUnitario).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="px-1 py-1">
                        <button type="button" className={dsBtnDanger} onClick={() => removeRiga(r.id)} title="Elimina riga">
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-[color:var(--cab-text)]">Totale: {tot.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["iva", "IVA"],
                ["resa", "Resa"],
                ["trasporto", "Trasporto"],
                ["assemblaggio", "Assemblaggio"],
                ["consegna", "Consegna"],
                ["pagamento", "Pagamento"],
                ["garanzia", "Garanzia"],
                ["validitaOfferta", "Validità offerta"],
              ] as const
            ).map(([k, lab]) => (
              <label key={k} htmlFor={`bunder-edit-cond-${k}`} className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {lab}
                <input
                  id={`bunder-edit-cond-${k}`}
                  className={`${dsInput} mt-1 w-full`}
                  value={local.condizioni[k]}
                  onChange={(e) => setLocal({ ...local, condizioni: { ...local.condizioni, [k]: e.target.value } })}
                />
              </label>
            ))}
          </div>

          <label htmlFor="bunder-edit-clausole" className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Clausole legali
            <textarea
              id="bunder-edit-clausole"
              className={`${dsInput} mt-1 min-h-[120px] w-full resize-y`}
              value={local.clausoleLegali}
              onChange={(e) => setLocal({ ...local, clausoleLegali: e.target.value })}
            />
          </label>
          <label htmlFor="bunder-edit-chiusura" className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Chiusura
            <input
              id="bunder-edit-chiusura"
              className={`${dsInput} mt-1 w-full`}
              value={local.chiusura}
              onChange={(e) => setLocal({ ...local, chiusura: e.target.value })}
            />
          </label>
          <label htmlFor="bunder-edit-note-firma" className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Firma / note piè pagina
            <textarea
              id="bunder-edit-note-firma"
              className={`${dsInput} mt-1 min-h-[56px] w-full resize-y`}
              value={local.noteFirma}
              onChange={(e) => setLocal({ ...local, noteFirma: e.target.value })}
            />
          </label>
          </GestionaleModalScrollBody>
        </div>
    </GestionaleModalShell>
    <GestionaleUnsavedChangesDialog
      open={unsavedExitOpen}
      placement="stacked"
      title="Modifiche non salvate"
      message="Hai modifiche non salvate nel documento commerciale. Come vuoi procedere?"
      onStay={() => setUnsavedExitOpen(false)}
      onDiscard={() => {
        setUnsavedExitOpen(false);
        onClose();
      }}
      onSaveAndExit={() => {
        setUnsavedExitOpen(false);
        salva();
      }}
    />
    </>
  );
}
