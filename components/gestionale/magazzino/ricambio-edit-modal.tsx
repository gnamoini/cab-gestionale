"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { LoadingButton, Tooltip } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useFormEngine } from "@/lib/forms/form-engine";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import {
  ricambioFormIsDirty,
  ricambioFromFormLenient,
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
import { ricambioUiToMagazzinoUpdate } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import {
  clearOverlayBackResync,
  ensureOverlayBackResync,
  type OverlayCloseContext,
} from "@/lib/ui/overlay-back-stack";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

const RICAMBIO_EDIT_FORM_ID = "ricambio-edit-form";

function MagazzinoDisabledButtonTooltip({
  content,
  disabled,
  children,
}: {
  content: string;
  disabled?: boolean;
  children: ReactElement;
}) {
  return (
    <Tooltip content={content}>
      {disabled ? <span className="inline-flex w-full min-w-0">{children}</span> : children}
    </Tooltip>
  );
}

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
}) {
  const baselineForm = useMemo(() => toFormDraft(ricambio, mezziListePrefs), [ricambio, mezziListePrefs]);
  const formEngine = useFormEngine<RicambioFormState>({
    initial: baselineForm,
  });
  const { value: editDraft, setValue, reset, runSubmit, formProps } = formEngine;
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [pendingExit, setPendingExit] = useState<"close" | "cancel" | null>(null);
  const backResyncCleanupRef = useRef<(() => void) | null>(null);
  const isDirty = useMemo(() => ricambioFormIsDirty(editDraft, baselineForm), [editDraft, baselineForm]);

  useEffect(() => {
    reset(baselineForm);
    setListFieldInvalid(false);
    setDiscardConfirmOpen(false);
    setPendingExit(null);
  }, [ricambioId, reset, baselineForm]);

  useBeforeUnloadWhenDirty(isDirty, "Hai modifiche non salvate nel ricambio.");

  useEffect(() => () => clearOverlayBackResync(backResyncCleanupRef), []);

  const setEditForm = useCallback(
    (action: React.SetStateAction<RicambioFormState>) => {
      setValue(action);
    },
    [setValue],
  );

  const performExit = useCallback(
    (kind: "close" | "cancel") => {
      clearOverlayBackResync(backResyncCleanupRef);
      setDiscardConfirmOpen(false);
      setPendingExit(null);
      reset(baselineForm);
      setListFieldInvalid(false);
      if (kind === "close") onClose();
      else onCancel();
    },
    [baselineForm, onCancel, onClose, reset],
  );

  const requestExit = useCallback(
    (kind: "close" | "cancel", ctx?: OverlayCloseContext) => {
      if (saveBusy) return;
      if (discardConfirmOpen) {
        setDiscardConfirmOpen(false);
        setPendingExit(null);
        return;
      }
      if (isDirty) {
        setPendingExit(kind);
        setDiscardConfirmOpen(true);
        if (ctx?.fromPopstate) {
          ensureOverlayBackResync(
            backResyncCleanupRef,
            (nextCtx) => requestExit("close", nextCtx),
            "RicambioEditModal-back-resync",
          );
        }
        return;
      }
      performExit(kind);
    },
    [discardConfirmOpen, isDirty, performExit, saveBusy],
  );

  const handleRequestClose = useCallback(
    (ctx?: OverlayCloseContext) => {
      requestExit("close", ctx);
    },
    [requestExit],
  );

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;

    await runSubmit(e.currentTarget, async (currentDraft) => {
      const listErr = validateRicambioListFields(currentDraft, {
        marche,
        categorie,
        fornitori,
        produttori,
        mezziListe: mezziListePrefs,
      });
      if (listErr) {
        setListFieldInvalid(true);
        onSaveError(listErr);
        return;
      }
      setListFieldInvalid(false);
      const next = ricambioFromFormLenient(currentDraft, ricambioId, authorName, {
        mezziListe: mezziListePrefs,
      });
      setSaveBusy(true);
      try {
        const updated = await magazzinoEntry.update(
          ricambioId,
          ricambioUiToMagazzinoUpdate(next, mezziListePrefs),
        );
        if (!updated.success || !updated.data) {
          onSaveError(updated.error ?? "Salvataggio non riuscito.");
          return;
        }
        const ui = ricambioUiFromMagazzinoRow(updated.data, authorName, mezziListePrefs);
        reset(toFormDraft(ui, mezziListePrefs));
        onSaved(ui, "Modifiche salvate.");
      } finally {
        setSaveBusy(false);
      }
    });
  }

  return (
    <>
      <GestionaleModalShell
        modalSize="formMedium"
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
            <MagazzinoDisabledButtonTooltip
              content={magCanDeleteRicambio ? "Elimina ricambio" : READONLY_PERMISSION_HINT}
              disabled={!magCanDeleteRicambio}
            >
              <button
                type="button"
                onClick={onRequestDelete}
                disabled={!magCanDeleteRicambio}
                className={`${dsBtnDanger} min-h-11 w-full justify-center sm:w-auto`}
              >
                Elimina ricambio
              </button>
            </MagazzinoDisabledButtonTooltip>
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
          <GestionaleModalScrollBody className="space-y-4">
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
