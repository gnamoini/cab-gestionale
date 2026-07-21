"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { LoadingButton } from "@/components/design-system";
import { DisabledElementTooltip } from "@/components/ui";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useFormEngine } from "@/lib/forms/form-engine";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import { RicambioCollapsibleSection, ricambioModalFormScrollClass } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import {
  ricambioFormIsDirty,
  ricambioFormImportantWarnings,
  ricambioFromFormLenient,
  ricambioLenientPlaceholderFlags,
  toFormDraft,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import { ricambioUiToMagazzinoUpdate } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { stockAdjustFetch } from "@/lib/magazzino/stock-adjust-client";
import { getStockEntity, mergeStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import { useQueryClient } from "@tanstack/react-query";
import { buildRicambioCompatExpandOptions } from "@/lib/magazzino/resolve-mezzi-liste-for-compat";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

const RICAMBIO_EDIT_FORM_ID = "ricambio-edit-form";

export function RicambioEditModal({
  ricambioId,
  ricambio,
  mezziListePrefs,
  marche,
  categorie,
  fornitori,
  produttori,
  authorName,
  magCanCreateRicambio,
  magCanDeleteRicambio,
  onClose,
  onCancel,
  onRequestDelete,
  onSaved,
  onSaveError,
  onImageEvent,
  modalitaModifica = false,
}: {
  ricambioId: string;
  ricambio: RicambioMagazzino;
  mezziListePrefs: MezziListePrefs;
  marche: string[];
  categorie: string[];
  fornitori: string[];
  produttori: string[];
  authorName: string;
  magCanCreateRicambio: boolean;
  magCanDeleteRicambio: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRequestDelete: () => void;
  onSaved: (ui: RicambioMagazzino, message: string) => void;
  onSaveError: (message: string) => void;
  onImageEvent?: (event: RecordImageLogEvent) => void;
  /** Se true, variazioni scorta contano nelle statistiche. */
  modalitaModifica?: boolean;
}) {
  const queryClient = useQueryClient();
  const { mezziListe: mergedMezziListe } = useGlobalOptions({ debugTag: "RicambioEditModal" });
  const compatExpand = useMemo(
    () => buildRicambioCompatExpandOptions({ mezziListe: mergedMezziListe }),
    [mergedMezziListe],
  );
  const baselineForm = useMemo(() => toFormDraft(ricambio, mezziListePrefs), [ricambio, mezziListePrefs]);
  const formEngine = useFormEngine<RicambioFormState>({
    initial: baselineForm,
  });
  const { value: editDraft, setValue, reset, runSubmit, formProps } = formEngine;
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [pendingExit, setPendingExit] = useState<"close" | "cancel" | null>(null);
  const isDirty = useMemo(() => ricambioFormIsDirty(editDraft, baselineForm), [editDraft, baselineForm]);

  useEffect(() => {
    reset(baselineForm);
    setListFieldInvalid(false);
    setDiscardConfirmOpen(false);
    setPendingExit(null);
  }, [ricambioId, reset, baselineForm]);

  useBeforeUnloadWhenDirty(isDirty, "Hai modifiche non salvate nel ricambio.");

  const setEditForm = useCallback(
    (action: React.SetStateAction<RicambioFormState>) => {
      setValue(action);
    },
    [setValue],
  );

  const performExit = useCallback(
    (kind: "close" | "cancel") => {
      setDiscardConfirmOpen(false);
      setPendingExit(null);
      reset(baselineForm);
      setListFieldInvalid(false);
      if (kind === "close") onClose();
      else onCancel();
    },
    [baselineForm, onCancel, onClose, reset],
  );

  const beforeBack = useCallback(async () => {
    if (saveBusy) return false;
    if (discardConfirmOpen) {
      setDiscardConfirmOpen(false);
      setPendingExit(null);
      return false;
    }
    if (isDirty) {
      setPendingExit("close");
      setDiscardConfirmOpen(true);
      return false;
    }
    return true;
  }, [discardConfirmOpen, isDirty, saveBusy]);

  const requestExit = useCallback(
    (kind: "close" | "cancel") => {
      if (saveBusy) return;
      if (discardConfirmOpen) {
        setDiscardConfirmOpen(false);
        setPendingExit(null);
        return;
      }
      if (isDirty) {
        setPendingExit(kind);
        setDiscardConfirmOpen(true);
        return;
      }
      performExit(kind);
    },
    [discardConfirmOpen, isDirty, performExit, saveBusy],
  );

  const handleRequestClose = useCallback(() => {
    requestExit("close");
  }, [requestExit]);

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;

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
      const next = ricambioFromFormLenient(currentDraft, ricambioId, authorName, compatExpand);
      const incompleteWarnings = ricambioFormImportantWarnings(currentDraft);
      if (incompleteWarnings.length > 0) incrementHealthCounter("ricambioSaveIncompleteFields");
      const placeholderFlags = ricambioLenientPlaceholderFlags(next);
      if (placeholderFlags.marcaPlaceholder) incrementHealthCounter("ricambioSavePlaceholderMarca");
      if (placeholderFlags.descrizionePlaceholder) incrementHealthCounter("ricambioSavePlaceholderDescrizione");
      if (placeholderFlags.categoriaPlaceholder) incrementHealthCounter("ricambioSavePlaceholderCategoria");
      const scortaPrima = Math.round(ricambio.scorta);
      const scortaDelta = Math.round(next.scorta) - scortaPrima;
      setSaveBusy(true);
      try {
        if (scortaDelta !== 0) {
          const entity = getStockEntity(queryClient, ricambioId);
          const expectedVersion = entity?.stockVersion ?? 0;
          const operationId = crypto.randomUUID();
          const stats = modalitaModifica;
          const moved = await stockAdjustFetch({
            ricambioId,
            delta: scortaDelta,
            expectedVersion,
            operationId,
            contaStatistiche: stats,
            origine: stats ? "manual_adjustment" : "inventario",
            causale: stats
              ? scortaDelta > 0
                ? "carico_manuale"
                : "scarico_manuale"
              : "rettifica_inventario",
          });
          if (!moved.ok) {
            onSaveError(moved.error ?? "Aggiornamento scorta non riuscito.");
            return;
          }
          mergeStockEntity(
            queryClient,
            {
              ricambioId,
              quantita: moved.data.quantita,
              stockVersion: moved.data.stockVersion,
              lastOperationId: moved.data.operationId,
            },
            "mutation",
            { operationId: moved.data.operationId, receivedVersion: moved.data.stockVersion },
          );
          next.scorta = moved.data.quantita;
        }
        const patch = ricambioUiToMagazzinoUpdate(next, mezziListePrefs);
        const { quantita: _omitQuantita, ...patchWithoutQuantita } = patch;
        const updated = await magazzinoEntry.update(ricambioId, patchWithoutQuantita);
        if (!updated.success || !updated.data) {
          onSaveError(updated.error ?? "Salvataggio non riuscito.");
          return;
        }
        const ui = ricambioUiFromMagazzinoRow(updated.data, authorName, mezziListePrefs);
        reset(toFormDraft(ui, mezziListePrefs));
        const lenientHint =
          placeholderFlags.marcaPlaceholder ||
          placeholderFlags.descrizionePlaceholder ||
          placeholderFlags.categoriaPlaceholder
            ? " Salvato con campi segnaposto — completa l'anagrafica quando possibile."
            : "";
        onSaved(ui, `Modifiche salvate.${lenientHint}`);
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
        onRequestClose={handleRequestClose}
      title="Modifica ricambio"
      titleId="detail-ricambio-title"
      footer={
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
          <div className="contents sm:flex sm:order-2 sm:items-center sm:gap-2">
            <LoadingButton
              type="submit"
              form={RICAMBIO_EDIT_FORM_ID}
              loading={saveBusy}
              preset="salva"
              loadingLabel="Salvataggio…"
              className={`${erpBtnAccent} col-span-2 min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 sm:order-2 sm:col-auto sm:min-w-[6.5rem] sm:flex-none`}
            >
              Salva
            </LoadingButton>
            <button
              type="button"
              onClick={() => requestExit("cancel")}
              className={`${dsBtnNeutral} min-h-11 w-full justify-center sm:order-1 sm:min-w-[6.5rem] sm:flex-none`}
            >
              Annulla
            </button>
          </div>
          <div className="min-w-0 sm:order-1">
            <DisabledElementTooltip content={READONLY_PERMISSION_HINT} disabled={!magCanDeleteRicambio}>
              <button
                type="button"
                onClick={onRequestDelete}
                disabled={!magCanDeleteRicambio}
                className={`${dsBtnDanger} min-h-11 w-full justify-center sm:w-auto`}
              >
                Elimina ricambio
              </button>
            </DisabledElementTooltip>
          </div>
        </div>
      }
    >
      <RicambioFormOptionsProvider>
        <form
          {...formProps}
          id={RICAMBIO_EDIT_FORM_ID}
          onSubmit={saveEdit}
          className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
        >
          <GestionaleModalScrollBody className={ricambioModalFormScrollClass}>
            <RicambioFormFields
              form={editDraft}
              setForm={setEditForm}
              formResetKey={ricambioId}
              formMode="edit"
              listFieldForceInvalid={listFieldInvalid}
              relaxHtmlValidation
            />
            <RicambioCollapsibleSection title="Foto" defaultCollapsed>
              <RecordImageManager
                scope="magazzino"
                recordId={ricambioId}
                canEdit={magCanCreateRicambio}
                hubCardLayout
                onImageEvent={onImageEvent}
              />
            </RicambioCollapsibleSection>
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
        onCancel={() => {
          setDiscardConfirmOpen(false);
          setPendingExit(null);
        }}
        onConfirm={() => performExit(pendingExit ?? "close")}
      />
    </>
  );
}
