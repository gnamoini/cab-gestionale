"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RecordImageManager } from "@/components/gestionale/media/record-image-manager";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import {
  RicambioCollapsibleSection,
  ricambioModalFormScrollClass,
} from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { useFormEngine } from "@/lib/forms/form-engine";
import {
  emptyRicambioForm,
  ricambioFormHasNoUserInput,
  ricambioFormImportantWarnings,
  ricambioFormNeedsCloseConfirm,
  ricambioFromFormLenient,
  ricambioLenientPlaceholderFlags,
  RICAMBIO_SAVE_EMPTY_FORM_MESSAGE,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { purgeMagazzinoLogEntriesForRicambioId } from "@/lib/magazzino/magazzino-change-log-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { ricambioUiToMagazzinoInsert } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import {
  gateBeginSubmit,
  gateFormSubmit,
} from "@/lib/form-ux-migration/form-ux-boundary-gate";
import { buildRicambioCompatExpandOptions } from "@/lib/magazzino/resolve-mezzi-liste-for-compat";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

const RICAMBIO_NEW_FORM_ID = "ricambio-new-form";

export function RicambioNewModal({
  marche,
  categorie,
  fornitori,
  produttori,
  mezziListePrefs,
  authorName,
  prodotti,
  magCanCreateRicambio,
  onClose,
  onSaved,
  onSaveError,
  onVaiAlRicambioDuplicato,
}: {
  marche: string[];
  categorie: string[];
  fornitori: string[];
  produttori: string[];
  mezziListePrefs: MezziListePrefs;
  authorName: string;
  prodotti: readonly RicambioMagazzino[];
  magCanCreateRicambio: boolean;
  onClose: () => void;
  onSaved: (ui: RicambioMagazzino) => void;
  onSaveError: (message: string) => void;
  onVaiAlRicambioDuplicato: (id: string) => void;
}) {
  const formEngine = useFormEngine<RicambioFormState>({ initial: emptyRicambioForm() });
  const { value: newDraft, setValue, reset, runSubmit, formProps } = formEngine;
  const [draftId, setDraftId] = useState<string | null>(() => crypto.randomUUID());
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [codiceScan, setCodiceScan] = useState({ primary: "", secondary: "" });
  const baselineForm = useMemo(() => emptyRicambioForm(), []);
  const { mezziListe: mergedMezziListe } = useGlobalOptions({ debugTag: "RicambioNewModal" });
  const compatExpand = useMemo(
    () =>
      buildRicambioCompatExpandOptions({
        mezziListe: mezziListePrefs,
        mezziListeMerged: mergedMezziListe,
      }),
    [mergedMezziListe, mezziListePrefs],
  );
  const needsCloseConfirm = useMemo(
    () => ricambioFormNeedsCloseConfirm(newDraft, baselineForm),
    [newDraft, baselineForm],
  );

  useBeforeUnloadWhenDirty(needsCloseConfirm, "Hai modifiche non salvate nel nuovo ricambio.");

  const setNewForm = useCallback(
    (action: React.SetStateAction<RicambioFormState>) => {
      setValue(action);
    },
    [setValue],
  );

  const codiceDupEsistente = useMemo(() => {
    const primary = codiceScan.primary.trim();
    if (!primary) return null;
    return findDuplicateByCodici([...prodotti], primary, {
      alsoCheckSecondary: codiceScan.secondary.trim() || undefined,
    });
  }, [prodotti, codiceScan.primary, codiceScan.secondary]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCodiceScan({
        primary: newDraft.codiceFornitoreOriginale,
        secondary: newDraft.codiceFornitoreOriginaleSecondario,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [newDraft.codiceFornitoreOriginale, newDraft.codiceFornitoreOriginaleSecondario]);

  const performClose = useCallback(() => {
    if (draftId) purgeMagazzinoLogEntriesForRicambioId(draftId);
    setDraftId(null);
    reset(emptyRicambioForm());
    setListFieldInvalid(false);
    setDiscardConfirmOpen(false);
    onClose();
  }, [draftId, onClose, reset]);

  const beforeBack = useCallback(async () => {
    if (saveBusy) return false;
    if (discardConfirmOpen) {
      setDiscardConfirmOpen(false);
      return false;
    }
    if (needsCloseConfirm) {
      setDiscardConfirmOpen(true);
      return false;
    }
    return true;
  }, [discardConfirmOpen, needsCloseConfirm, saveBusy]);

  const requestClose = useCallback(() => {
    if (saveBusy) return;
    if (discardConfirmOpen) {
      setDiscardConfirmOpen(false);
      return;
    }
    if (needsCloseConfirm) {
      setDiscardConfirmOpen(true);
      return;
    }
    performClose();
  }, [discardConfirmOpen, needsCloseConfirm, performClose, saveBusy]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;

    if (ricambioFormHasNoUserInput(newDraft, baselineForm)) {
      onSaveError(RICAMBIO_SAVE_EMPTY_FORM_MESSAGE);
      return;
    }

    await runSubmit(e.currentTarget, async (currentDraft) => {
      const listErr = validateRicambioListFields(currentDraft, {
        marche,
        categorie,
        fornitori,
        produttori,
        mezziListe: compatExpand.mezziListe,
      });
      if (listErr) {
        setListFieldInvalid(true);
        onSaveError(listErr);
        return;
      }
      setListFieldInvalid(false);
      setSaveBusy(true);
      try {
        const submitToken = gateBeginSubmit("ricambio");
        const reconciledDraft = gateFormSubmit("ricambio", currentDraft, submitToken);

        const r = ricambioFromFormLenient(reconciledDraft, draftId ?? undefined, authorName, compatExpand);
        const incompleteWarnings = ricambioFormImportantWarnings(reconciledDraft);
        if (incompleteWarnings.length > 0) {
          incrementHealthCounter("ricambioSaveIncompleteFields");
        }
        const placeholderFlags = ricambioLenientPlaceholderFlags(r);
        if (placeholderFlags.marcaPlaceholder) incrementHealthCounter("ricambioSavePlaceholderMarca");
        if (placeholderFlags.descrizionePlaceholder) {
          incrementHealthCounter("ricambioSavePlaceholderDescrizione");
        }
        if (placeholderFlags.categoriaPlaceholder) {
          incrementHealthCounter("ricambioSavePlaceholderCategoria");
        }
        const created = await magazzinoEntry.create(ricambioUiToMagazzinoInsert(r, mezziListePrefs));
        if (!created.success || !created.data) {
          onSaveError(created.error ?? "Creazione ricambio non riuscita.");
          return;
        }
        const ui = ricambioUiFromMagazzinoRow(created.data, authorName, mergedMezziListe);
        setDraftId(null);
        reset(emptyRicambioForm());
        onSaved(ui);
      } finally {
        setSaveBusy(false);
      }
    });
  }

  return (
    <>
      <GestionaleModalShell
        modalSize="formMedium"
        beforeBack={beforeBack}
        onRequestClose={requestClose}
      title="Nuovo ricambio"
      titleId="new-ricambio-title"
      footer={
        <LoadingButton
          type="submit"
          form={RICAMBIO_NEW_FORM_ID}
          loading={saveBusy}
          preset="salva"
          loadingLabel="Salvataggio…"
          className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
        >
          Salva in magazzino
        </LoadingButton>
      }
    >
      <RicambioFormOptionsProvider>
        <form
          {...formProps}
          id={RICAMBIO_NEW_FORM_ID}
          data-form-ux-id="ricambio"
          onSubmit={handleSubmit}
          className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
        >
          <GestionaleModalScrollBody className={ricambioModalFormScrollClass}>
            <RicambioFormFields
              form={newDraft}
              setForm={setNewForm}
              formResetKey={draftId ?? "new"}
              formMode="create"
              relaxHtmlValidation
              codiceOriginaleAvvisoDuplicato={
                codiceDupEsistente
                  ? {
                      existing: codiceDupEsistente,
                      onVaiAlRicambio: () => onVaiAlRicambioDuplicato(codiceDupEsistente.id),
                    }
                  : null
              }
              listFieldForceInvalid={listFieldInvalid}
            />
            {draftId ? (
              <RicambioCollapsibleSection title="Foto" defaultCollapsed>
                <RecordImageManager
                  scope="magazzino"
                  recordId={draftId}
                  canEdit={magCanCreateRicambio}
                  auditLog={false}
                  hubCardLayout
                />
              </RicambioCollapsibleSection>
            ) : null}
          </GestionaleModalScrollBody>
        </form>
      </RicambioFormOptionsProvider>
    </GestionaleModalShell>
      <GestionaleConfirmDialog
        open={discardConfirmOpen}
        title="Modifiche non salvate"
        message="Hai inserito dati non salvati. Vuoi uscire senza salvare?"
        cancelLabel="Continua a modificare"
        confirmLabel="Esci senza salvare"
        destructive
        layerClassName={cabModalZConfirm}
        onCancel={() => setDiscardConfirmOpen(false)}
        onConfirm={performClose}
      />
    </>
  );
}
