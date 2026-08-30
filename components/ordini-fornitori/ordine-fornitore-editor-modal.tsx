"use client";

import { OptionalTooltip } from "@/components/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import {
  IconActionButton,
  GestionaleCollapsibleSection,

  GestionaleModalFooterCancelButton,
  GestionaleModalFooterDeleteButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GlobalDatePickerYmd, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { OrdineFornitoreDestinazioneFields } from "@/components/ordini-fornitori/ordine-fornitore-destinazione-fields";
import { OrdineFornitoreFornitoreFields } from "@/components/ordini-fornitori/ordine-fornitore-fornitore-fields";
import { OrdineFornitoreLogisticaFields } from "@/components/ordini-fornitori/ordine-fornitore-logistica-fields";
import { OrdineFornitoreStoricoSection } from "@/components/ordini-fornitori/ordine-fornitore-storico-section";
import { OrdineFornitoreEmailComposerModal } from "@/components/ordini-fornitori/ordine-fornitore-email-composer-modal";
import { OrdineFornitoreComunicazioniSection } from "@/components/ordini-fornitori/ordine-fornitore-comunicazioni-section";
import { CommunicationTestModeBadge } from "@/components/communications/communication-test-mode-badge";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RicambioUnitaMisuraPicker } from "@/components/gestionale/magazzino/ricambio-unita-misura-picker";
import {
  preventivoEditorAddRowBtn,
  preventivoEditorFooterBtnNeutral,
  preventivoEditorFooterBtnPrimary,
  preventivoEditorMoneyValueSm,
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
  preventivoEditorTableInput,
  preventivoEditorTableInputNumber,
  preventivoEditorTableTdClass,
} from "@/components/preventivi/preventivo-editor-ui";
import {
  fmtPreventivoEuro,
  PreventivoEditorRiepilogoRow,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import {
  defaultNewOrdineDestinazione,
} from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";
import {
  ordineFornitoreNeedsCloseConfirm,
} from "@/lib/ordini-fornitori/ordine-fornitore-editor-dirty";
import {
  formatOfficinaSede,
  isOfficinaSedeConfigured,
  readOfficinaSedeOperativaFromRows,
} from "@/lib/officina/officina-sede";
import {
  officinaDestinatarioOrdiniToAnagrafica,
  readOfficinaDestinatarioOrdiniFromRows,
} from "@/lib/officina/officina-destinatario-ordini";
import { readOfficinaBancheOrdiniFromRows } from "@/lib/officina/officina-banche-ordini";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { openOrdineFornitorePdfPreviewFromRecord } from "@/lib/ordini-fornitori/ordine-fornitore-pdf";
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
import {

  dsInput,
  dsScrollbar,
  dsTable,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_EXTRA } from "@/lib/validation/text-field-limits";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { applyFornitoreLabelToRecord } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { getFornitoreAnagraficaSettings } from "@/lib/magazzino/fornitore-anagrafica";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  ORDINE_FORNITORE_STATUS_EDITOR_ITEMS,
  ORDINE_FORNITORE_STATUS_PILL_SHELL,
  ordineFornitoreStatusPillStyle,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";
import {
  buildEmptyOrdineSpesaVariaRiga,
  mergeOrdineRighe,
  ORDINE_RIGA_META_SPESA_VARIA,
  splitOrdineRighe,
} from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import {
  defaultOrdineRigaMeta,
  patchRigaMeta,
} from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";
import {
  parseRicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import { OrdineFornitoreRigaMagazzinoField } from "@/components/ordini-fornitori/ordine-fornitore-riga-magazzino-field";
import { finalizeOrdineFornitoreImportClient } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-client";
import {
  buildOrdineImportMeta,
  ordineRecordMetaWithImport,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-meta";
import { ordineMetaWithOggetto, ordineRecordWithOggetto } from "@/lib/ordini-fornitori/ordine-fornitore-oggetto";
import { OrdineFornitoreImportQualityBanner } from "@/components/ordini-fornitori/ordine-fornitore-import-quality-banner";
import {
  codiceRicambioPerFornitoreOrdine,
  ordineRigaPatchFromRicambio,
  ricambioBelongsToFornitoreOrdine,
  searchMagazzinoForOrdineFornitore,
} from "@/lib/ordini-fornitori/ordine-fornitore-magazzino-picker";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import type { OrdineFornitoreEditorImportMeta } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { OrdineFornitoreEditorIdentificaMeta } from "@/lib/ordini-fornitori/identifica-ricambio/types";
import { createOrdineFromIdentificaClient } from "@/lib/ordini-fornitori/identifica-ricambio/identifica-ordine-client";

function newRigaId(): string {
  return crypto.randomUUID();
}

import { useSubmitLock } from "@/lib/forms/form-engine";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const ordineRigheTableMinWidthClass = "min-w-[58rem]";
const ordineSpeseVarieTableMinWidthClass = "min-w-[32rem]";

function recordToCreateInput(
  record: OrdineFornitoreRecord,
  importMeta?: OrdineFornitoreEditorImportMeta,
  importedBy?: string,
): OrdineFornitoreCreateInput {
  const input: OrdineFornitoreCreateInput = {
    status: record.status,
    data_ordine: record.dataOrdine,
    fornitore_label: record.fornitoreLabel,
    fornitore_snapshot: record.fornitoreSnapshot,
    destinazione: record.destinazione || null,
    destinazione_snapshot: record.destinazioneSnapshot,
    logistica_snapshot: record.logisticaSnapshot,
    note: record.note || null,
    trasporto: 0,
    iva_percent: record.ivaPercent,
    righe: record.righe.map((r) => ({
      ricambio_id: r.ricambioId,
      codice: r.codice || null,
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzo_unitario: r.prezzoUnitario,
      sconto_percent: r.scontoPercent,
      meta: {
        ...patchRigaMeta(r.meta, { unitaMisura: r.unitaMisura, ivaPercent: r.ivaPercent }),
        ...(r.meta[ORDINE_RIGA_META_SPESA_VARIA] === true ? { [ORDINE_RIGA_META_SPESA_VARIA]: true } : {}),
      },
    })),
  };
  if (importMeta && importedBy) {
    input.meta = ordineMetaWithOggetto(
      ordineRecordMetaWithImport(
        record.meta,
        buildOrdineImportMeta({
          importSource: importMeta.source,
          contentHash: importMeta.contentHash,
          semanticKey: importMeta.semanticKey,
          importedBy,
          quality: importMeta.quality,
        }),
      ),
      record.oggettoOrdine,
    );
  } else {
    input.meta = ordineMetaWithOggetto(record.meta, record.oggettoOrdine);
  }
  if (Object.keys(input.meta).length === 0) delete input.meta;
  return input;
}

export function OrdineFornitoreEditorModal({
  record: initialRecord,
  isNew,
  mode = "edit",
  canWrite,
  importMeta,
  identificaMeta,
  onClose,
  onSaved,
  onSwitchToEdit,
  onDelete,
}: {
  record: OrdineFornitoreRecord;
  isNew: boolean;
  mode?: "view" | "edit";
  canWrite: boolean;
  importMeta?: OrdineFornitoreEditorImportMeta;
  identificaMeta?: OrdineFornitoreEditorIdentificaMeta;
  onClose: () => void;
  onSaved: (info?: { record?: OrdineFornitoreRecord }) => void | Promise<void>;
  onSwitchToEdit?: () => void;
  onDelete?: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [fornitoreVerifiedByUser, setFornitoreVerifiedByUser] = useState(
    () => !identificaMeta?.fornitoreNeedsVerification,
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync verification flag when identifica meta changes
    setFornitoreVerifiedByUser(!identificaMeta?.fornitoreNeedsVerification);
  }, [identificaMeta]);

  const identificaPrezzoHint =
    identificaMeta?.prezzoSuggerito != null
      ? `Suggerito: ${fmtPreventivoEuro(identificaMeta.prezzoSuggerito)}${
          identificaMeta.prezzoSource.label ? ` da ${identificaMeta.prezzoSource.label}` : ""
        }`
      : null;

  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const submitLock = useSubmitLock();
  const settingsQ = useSharedAppSettingsQuery();
  const sedeOperativaFields = useMemo(
    () => readOfficinaSedeOperativaFromRows(settingsQ?.data?.rows),
    [settingsQ?.data?.rows],
  );
  const sedeOperativaLine = useMemo(() => formatOfficinaSede(sedeOperativaFields), [sedeOperativaFields]);
  const sedeOperativaConfigured = isOfficinaSedeConfigured(sedeOperativaFields);
  const destinatarioSettings = useMemo(
    () => readOfficinaDestinatarioOrdiniFromRows(settingsQ?.data?.rows),
    [settingsQ?.data?.rows],
  );
  const destinatarioAnagrafica = useMemo(
    () => officinaDestinatarioOrdiniToAnagrafica(destinatarioSettings, sedeOperativaLine),
    [destinatarioSettings, sedeOperativaLine],
  );
  const bancheOrdini = useMemo(
    () => readOfficinaBancheOrdiniFromRows(settingsQ?.data?.rows),
    [settingsQ?.data?.rows],
  );
  const magazzinoMaster = useMemo(
    () => resolveCabAppSettingsFromRows(settingsQ?.data?.rows ?? []).magazzinoMaster,
    [settingsQ?.data?.rows],
  );

  const pdfLogoRef = useRef<string | null>(null);
  const baselineRef = useRef(initialRecord);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const importFinalizedRef = useRef(importMeta?.saved ?? false);
  const [record, setRecord] = useState(initialRecord);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const viewMode = mode === "view";
  const fieldsReadOnly = viewMode || !canWrite || (!isNew && initialRecord.status !== "bozza");
  const canEditStatus = !viewMode && canWrite && initialRecord.status !== "annullato";
  const statusDirty = !isNew && record.status !== initialRecord.status;
  const canSave =
    canWrite &&
    (isNew || !fieldsReadOnly || statusDirty) &&
    (!identificaMeta?.fornitoreNeedsVerification || fornitoreVerifiedByUser);

  useEffect(() => {
    void loadBrandingLogoDataUrl().then((logo) => {
      pdfLogoRef.current = logo;
    });
  }, [initialRecord.id, isNew]);

  useEffect(() => {
    baselineRef.current = initialRecord;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setRecord(initialRecord);
    setUnsavedExitOpen(false);
  }, [initialRecord]);

  useEffect(() => {
    if (!isNew) return;
    setRecord((prev) => {
      const next = defaultNewOrdineDestinazione(prev, sedeOperativaLine, destinatarioAnagrafica);
      baselineRef.current = next;
      return next;
    });
  }, [isNew, sedeOperativaLine, destinatarioAnagrafica, initialRecord.id]);

  useEffect(() => {
    importFinalizedRef.current = importMeta?.saved ?? false;
  }, [importMeta]);

  const finalizeImportAbandon = useCallback(async () => {
    if (!importMeta || importFinalizedRef.current) return;
    if (importMeta.source.type !== "import_file") return;
    importFinalizedRef.current = true;
    try {
      const { abandonImportFile } = await import("@/lib/ordini-fornitori/import/ordine-fornitore-import-client");
      await abandonImportFile(importMeta.source.id);
    } catch {
      importFinalizedRef.current = false;
    }
  }, [importMeta]);

  const closeWithImportCleanup = useCallback(() => {
    void finalizeImportAbandon().finally(() => onClose());
  }, [finalizeImportAbandon, onClose]);

  function requestClose() {
    if (viewMode) {
      onClose();
      return;
    }
    if (!ordineFornitoreNeedsCloseConfirm(record, baselineRef.current)) {
      setUnsavedExitOpen(false);
      closeWithImportCleanup();
      return;
    }
    setUnsavedExitOpen(true);
  }

  const { oggetti: righeOggetti, speseVarie } = useMemo(() => splitOrdineRighe(record.righe), [record.righe]);

  const magazzinoQ = useMagazzinoRicambiUIQuery(undefined, { enabled: !viewMode });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  const prodottiMagazzino = magazzinoQ.data ?? [];
  const [magAcRowId, setMagAcRowId] = useState<string | null>(null);
  const [magAcField, setMagAcField] = useState<"codice" | "descrizione" | null>(null);

  const magazzinoSuggestionsForRow = useCallback(
    (riga: OrdineFornitoreRiga, field: "codice" | "descrizione") => {
      const q = field === "codice" ? riga.codice : riga.descrizione;
      return searchMagazzinoForOrdineFornitore(prodottiMagazzino, q, record.fornitoreLabel).map((p) => ({
        id: p.id,
        descrizione: p.descrizione ?? "",
        codice: codiceRicambioPerFornitoreOrdine(p, record.fornitoreLabel),
        marca: p.marca ?? "",
        fornitoreMatch: ricambioBelongsToFornitoreOrdine(p, record.fornitoreLabel),
      }));
    },
    [prodottiMagazzino, record.fornitoreLabel],
  );

  const totals = useMemo(
    () =>
      calcolaTotaliOrdineFornitore({
        righe: record.righe,
        trasporto: 0,
        ivaPercent: record.ivaPercent,
      }),
    [record.righe, record.ivaPercent],
  );

  const patchRigheMerged = useCallback((oggetti: OrdineFornitoreRiga[], spese: OrdineFornitoreRiga[]) => {
    setRecord((prev) => ({ ...prev, righe: mergeOrdineRighe(oggetti, spese) }));
  }, []);

  function addEmptyRiga() {
    const meta = defaultOrdineRigaMeta(record.ivaPercent);
    const riga: OrdineFornitoreRiga = {
      id: newRigaId(),
      ordine: righeOggetti.length + 1,
      ricambioId: null,
      codice: "",
      descrizione: "",
      quantita: 1,
      prezzoUnitario: 0,
      scontoPercent: 0,
      totaleRiga: 0,
      unitaMisura: "pz",
      ivaPercent: record.ivaPercent || 22,
      meta,
    };
    riga.totaleRiga = totaleNettoRigaOrdine(riga);
    patchRigheMerged([...righeOggetti, riga], speseVarie);
  }

  function addEmptySpesaVaria() {
    const riga = buildEmptyOrdineSpesaVariaRiga(record.ivaPercent || 22);
    patchRigheMerged(righeOggetti, [...speseVarie, riga]);
  }

  function updateRigaOggetto(id: string, patch: Partial<OrdineFornitoreRiga>) {
    patchRigheMerged(
      righeOggetti.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.unitaMisura !== undefined || patch.ivaPercent !== undefined) {
          next.meta = patchRigaMeta(next.meta, {
            unitaMisura: next.unitaMisura,
            ivaPercent: next.ivaPercent,
          });
        }
        next.totaleRiga = totaleNettoRigaOrdine(next);
        return next;
      }),
      speseVarie,
    );
  }

  function selectRicambioForRow(rowId: string, ricambioId: string) {
    const ricambio = prodottiMagazzino.find((p) => p.id === ricambioId);
    if (!ricambio) return;
    updateRigaOggetto(rowId, ordineRigaPatchFromRicambio(ricambio, record.fornitoreLabel, record.ivaPercent));
    setMagAcRowId(null);
    setMagAcField(null);
  }

  function updateSpesaVaria(id: string, patch: Partial<OrdineFornitoreRiga>) {
    patchRigheMerged(
      righeOggetti,
      speseVarie.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch, quantita: 1, scontoPercent: 0 };
        if (patch.ivaPercent !== undefined) {
          next.meta = patchRigaMeta(next.meta, { ivaPercent: next.ivaPercent });
          next.meta[ORDINE_RIGA_META_SPESA_VARIA] = true;
        }
        next.totaleRiga = totaleNettoRigaOrdine(next);
        return next;
      }),
    );
  }

  function removeRigaOggetto(id: string) {
    patchRigheMerged(
      righeOggetti.filter((r) => r.id !== id),
      speseVarie,
    );
  }

  function removeSpesaVaria(id: string) {
    patchRigheMerged(
      righeOggetti,
      speseVarie.filter((r) => r.id !== id),
    );
  }

  async function handleSave(): Promise<boolean> {
    if (!canSave) return false;
    if (!submitLock.acquire()) return false;
    if (!record.fornitoreLabel.trim()) {
      submitLock.release();
      gestToast.validation("Seleziona un fornitore.");
      return false;
    }
    if (righeOggetti.length === 0) {
      submitLock.release();
      gestToast.validation("Aggiungi almeno una riga oggetto.");
      return false;
    }

    for (const s of speseVarie) {
      if (s.prezzoUnitario > 0 && !s.descrizione.trim()) {
        submitLock.release();
        gestToast.validation("Inserisci la descrizione per ogni spesa con importo.");
        return false;
      }
    }

    if (identificaMeta?.fornitoreNeedsVerification && !fornitoreVerifiedByUser) {
      submitLock.release();
      gestToast.validation("Verifica o correggi il fornitore suggerito prima di salvare.");
      return false;
    }

    try {
      if (!isNew && initialRecord.status !== "bozza") {
        if (!statusDirty) return false;
        const res = await ordiniFornitoriEntry.updateStatus(record.id, record.status, record.updatedAt);
        if (!res.success) throw new Error(res.error ?? "Salvataggio fallito.");
        gestToast.successOnce("ordine-save", "Stato ordine aggiornato.");
        await Promise.resolve(onSaved());
        return true;
      }

      const payload = recordToCreateInput(
        {
          ...record,
          righe: mergeOrdineRighe(
            righeOggetti,
            speseVarie.filter((s) => s.descrizione.trim() && s.prezzoUnitario > 0),
          ),
          imponibileRighe: totals.imponibileRighe,
          imponibile: totals.imponibile,
          iva: totals.iva,
          totale: totals.totale,
        },
        isNew ? importMeta : undefined,
        isNew && importMeta
          ? (await getBrowserSupabase().auth.getUser()).data.user?.id ?? ""
          : undefined,
      );

      if (isNew) {
        if (identificaMeta?.saveContext) {
          const res = await createOrdineFromIdentificaClient({
            sourceSearchId: identificaMeta.saveContext.sourceSearchId,
            sourceCandidateId: identificaMeta.saveContext.sourceCandidateId,
            payload,
          });
          const detail = await ordiniFornitoriEntry.getDetail(res.ordineId);
          gestToast.successOnce("ordine-save", "Ordine creato da identificazione ricambio.");
          await Promise.resolve(onSaved(detail.success && detail.data ? { record: detail.data } : undefined));
          return true;
        }
        const res = await ordiniFornitoriEntry.create(payload);
        if (!res.success) throw new Error(res.error ?? "Salvataggio fallito.");
        if (importMeta && res.data?.id && !importFinalizedRef.current) {
          importFinalizedRef.current = true;
          try {
            await finalizeOrdineFornitoreImportClient({
              source: importMeta.source,
              ordineId: res.data.id,
              contentHash: importMeta.contentHash,
              semanticKey: importMeta.semanticKey ?? undefined,
            });
          } catch (linkErr) {
            importFinalizedRef.current = false;
            gestToast.errorOnce("ordine-import-link", linkErr, { module: "ordini_fornitori" });
          }
        }
        gestToast.successOnce("ordine-save", "Ordine creato.");
        await Promise.resolve(onSaved(res.data ? { record: res.data } : undefined));
        return true;
      }

      const res = await ordiniFornitoriEntry.updateDraft(record.id, payload, record.updatedAt);
      if (!res.success) throw new Error(res.error ?? "Salvataggio fallito.");
      gestToast.successOnce("ordine-save", "Ordine salvato.");
      const detail = await ordiniFornitoriEntry.getDetail(record.id);
      await Promise.resolve(onSaved(detail.success && detail.data ? { record: detail.data } : undefined));
      return true;
    } catch (e) {
      gestToast.errorOnce("ordine-save", e, { module: "ordini_fornitori" });
      return false;
    } finally {
      submitLock.release();
    }
  }

  const modalTitle = isNew
    ? "Nuovo ordine fornitore"
    : viewMode
      ? `Visualizza ordine ${record.numero || ""}`
      : `Ordine ${record.numero || ""}`;

  const pdfPreviewRecord = {
    ...record,
    righe: mergeOrdineRighe(
      righeOggetti,
      speseVarie.filter((s) => s.descrizione.trim() && s.prezzoUnitario > 0),
    ),
    imponibileRighe: totals.imponibileRighe,
    imponibile: totals.imponibile,
    iva: totals.iva,
    totale: totals.totale,
  };

  return (
    <LavorazioniModalShell
      modalRootRef={modalRootRef}
      onRequestClose={requestClose}
      title={modalTitle}
      modalSize="analytics"
      modalHeight="standard"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <CommunicationTestModeBadge />
          <button
            type="button"
            className={preventivoEditorFooterBtnNeutral}
            onClick={() => {
              openOrdineFornitorePdfPreviewFromRecord(pdfPreviewRecord, pdfLogoRef.current);
            }}
          >
            Anteprima
          </button>
          {!isNew && canWrite ? (
            <button type="button" className={preventivoEditorFooterBtnNeutral} onClick={() => setSendEmailOpen(true)}>
              Invia ordine
            </button>
          ) : null}
          {viewMode ? (
            <>
              {!isNew && onDelete ? (
                <OptionalTooltip content={!canWrite ? READONLY_PERMISSION_HINT : undefined}>
                  <GestionaleModalFooterDeleteButton
                    className="w-full sm:w-auto"
                    disabled={!canWrite}
                    onClick={onDelete}
                  />
                </OptionalTooltip>
              ) : null}
              <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onClose}>
                Chiudi
              </GestionaleModalFooterCancelButton>
              {initialRecord.status === "bozza" ? (
                <OptionalTooltip content={!canWrite ? READONLY_PERMISSION_HINT : undefined}>
                  <button type="button" className={preventivoEditorFooterBtnPrimary} disabled={!canWrite} onClick={onSwitchToEdit}>
                    Modifica
                  </button>
                </OptionalTooltip>
              ) : null}
            </>
          ) : (
            <>
              <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={requestClose} />
              <OptionalTooltip content={!canWrite ? READONLY_PERMISSION_HINT : undefined}>
                <GestionaleModalFooterSaveButton
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={!canWrite || !canSave}
                  loading={submitLock.isLocked()}
                  onClick={() => void handleSave()}
                />
              </OptionalTooltip>
            </>
          )}
        </div>
      }
    >
      <div className={`relative ${gestionaleModalBodyFlexClass}`}>
        <GestionaleModalScrollBody className={`py-3 ${dsScrollbar}`}>
          <div className="space-y-3 pb-4">
            {importMeta ? (
              <OrdineFornitoreImportQualityBanner level={importMeta.quality.level} />
            ) : null}
            {identificaMeta?.fornitoreNeedsVerification ? (
              <p className="rounded-lg border border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,transparent)] px-3 py-2 text-sm text-[color:var(--cab-text)]">
                Fornitore suggerito dall&apos;identificazione — verifica o correggi prima di inviare.
              </p>
            ) : null}
            {identificaMeta?.prefillWarnings?.map((w) => (
              <p
                key={w}
                className="rounded-lg border border-[color:color-mix(in_srgb,var(--cab-warning)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,transparent)] px-3 py-2 text-sm text-[color:var(--cab-text-muted)]"
              >
                {w}
              </p>
            ))}
            <GestionaleCollapsibleSection title="Dati ordine" defaultCollapsed={false} variant="form">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
                <FormField label="Numero">
                  <input className={`${dsInput} tabular-nums`} value={record.numero} readOnly aria-readonly />
                </FormField>
                <FormField label="Stato">
                  <GlobalFixedListPillSelect
                    value={record.status}
                    onChange={(v) =>
                      setRecord((p) => ({ ...p, status: v as OrdineFornitoreStatus }))
                    }
                    options={ORDINE_FORNITORE_STATUS_EDITOR_ITEMS}
                    ariaLabel="Stato ordine"
                    disabled={!canEditStatus}
                    size="form"
                    shellClass={ORDINE_FORNITORE_STATUS_PILL_SHELL}
                    fallbackPillStyle={ordineFornitoreStatusPillStyle("bozza")}
                  />
                </FormField>
                <div className="w-full sm:col-span-2 lg:col-span-1 lg:justify-self-end lg:max-w-xs">
                  <FormField label="Data ordine" htmlFor="ordine-data">
                    <GlobalDatePickerYmd
                      id="ordine-data"
                      variant="default"
                      valueYmd={record.dataOrdine}
                      disabled={fieldsReadOnly}
                      onChangeYmd={(ymd) => {
                        if (!ymd.trim()) return;
                        setRecord((p) => ({ ...p, dataOrdine: ymd }));
                      }}
                      aria-label="Data ordine"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormField label="Oggetto ordine" htmlFor="ordine-oggetto">
                    <input
                      id="ordine-oggetto"
                      className={dsInput}
                      value={record.oggettoOrdine}
                      disabled={fieldsReadOnly}
                      onChange={(e) => setRecord((p) => ordineRecordWithOggetto(p, e.target.value))}
                      placeholder="Descrizione sintetica dell'ordine"
                    />
                  </FormField>
                </div>
              </div>
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Dati fornitore" defaultCollapsed={false} variant="form">
              <div className="space-y-3">
                <FormField label="Fornitore *" htmlFor="ordine-fornitore">
                  <GlobalSettingsListSelect
                    id="ordine-fornitore"
                    listKey="magazzino:fornitoriOrdine"
                    value={record.fornitoreLabel}
                    onChange={(v) => {
                      setFornitoreVerifiedByUser(true);
                      setRecord((p) =>
                        applyFornitoreLabelToRecord(p, v, getFornitoreAnagraficaSettings(magazzinoMaster, v)),
                      );
                    }}
                    disabled={fieldsReadOnly}
                    required
                    className={
                      identificaMeta?.fornitoreNeedsVerification && !fornitoreVerifiedByUser
                        ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-warning)_55%,transparent)] rounded-[var(--ds-radius-md)]"
                        : undefined
                    }
                  />
                  {identificaMeta?.fornitoreNeedsVerification && !fornitoreVerifiedByUser ? (
                    <p className="mt-1 text-xs font-medium text-[color:var(--cab-warning)]">Da verificare</p>
                  ) : null}
                </FormField>
                <OrdineFornitoreFornitoreFields record={record} readOnly={fieldsReadOnly} onRecordChange={setRecord} />
              </div>
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Dati destinatario" defaultCollapsed={false} variant="form">
              <OrdineFornitoreDestinazioneFields
                record={record}
                sedeOperativaLine={sedeOperativaLine}
                sedeOperativaConfigured={sedeOperativaConfigured}
                destinatarioAnagrafica={destinatarioAnagrafica}
                bancheSalvate={bancheOrdini}
                readOnly={fieldsReadOnly}
                onRecordChange={setRecord}
              />
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Oggetti" defaultCollapsed={false} variant="form">
              <div className={`${dsTableWrap} ${dsScrollbar}`}>
                <table className={`${dsTable} ${ordineRigheTableMinWidthClass} text-xs`}>
                  <GlobalTableHead>
                    <GlobalTableHeadLabel label="Codice" />
                    <GlobalTableHeadLabel label="Descrizione" thClassName="min-w-[10rem]" />
                    <GlobalTableHeadLabel label="Qtà" />
                    <GlobalTableHeadLabel label="U.M." />
                    <GlobalTableHeadLabel label="Prezzo" />
                    <GlobalTableHeadLabel label="Sc. %" />
                    <GlobalTableHeadLabel label="IVA %" />
                    <GlobalTableHeadLabel label="Totale" />
                    {!fieldsReadOnly ? <GlobalTableHeadLabel label="" thClassName="w-12" /> : null}
                  </GlobalTableHead>
                  <tbody>
                    {righeOggetti.length === 0 && fieldsReadOnly ? (
                      <tr>
                        <td colSpan={fieldsReadOnly ? 8 : 9} className="px-2 py-4 text-center text-[color:var(--cab-text-muted)]">
                          Nessuna riga.
                        </td>
                      </tr>
                    ) : (
                      righeOggetti.map((r, idx) => (
                        <tr key={r.id} className={dsTableRow}>
                          <td className={preventivoEditorTableTdClass}>
                            {fieldsReadOnly ? (
                              <input
                                className={preventivoEditorTableInput}
                                value={r.codice}
                                disabled
                                readOnly
                                aria-label={`Codice riga ${idx + 1}`}
                              />
                            ) : (
                              <OrdineFornitoreRigaMagazzinoField
                                value={r.codice}
                                placeholder="Codice"
                                ariaLabel={`Codice riga ${idx + 1}`}
                                open={magAcRowId === r.id && magAcField === "codice"}
                                onOpenChange={(next) => {
                                  setMagAcRowId(next ? r.id : null);
                                  setMagAcField(next ? "codice" : null);
                                }}
                                suggestions={magazzinoSuggestionsForRow(r, "codice")}
                                onChange={(v) => updateRigaOggetto(r.id, { codice: v, ricambioId: null })}
                                onSelect={(s) => selectRicambioForRow(r.id, s.id)}
                              />
                            )}
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            {fieldsReadOnly ? (
                              <input
                                className={preventivoEditorTableInput}
                                value={r.descrizione}
                                disabled
                                readOnly
                                aria-label={`Descrizione riga ${idx + 1}`}
                              />
                            ) : (
                              <OrdineFornitoreRigaMagazzinoField
                                value={r.descrizione}
                                placeholder="Descrizione"
                                ariaLabel={`Descrizione riga ${idx + 1}`}
                                open={magAcRowId === r.id && magAcField === "descrizione"}
                                onOpenChange={(next) => {
                                  setMagAcRowId(next ? r.id : null);
                                  setMagAcField(next ? "descrizione" : null);
                                }}
                                suggestions={magazzinoSuggestionsForRow(r, "descrizione")}
                                onChange={(v) => updateRigaOggetto(r.id, { descrizione: v, ricambioId: null })}
                                onSelect={(s) => selectRicambioForRow(r.id, s.id)}
                              />
                            )}
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0.001}
                              step={0.001}
                              inputMode="decimal"
                              value={r.quantita}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateRigaOggetto(r.id, { quantita: Number(e.target.value) || 0 })}
                              aria-label={`Quantità riga ${idx + 1}`}
                            />
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <RicambioUnitaMisuraPicker
                              value={parseRicambioUnitaMisura(r.unitaMisura)}
                              rowIndex={idx}
                              disabled={fieldsReadOnly}
                              onChange={(unitaMisura) => updateRigaOggetto(r.id, { unitaMisura })}
                            />
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0}
                              step={0.01}
                              inputMode="decimal"
                              value={r.prezzoUnitario}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateRigaOggetto(r.id, { prezzoUnitario: Number(e.target.value) || 0 })}
                              aria-label={`Prezzo riga ${idx + 1}`}
                            />
                            {idx === 0 && identificaPrezzoHint ? (
                              <p className="mt-0.5 text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
                                {identificaPrezzoHint}
                              </p>
                            ) : null}
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              inputMode="decimal"
                              value={r.scontoPercent}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateRigaOggetto(r.id, { scontoPercent: Number(e.target.value) || 0 })}
                              aria-label={`Sconto riga ${idx + 1}`}
                            />
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              inputMode="decimal"
                              value={r.ivaPercent}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateRigaOggetto(r.id, { ivaPercent: Number(e.target.value) || 0 })}
                              aria-label={`IVA riga ${idx + 1}`}
                            />
                          </td>
                          <td className={`${preventivoEditorTableTdClass} text-right ${preventivoEditorMoneyValueSm}`}>
                            {fmtPreventivoEuro(r.totaleRiga)}
                          </td>
                          {!fieldsReadOnly ? (
                            <td className={preventivoEditorTableTdClass}>
                              <div className="flex justify-end">
                                <IconActionButton
                                  label="Elimina riga"
                                  className={dsTableActionBtnDanger}
                                  onClick={() => removeRigaOggetto(r.id)}
                                >
                                  <svg
                                    className={dsTableActionGlyph}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </IconActionButton>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                    {!fieldsReadOnly ? (
                      <tr className={dsTableRow}>
                        <td colSpan={9} className="px-2 py-1.5">
                          <button type="button" className={preventivoEditorAddRowBtn} onClick={addEmptyRiga}>
                            <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
                            Aggiungi riga
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Spese varie" defaultCollapsed={false} variant="form">
              <div className={`${dsTableWrap} ${dsScrollbar}`}>
                <table className={`${dsTable} ${ordineSpeseVarieTableMinWidthClass} text-xs`}>
                  <GlobalTableHead>
                    <GlobalTableHeadLabel label="Descrizione" thClassName="min-w-[12rem]" />
                    <GlobalTableHeadLabel label="Importo" />
                    <GlobalTableHeadLabel label="IVA %" />
                    <GlobalTableHeadLabel label="Totale" />
                    {!fieldsReadOnly ? <GlobalTableHeadLabel label="" thClassName="w-12" /> : null}
                  </GlobalTableHead>
                  <tbody>
                    {speseVarie.length === 0 && fieldsReadOnly ? (
                      <tr>
                        <td colSpan={fieldsReadOnly ? 4 : 5} className="px-2 py-4 text-center text-[color:var(--cab-text-muted)]">
                          Nessuna spesa.
                        </td>
                      </tr>
                    ) : (
                      speseVarie.map((r, idx) => (
                        <tr key={r.id} className={dsTableRow}>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInput}
                              value={r.descrizione}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateSpesaVaria(r.id, { descrizione: e.target.value })}
                              aria-label={`Descrizione spesa ${idx + 1}`}
                              placeholder="Spese di trasporto, ordine…"
                            />
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0}
                              step={0.01}
                              inputMode="decimal"
                              value={r.prezzoUnitario}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateSpesaVaria(r.id, { prezzoUnitario: Number(e.target.value) || 0 })}
                              aria-label={`Importo spesa ${idx + 1}`}
                            />
                          </td>
                          <td className={preventivoEditorTableTdClass}>
                            <input
                              className={preventivoEditorTableInputNumber}
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              inputMode="decimal"
                              value={r.ivaPercent}
                              disabled={fieldsReadOnly}
                              onChange={(e) => updateSpesaVaria(r.id, { ivaPercent: Number(e.target.value) || 0 })}
                              aria-label={`IVA spesa ${idx + 1}`}
                            />
                          </td>
                          <td className={`${preventivoEditorTableTdClass} text-right ${preventivoEditorMoneyValueSm}`}>
                            {fmtPreventivoEuro(r.totaleRiga)}
                          </td>
                          {!fieldsReadOnly ? (
                            <td className={preventivoEditorTableTdClass}>
                              <div className="flex justify-end">
                                <IconActionButton
                                  label="Elimina spesa"
                                  className={dsTableActionBtnDanger}
                                  onClick={() => removeSpesaVaria(r.id)}
                                >
                                  <svg
                                    className={dsTableActionGlyph}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </IconActionButton>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                    {!fieldsReadOnly ? (
                      <tr className={dsTableRow}>
                        <td colSpan={5} className="px-2 py-1.5">
                          <button type="button" className={preventivoEditorAddRowBtn} onClick={addEmptySpesaVaria}>
                            <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
                            Aggiungi spesa
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Riepilogo" defaultCollapsed={false} variant="form">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className={preventivoEditorSubsectionTitle}>Condizioni consegna</h3>
                  <OrdineFornitoreLogisticaFields
                    record={record}
                    readOnly={fieldsReadOnly}
                    onRecordChange={setRecord}
                  />
                </div>
                <FormField label="Note" htmlFor="ordine-note">
                  <GestionaleTextarea
                    id="ordine-note"
                    value={record.note}
                    disabled={fieldsReadOnly}
                    rows={3}
                    maxLength={TEXT_EXTRA}
                    onChange={(v) => setRecord((p) => ({ ...p, note: sliceInputValue(v, TEXT_EXTRA) }))}
                  />
                </FormField>
                <div className="space-y-2">
                  <h3 className={preventivoEditorSubsectionTitle}>Riepilogo economico</h3>
                  <div className={preventivoEditorPanelClass}>
                    <PreventivoEditorRiepilogoRow
                      label="Imponibile righe"
                      value={fmtPreventivoEuro(totals.imponibileRighe)}
                    />
                    {totals.imponibileSpeseVarie > 0 ? (
                      <PreventivoEditorRiepilogoRow
                        label="Spese varie"
                        value={fmtPreventivoEuro(totals.imponibileSpeseVarie)}
                      />
                    ) : null}
                    <PreventivoEditorRiepilogoRow label="Imponibile" value={fmtPreventivoEuro(totals.imponibile)} tone="subtotal" />
                    <PreventivoEditorRiepilogoRow label="IVA" value={fmtPreventivoEuro(totals.iva)} />
                  </div>
                  <PreventivoEditorTotalBar label="Totale ordine" value={fmtPreventivoEuro(totals.totale)} emphasis="grand" />
                </div>
              </div>
            </GestionaleCollapsibleSection>
            {!isNew ? <OrdineFornitoreComunicazioniSection ordineId={record.id} /> : null}
            {!isNew ? <OrdineFornitoreStoricoSection ordineId={record.id} /> : null}
          </div>
        </GestionaleModalScrollBody>
        <GestionaleUnsavedChangesDialog
          open={unsavedExitOpen}
          placement="nested"
          pending={submitLock.isLocked()}
          onStay={() => setUnsavedExitOpen(false)}
          onDiscard={() => {
            setUnsavedExitOpen(false);
            closeWithImportCleanup();
          }}
          onSaveAndExit={() => {
            void (async () => {
              const ok = await handleSave();
              if (ok) {
                setUnsavedExitOpen(false);
                onClose();
              }
            })();
          }}
        />
        {!isNew ? (
          <OrdineFornitoreEmailComposerModal
            ordineId={record.id}
            open={sendEmailOpen}
            onClose={() => setSendEmailOpen(false)}
          />
        ) : null}
      </div>
    </LavorazioniModalShell>
  );
}
