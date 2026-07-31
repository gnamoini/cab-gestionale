"use client";

import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
  gestionaleModalFooterActionsStackMobileWrapClass,
} from "@/components/design-system";
import {
  SchedaIngressoFormBody,
  SchedaIngressoFormModalShell,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useLavorazioneCreateSubmit } from "@/src/hooks/use-lavorazione-create-submit";

export { SchedaIngressoEditModal } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";

export function LavorazioneCreateModal({
  open,
  onClose,
  defaultMezzoId,
  initialFields,
  createdBy,
  onCreated,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  sharedGlobalOpts,
  sharedMezziCatalog,
}: {
  open: boolean;
  onClose: () => void;
  defaultMezzoId?: string | null;
  initialFields?: SchedaIngressoFields | null;
  createdBy: string | null;
  onCreated?: (id: string) => void;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
}) {
  const create = useLavorazioneCreateSubmit({
    enabled: open,
    createdBy,
    defaultMezzoId,
    initialFields,
    mezzi,
    schedeStore,
    attive,
    storico,
    sharedGlobalOpts,
    sharedMezziCatalog,
    onCreated,
    onClose,
  });

  if (!open) return null;

  return (
    <>
      <SchedaIngressoFormModalShell
        open={open}
        onRequestClose={create.requestClose}
        variant="create-lavorazione"
        footer={
          <div className={gestionaleModalFooterActionsStackMobileWrapClass}>
            {create.schedaSyncError ? (
              <GestionaleModalFooterCancelButton
                className="w-full sm:w-auto"
                disabled={create.pending}
                onClick={() => create.setPartialCloseConfirmOpen(true)}
              >
                Chiudi comunque
              </GestionaleModalFooterCancelButton>
            ) : null}
            <GestionaleModalFooterSaveButton
              type="submit"
              form="lavorazione-create-form"
              className="w-full sm:ml-auto sm:w-auto sm:min-w-[10rem]"
              loading={create.pending}
              loadingLabel="Salvataggio…"
              disabled={!createdBy || create.stati.length === 0 || create.globalOpts.isLoading}
            >
              Salva lavorazione
            </GestionaleModalFooterSaveButton>
          </div>
        }
      >
        <form
          ref={create.formRef}
          id="lavorazione-create-form"
          {...create.formProps}
          onSubmit={create.onSubmit}
          className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
        >
          {create.schedaSyncError ? (
            <div
              role="alert"
              className="sticky top-0 z-10 shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {create.schedaSyncError}
            </div>
          ) : null}
          <SchedaIngressoFormBody
            variant="create-lavorazione"
            fields={create.fields}
            setFields={create.setFields}
            onPatch={create.patch}
            pending={create.pending}
            mezzi={mezzi}
            schedeStore={schedeStore}
            attive={attive}
            storico={storico}
            stato={create.stato}
            onStatoChange={create.setStato}
            priorita={create.priorita}
            onPrioritaChange={create.setPriorita}
            mezzoHint={create.mezzoHint}
            errorMessage={create.inlineError}
            mezzoPrompt={create.mezzoPrompt}
            mezzoLinked={Boolean(create.mezzoId.trim()) || create.mezzoPrompt.linkState.status === "linked"}
            mezzoPrefilledFromCatalog={create.mezzoPrefilledFromCatalog}
            mezzoId={create.mezzoId || create.mezzoPrompt.preferredMezzoId || ""}
            sharedGlobalOpts={create.globalOpts}
            sharedMezziCatalog={create.mezziCatalog}
            lavorazioneNote={create.lavorazioneNote}
            onLavorazioneNoteChange={create.setLavorazioneNote}
            tagliandoFields={create.tagliandoFields}
            onTagliandoFieldsChange={(patch) =>
              create.setTagliandoFields((prev) => ({ ...prev, ...patch }))
            }
          />
        </form>
      </SchedaIngressoFormModalShell>

      <GestionaleConfirmDialog
        open={create.partialCloseConfirmOpen}
        title="Chiudi senza sincronizzare la scheda?"
        message="La lavorazione è già stata creata. Potrai completare la scheda di ingresso dal dettaglio lavorazione."
        confirmLabel="Chiudi"
        onCancel={() => create.setPartialCloseConfirmOpen(false)}
        onConfirm={() => {
          create.setPartialCloseConfirmOpen(false);
          create.partialSuccessRef.current = false;
          create.createdLavorazioneIdRef.current = null;
          onClose();
        }}
      />

      <GestionaleUnsavedChangesDialog
        open={create.unsavedExitOpen}
        placement="stacked"
        message="Hai modifiche non salvate. Vuoi uscire senza salvare?"
        pending={create.pending}
        onStay={() => create.setUnsavedExitOpen(false)}
        onDiscard={() => {
          create.setUnsavedExitOpen(false);
          onClose();
        }}
        onSaveAndExit={() => {
          create.formRef.current?.requestSubmit();
        }}
      />
      {create.unknownSettingsDialog}
      {create.saveGateDialog}
    </>
  );
}
